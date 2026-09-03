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

Showcases: Kafka, RabbitMQ, Redis, event-driven architecture, WebSocket,
time-series data (TimescaleDB), observability, AI/RAG, distributed systems,
and fault tolerance (retry, dead-letter queues, circuit breaker).

## Log

### 2026-09-03 — Initial bootstrap
- Created repo governance: `CLAUDE.md` (git/testing/quality rules) and this
  file.
- Authored `docs/ARCHITECTURE.md`: full pipeline design, tech-stack
  rationale (Kafka vs RabbitMQ split, Redis roles, WebSocket fan-out via
  Redis pub/sub, TimescaleDB + pgvector schema), and the fault-tolerance
  pattern (retry / DLQ / circuit breaker) each stage must follow.
- Scaffolded the monorepo structure (npm workspaces):
  - `packages/shared` — resilience primitives (retry, circuit breaker),
    Kafka + RabbitMQ client wrappers, logger, shared event types.
  - `services/log-collector` — HTTP ingest → Kafka `logs.raw`.
  - `services/log-processor` — consumes `logs.raw`, normalizes, writes to
    the `raw_logs` TimescaleDB hypertable, republishes `logs.processed`.
  - `services/anomaly-detection` — rule engine (CPU spike, HTTP 5xx rate,
    Redis timeout, Postgres pool exhaustion) over `logs.processed`, emits
    `incidents.detected`.
  - `services/incident-service` — persists incidents, WebSocket gateway
    (Redis pub/sub fan-out), enqueues analysis jobs on RabbitMQ.
  - `services/ai-agent` — RabbitMQ consumer, RAG over runbooks/past
    incidents (pgvector), calls Claude to produce the root-cause narrative.
  - `apps/web` — React dashboard (incident list, live timeline via
    WebSocket).
  - `infra/` — `docker-compose.yml` (Kafka, RabbitMQ, Redis, Postgres +
    Timescale/pgvector), Postgres init SQL.
- Added root tooling: TypeScript project references, ESLint + Prettier,
  Vitest, GitHub Actions CI (lint + test on push/PR).
- **Status:** skeleton is structurally complete and each service has a
  minimal working implementation of its stage of the pipeline plus unit
  tests for the resilience primitives and the anomaly rules. Not yet
  installed/run end-to-end in this session.

## Next up
- `npm install` at the root and bring the stack up via
  `docker-compose up -d` to validate the pipeline end to end.
- Wire real Kafka/RabbitMQ topic + queue provisioning (currently assumed
  auto-created; consider an explicit topics/queues bootstrap script).
- Seed `runbooks` table with example postmortems so the RAG retriever in
  `services/ai-agent` has something to retrieve against.
- Add integration tests that exercise a full log → incident → root-cause
  round trip against the dockerized dependencies.
