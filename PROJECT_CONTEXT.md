# Project Context

Living log of what this project is, what's been built, and what's next.
Updated at the end of every completed task — see [`CLAUDE.md`](CLAUDE.md) §1.

## What this project is

An AI-assisted incident management platform that demonstrates an end-to-end,
event-driven observability pipeline: application logs flow through a
collector, Kafka, a processor, and an anomaly-detection stage, which raises
incidents that an AI agent (RAG + Claude) explains with a plain-English root
cause narrative. See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the
full pipeline diagram and design rationale.

Showcases: Kafka, Redis, event-driven architecture, WebSocket, time-series
data (TimescaleDB), observability, AI/RAG, distributed systems, and fault
tolerance (retry, dead-letter queues, circuit breaker).

## Log

### 2026-09-03 — Initial bootstrap (frontend/backend pipeline, end to end)
- Created repo governance: `CLAUDE.md` (git/testing/quality rules) and this
  file.
- Authored `docs/ARCHITECTURE.md`: full pipeline design, tech-stack
  rationale, Redis roles, WebSocket fan-out via Redis pub/sub, TimescaleDB +
  pgvector schema, and the fault-tolerance pattern (retry / DLQ / circuit
  breaker) each stage must follow.
- Scaffolded the full pipeline as a `frontend/` + `backend/` split:
  - `backend/shared` — retry-with-backoff, circuit breaker, Kafka client
    (auto DLQ on exhausted retries), Redis client + sliding-window rate
    counter, logger, shared event types.
  - `backend/services/log-collector` — HTTP ingest → Kafka `logs.raw`.
  - `backend/services/log-processor` — consumes `logs.raw`, normalizes,
    writes to the `raw_logs` TimescaleDB hypertable, republishes
    `logs.processed`.
  - `backend/services/anomaly-detection` — rule engine (CPU spike, HTTP
    5xx rate via the Redis sliding-window counter, Redis timeout, Postgres
    pool exhaustion) over `logs.processed`, emits `incidents.detected`.
  - `backend/services/incident-service` — correlates signals into one
    incident timeline per service, persists to Postgres, REST API, and a
    WebSocket gateway (Redis pub/sub fan-out) that pushes both incident
    updates and finished root-cause analyses to the dashboard live.
  - `backend/services/ai-agent` — consumes `incident.analysis.jobs`,
    retrieves relevant runbooks via pgvector cosine search (Voyage AI
    embeddings), asks Claude for the root-cause narrative (circuit-breaker
    + retry wrapped), publishes `incidents.analyzed`.
  - `frontend/` — React dashboard: incident list + timeline/root-cause
    view, live-updating over the WebSocket hook.
  - `infra/` — `docker-compose.yml` (Kafka, Redis, Postgres +
    Timescale/pgvector, all services), Postgres init SQL, Kafka topics doc.
- Added root tooling: TypeScript project references, ESLint + Prettier,
  Vitest, GitHub Actions CI (lint + test on push/PR).
- **Correction during the session:** the plan originally included RabbitMQ
  as a separate job queue for the AI agent and a generic `apps/services/
  packages` monorepo layout. Both were revised on explicit feedback:
  RabbitMQ was dropped (Kafka topic `incident.analysis.jobs`, keyed by
  `incidentId`, covers the same need without a second broker — see
  `docs/ARCHITECTURE.md` for the tradeoff), and the layout was changed to
  `frontend/` + `backend/`. `.gitignore` was also extended to exclude local
  AI-assistant tool state (`.claude/`, `.claude-mem/`) — project docs stay
  tracked.
- **Validated, not just written:** ran `npm install`, `npm test`,
  `npm run typecheck`, `npm run lint`, and `npm run build` for real across
  every workspace (not just eyeballed) and fixed what they caught — an
  ioredis default-import/type mismatch under `NodeNext` resolution (switch
  to the named `Redis` export) and a missing `"type": "module"` on the root
  `package.json`. 38 tests pass, 0 lint/typecheck errors, frontend
  production bundle builds. `package-lock.json` is committed (required for
  `npm ci` in CI).
