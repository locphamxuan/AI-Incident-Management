# Architecture

## Pipeline

```mermaid
flowchart LR
    APP[Application] -->|logs| COLLECTOR[Log Collector\nHTTP ingest]
    COLLECTOR -->|logs.raw| KAFKA[(Kafka)]
    KAFKA --> PROCESSOR[Log Processor\nnormalize + persist]
    PROCESSOR -->|logs.processed| KAFKA
    PROCESSOR --> PG[(PostgreSQL +\nTimescaleDB)]
    KAFKA --> ANOMALY[Anomaly Detection\nrule engine]
    ANOMALY -->|incidents.detected| KAFKA
    KAFKA --> INCIDENT[Incident Service]
    INCIDENT --> PG
    INCIDENT -->|analysis job| RABBIT[(RabbitMQ)]
    RABBIT --> AGENT[AI Agent\nRAG + Claude]
    AGENT -->|root cause| PG
    AGENT --> INCIDENT
    INCIDENT -->|pub| REDIS[(Redis pub/sub)]
    REDIS --> WS[WebSocket Gateway]
    WS --> WEB[React Dashboard]
```

Each arrow between services is a queue (Kafka topic or RabbitMQ queue), not a
direct call — every stage can fail, restart, or scale independently without
taking the others down.

## Why each piece is there

| Component | Role | Why this and not a direct call |
|---|---|---|
| **Kafka** | `logs.raw`, `logs.processed`, `incidents.detected` | High-throughput, ordered, replayable log of everything the pipeline sees. Log volume is the workload Kafka is built for: partitioned by service/host, consumers scale horizontally, and a slow downstream stage (anomaly detection) never blocks ingestion. |
| **RabbitMQ** | `incident.analysis.jobs` queue (+ `incident.analysis.jobs.dlq`) | The AI agent's job is different from log streaming: one message = one unit of expensive, stateful work (an LLM call + RAG lookup), needs per-message ack, redelivery, and a dead-letter queue on repeated failure. Kafka *can* do this, but RabbitMQ's ack/nack/DLQ model is the natural fit and keeps the "firehose" (Kafka) and "job queue" (RabbitMQ) concerns separate. |
| **Redis** | (a) hot cache for anomaly-detection's sliding window counters, (b) pub/sub fan-out from incident-service to every WebSocket gateway instance, (c) shared circuit-breaker state | Sub-millisecond counters for rate-based rules (e.g. "how many 5xx in the last 60s") and pub/sub so a dashboard client can connect to *any* incident-service replica and still see updates raised by another replica. |
| **WebSocket** | incident-service → dashboard | Incidents and their evolving root-cause analysis are pushed, not polled — the dashboard should show "Redis became unavailable at 12:41" the moment the AI agent writes it. |
| **PostgreSQL + TimescaleDB** | `raw_logs`/`metrics` hypertables, `incidents`, `incident_events`, `root_cause_analyses` | One durable store for both time-series log/metric data (Timescale hypertables give continuous aggregates + retention policies on top of plain Postgres) and relational incident state, so an incident row can join straight against the metrics that triggered it. |
| **pgvector** (Postgres extension) | `runbooks` embeddings | RAG corpus lives next to the data it's reasoning about instead of a separate vector DB — one fewer moving part, and the retriever can join embeddings against structured incident history in a single query. |
| **Claude (Anthropic API)** | root-cause narrative generation | Takes the anomaly signals + retrieved runbook/past-incident context and produces the plain-English explanation (see example below). |

## Fault tolerance patterns

Every consumer/producer in this system uses the shared primitives in
[`packages/shared/src/resilience/`](../packages/shared/src/resilience):

- **Retry with backoff** (`retry.ts`) — exponential backoff + jitter, capped
  attempts, used around every Postgres write, Redis call, and outbound HTTP/
  LLM call. Transient failures (a Postgres pool blip, a Redis timeout) self-heal
  without operator intervention.
- **Circuit breaker** (`circuitBreaker.ts`) — wraps calls to Redis, Postgres,
  and the Claude API. After a failure threshold, the breaker opens and
  fails fast for a cooldown window instead of piling up retries against a
  dependency that's already down — this is exactly the "Redis became
  unavailable" scenario the AI agent is meant to diagnose, so the platform's
  own resilience code has to survive it, not just report on it.
- **Dead-letter queue** — a message that exhausts its retry budget (bad
  payload, poison message, permanently failing downstream) goes to
  `<topic>.dlq` (Kafka) or `incident.analysis.jobs.dlq` (RabbitMQ) instead of
  being dropped or blocking the partition/queue. DLQ contents are inspectable
  and replayable.
- **Idempotency** — every event carries a stable `eventId`; consumers upsert
  on that id so at-least-once delivery (Kafka/RabbitMQ's default) never
  double-creates an incident or double-counts a metric.

## Example: what the AI agent reads and writes

Anomaly-detection emits structured signals like:

```json
{ "type": "redis_timeout", "service": "checkout-api", "at": "2026-09-03T12:41:00Z" }
{ "type": "pg_pool_exhausted", "service": "checkout-api", "at": "2026-09-03T12:44:00Z", "poolUtilization": 1.0 }
{ "type": "http_5xx_spike", "service": "checkout-api", "at": "2026-09-03T12:42:30Z", "rate": 0.18 }
```

`services/ai-agent` retrieves similar past incidents/runbooks via pgvector,
builds a timeline from `incident_events`, and asks Claude to explain it. The
target output shape:

```
Possible root cause:

Redis became unavailable at 12:41.
This caused database fallback requests, increasing PostgreSQL connections by 380%.
The connection pool was exhausted at 12:44.
```

## Data model (summary)

- `raw_logs` (Timescale hypertable) — every ingested log line, partitioned by time.
- `metrics` (Timescale hypertable) — CPU/latency/error-rate/pool-utilization samples.
- `incidents` — id, status, severity, opened/resolved timestamps, summary.
- `incident_events` — ordered timeline of signals attached to an incident (FK to `incidents`).
- `root_cause_analyses` — the AI agent's narrative + the signals/runbooks it cited, FK to `incidents`.
- `runbooks` — postmortem/runbook text + `vector` embedding column (pgvector) for RAG retrieval.

Full DDL: [`infra/postgres/init.sql`](../infra/postgres/init.sql).

## Scaling & deployment notes

- Every service is a stateless Node.js process — horizontal scaling is
  "run more replicas"; state lives in Kafka/RabbitMQ/Postgres/Redis.
- Kafka topics are partitioned by `service` so per-service ordering is
  preserved while different services process in parallel.
- `incident-service` can run N replicas behind a load balancer; Redis
  pub/sub is what makes WebSocket fan-out work correctly across replicas.
- `infra/docker-compose.yml` runs the whole stack locally for development;
  see it for the concrete images/ports/env used by each service.
