# Kafka topics

| Topic | Producer | Consumer(s) | Key | Notes |
|---|---|---|---|---|
| `logs.raw` | log-collector | log-processor | `service` | Raw ingested log lines, one per HTTP request accepted. |
| `logs.raw.dlq` | log-processor | (manual replay) | `service` | Lines that failed normalization after retries. |
| `logs.processed` | log-processor | anomaly-detection | `service` | Normalized, structured log events. |
| `incidents.detected` | anomaly-detection | incident-service | `service` | Rule-engine hits (cpu_spike, http_5xx_spike, redis_timeout, pg_pool_exhausted, ...). |
| `incident.analysis.jobs` | incident-service | ai-agent | `incidentId` | One job per incident needing a root-cause narrative. Keyed by incident id so retries of the same incident land on the same partition. |
| `incident.analysis.jobs.dlq` | ai-agent | (manual replay) | `incidentId` | Jobs that failed after the retry budget (e.g. LLM API down). |

Partitioning by `service` (or `incidentId` for the analysis-job topic)
preserves per-key ordering while allowing different keys to be processed in
parallel across partitions. Every topic gets its `.dlq` sibling for free
from `backend/shared`'s `KafkaClient` — see
[`docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md) §Fault tolerance patterns.