- **Status:** the full pipeline (collector → Kafka → processor → anomaly
  detection → incident service → AI agent → dashboard) is structurally
  complete with unit tests at each stage. Not yet run against the live
  Docker Compose stack (Kafka/Redis/Postgres) in this session — only
  unit-level, with dependencies mocked.

### 2026-09-03 — Branch model: `dev` for development, `main` for deploy
- Per explicit request, switched the git workflow: `main` was reset back to
  the original initial commit (matches `origin/main` — nothing had been
  pushed yet), and all bootstrap work now lives on `dev`. `dev` is the
  integration branch going forward; `main` only receives a merge from `dev`
  at deploy time. Updated `CLAUDE.md` §1 and `.github/workflows/ci.yml`
  (now triggers on both `main` and `dev`) to match.
- Pushed both branches to `origin` (`locphamxuan/AI-Incident-Management`).

### 2026-09-06 — Reports dashboard (`frontend-reports/`) + `/reports/summary` endpoint
- **Decision (confirmed with the user):** the reporting dashboard is a
  separate, independently deployable FE app (`frontend-reports/`), not a
  route bolted onto the existing live `frontend/` dashboard — the two have
  different consumers/refresh models (push/WebSocket for on-call vs.
  pull/aggregate for trend review). The backing API lives on
  `incident-service` (not a new microservice) since it only needs a couple
  of aggregate queries against data `incident-service` already owns.
- Backend: `IncidentRepository.getReportSummary(days)`
  (`backend/services/incident-service/src/db.ts`) aggregates incident totals
  by status/severity/service, MTTR, and a daily opened-vs-resolved trend.
  System-design note (the "optimize what's necessary" ask): the trend query
  uses TimescaleDB's `time_bucket('1 day', ...)` and `GROUP BY`/`FILTER` in
  Postgres instead of pulling raw incident rows to the app and reducing in
  JS — cost stays proportional to distinct days/services/severities in
  range, not incident count. Exposed via `GET /reports/summary?days=<n>`
  (`src/routes/reports.ts`, clamped to 1–365 days), wired in `src/index.ts`.
  Added a `ReportSummary` type to `@ai-incident/shared`
  (`backend/shared/src/types/reports.ts`) for the shape.
- Frontend: `frontend-reports/` — same Vite+React+TS scaffold as
  `frontend/` (own `package.json`, `vite.config.ts` on port 5174,
  `Dockerfile`), with a range picker (7/30/90 days), summary cards, a
  severity/service breakdown, and a dependency-free inline-SVG trend chart
  (no charting library added). Registered in root `package.json`
  workspaces and as a `reports` service in `infra/docker-compose.yml`
  (port 5174, depends on `incident-service`). `.env.example` gained
  `VITE_INCIDENT_API_URL`.
- **Confirmed, not just assumed:** PostgreSQL (+ TimescaleDB/pgvector) was
  already the project's sole datastore (`docs/ARCHITECTURE.md`,
  `infra/postgres/init.sql`) — no migration was needed for the "database
  uses Postgres" requirement, only the new aggregate queries above.
- **Validated:** added repository-level tests for the aggregation/merge
  logic (`tests/reportSummary.test.ts`), route tests
  (`tests/reports.route.test.ts`), and component/integration tests for the
  new FE app (`frontend-reports/tests/*`, including a mocked-`fetch` test of
  the range picker re-fetching). Ran `npm test`, `npm run typecheck`, and
  `npm run lint` across all workspaces plus a production `vite build` of
  `frontend-reports` — all green.
- Docs updated: `docs/ARCHITECTURE.md` codebase layout + new "Reporting
  dashboard" section explaining the split-app decision and the
  `time_bucket` design choice.

### 2026-09-06 — First real `docker compose up` run: 3 bugs only a live stack could catch
- **Also decided:** `CLAUDE.md` §1 tightened — every task now branches from
  `dev` (no more direct-to-`dev` exception for small work), and a task's
  branch is pushed to `origin` automatically once it's green, without
  waiting for per-push confirmation; opening a PR or merging still requires
  an explicit ask.
