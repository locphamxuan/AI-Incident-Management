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

## Next up
- Bring the stack up via `docker compose -f infra/docker-compose.yml up
  --build` and validate one full log → incident → root-cause round trip
  against real Kafka/Redis/Postgres.
- Seed the `runbooks` table with example postmortems so the RAG retriever
  in `ai-agent` has something real to retrieve against (currently empty).
- Add integration tests that exercise that same round trip against the
  dockerized dependencies (today's tests all mock Kafka/Postgres/Redis at
  the unit level).
- `ANTHROPIC_API_KEY` and `VOYAGE_API_KEY` are required in `.env` for
  `ai-agent` to actually call Claude / generate embeddings — neither is
  set yet.
