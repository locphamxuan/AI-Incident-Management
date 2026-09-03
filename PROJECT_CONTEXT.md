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

### 2026-09-03 — Initial bootstrap
- Created repo governance: `CLAUDE.md` (git/testing/quality rules) and this
  file.
- Authored `docs/ARCHITECTURE.md`: full pipeline design, tech-stack
  rationale, Redis roles, WebSocket fan-out via Redis pub/sub, TimescaleDB +
  pgvector schema, and the fault-tolerance pattern (retry / DLQ / circuit
  breaker) each stage must follow.
- Scaffolded the codebase as a `frontend/` + `backend/` split (per explicit
  request, in place of an initial apps/services/packages layout):
  - `backend/shared` — resilience primitives (retry, circuit breaker),
    Kafka client wrapper, Redis sliding-window counter, logger, shared
    event types.
  - `backend/services/log-collector` — HTTP ingest → Kafka `logs.raw`.
  - `backend/services/log-processor` — consumes `logs.raw`, normalizes,
    writes to the `raw_logs` TimescaleDB hypertable, republishes
    `logs.processed`.
  - `backend/services/anomaly-detection` — rule engine (CPU spike, HTTP
    5xx rate via a Redis sliding-window counter, Redis timeout, Postgres
    pool exhaustion) over `logs.processed`, emits `incidents.detected`.
  - `backend/services/incident-service`, `backend/services/ai-agent` —
    directory scaffolding created; implementation still pending (see Next
    up).
  - `frontend/` — React dashboard, not yet implemented.
  - `infra/` — `docker-compose.yml` (Kafka, Redis, Postgres +
    Timescale/pgvector, all services), Postgres init SQL, Kafka topics doc.
- Added root tooling: TypeScript project references, ESLint + Prettier,
  Vitest, GitHub Actions CI (lint + test on push/PR).
- **Correction during the session:** the plan originally included RabbitMQ
  as a separate job queue for the AI agent and a generic `apps/services/
  packages` monorepo layout. Both were revised on explicit feedback: RabbitMQ
  was dropped (Kafka topic `incident.analysis.jobs`, keyed by `incidentId`,
  covers the same need without a second broker — see `docs/ARCHITECTURE.md`
  for the tradeoff), and the layout was changed to `frontend/` + `backend/`.
  `.gitignore` was also extended to exclude local AI-assistant tool state
  (`.claude/`, `.claude-mem/`) — project docs stay tracked.
- **Status:** `backend/shared`, `log-collector`, `log-processor`, and
  `anomaly-detection` are structurally complete with unit tests. Not yet
  installed/run end-to-end in this session.

## Next up
- Implement `backend/services/incident-service` (persistence, REST API,
  WebSocket gateway with Redis pub/sub fan-out, publishes
  `incident.analysis.jobs`) and `backend/services/ai-agent` (Kafka
  consumer, pgvector RAG retrieval, Claude call, writes
  `root_cause_analyses`).
- Implement `frontend/` (incident list + live timeline dashboard).
- `npm install` at the root and bring the stack up via
  `docker-compose up -d` to validate the pipeline end to end.
- Seed `runbooks` table with example postmortems so the RAG retriever has
  something to retrieve against.
- Add integration tests that exercise a full log → incident → root-cause
  round trip against the dockerized dependencies.
