# Kafka topics

| Topic | Producer | Consumer(s) | Key | Notes |
|---|---|---|---|---|
| `logs.raw` | log-collector | log-processor | `service` | Raw ingested log lines, one per HTTP request accepted. |
| `logs.raw.dlq` | log-processor | (manual replay) | `service` | Lines that failed normalization after retries. |
| `logs.processed` | log-processor | anomaly-detection | `service` | Normalized, structured log events. |
| `incidents.detected` | anomaly-detection | incident-service | `service` | Rule-engine hits (cpu_spike, http_5xx_spike, redis_timeout, pg_pool_exhausted, ...). |

Partitioning by `service` preserves per-service ordering while allowing
different services' events to be processed in parallel across partitions.

RabbitMQ queues (not Kafka — see [`docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md)):

| Queue | Producer | Consumer | Notes |
|---|---|---|---|
| `incident.analysis.jobs` | incident-service | ai-agent | One job per incident needing a root-cause narrative. |
| `incident.analysis.jobs.dlq` | ai-agent | (manual replay) | Jobs that failed after the retry budget (e.g. LLM API down). |