- Brought the whole stack up for the first time via `docker compose -f
  infra/docker-compose.yml up --build` (previously only unit-tested with
  everything mocked). Found and fixed three bugs that mocked tests
  structurally couldn't catch, each on `fix/timescale-raw-logs-unique-index`:
  1. **Postgres never finished initializing.** `infra/postgres/init.sql`
     put a unique index on `raw_logs(event_id)` alone; TimescaleDB rejects
     any unique index on a hypertable that omits the partitioning column,
     so `init.sql` aborted mid-script and left the DB with only the
     `raw_logs` table. Fixed by widening the index (and `log-processor`'s
     `ON CONFLICT` target) to `(event_id, time)`.
  2. **`incident-service` and `anomaly-detection` crashed on startup.**
     `KafkaClient.consume()`'s initial `consumer.connect()` relied solely on
     kafkajs's own internal retrier (~5 attempts, a few seconds) — not
     enough patience for "the Kafka container just started and hasn't
     finished leader election," a routine race on `docker compose up`, not
     an outage. `log-processor`/`ai-agent` happened to win the race and
     survived; the other two didn't and crashed with
     `KafkaJSNumberOfRetriesExceeded`. Fixed by wrapping the startup
     connect/subscribe (and the producer's lazy connect) in the shared
     `withRetry` backoff, per `CLAUDE.md` §5.
  3. **Neither dashboard could actually read `incident-service`'s API in a
     browser.** No CORS middleware was configured; `curl` doesn't enforce
     CORS so route-level tests never caught it. Extracted the Express app
     assembly into `src/app.ts` (now unit-testable on its own) and added a
     `cors()` allowlist driven by `CORS_ORIGINS`, defaulting to both
     dashboards' dev ports.
- **Validated for real, not just unit-tested:** with all three fixes in,
  posted two log lines (`redis timeout`, `pg pool exhausted`) for the same
  service through `log-collector` → confirmed both signals correlated into
  one `incidents` row via `GET /incidents`, the row appeared correctly in
  `GET /reports/summary`, `raw_logs` persisted both lines, `ai-agent` hit
  Voyage/Claude with placeholder keys and correctly retried then routed to
  `incident.analysis.jobs.dlq` instead of crashing (expected — no API keys
  set), and both `frontend`/`frontend-reports` returned CORS headers for
  their own origins and none for an arbitrary one.
- Local-only, not committed: `.env` (real values for the Docker network's
  hostnames, e.g. `KAFKA_BROKERS=kafka:29092` instead of `localhost`) and
  `infra/docker-compose.override.yml` (remaps Redis's host port to 6380
  because another unrelated project on this machine already holds 6379 —
  now gitignored so it doesn't leak a machine-specific port into the repo).

## Next up
- Seed the `runbooks` table with example postmortems so the RAG retriever
  in `ai-agent` has something real to retrieve against (currently empty —
  confirmed by watching `ai-agent` actually run: Voyage/Claude calls fail
  fast on placeholder keys, but even with real keys there's nothing to
  retrieve yet).
- `ANTHROPIC_API_KEY` and `VOYAGE_API_KEY` are required in `.env` for
  `ai-agent` to actually call Claude / generate embeddings — neither is
  set yet.
- Add integration tests that exercise the log → incident → root-cause round
  trip against dockerized dependencies (testcontainers or similar) instead
  of only mocking Kafka/Postgres/Redis at the unit level — today's coverage
  is unit-level plus one manual `docker compose` pass, not an automated
  regression test for what that pass caught.
- Duplicate DLQ entries were observed for the same analysis job right after
  `ai-agent` started (a Kafka rebalance during startup redelivered an
  uncommitted message — normal at-least-once semantics, not a correctness
  bug since Postgres is only written to on success) — worth an idempotency
  check in `ai-agent`/DLQ consumers if duplicate DLQ noise becomes a problem
  in practice.
- The dashboards have only been checked for correct CORS headers and a 200
  response via `curl`, not opened in an actual browser yet.
