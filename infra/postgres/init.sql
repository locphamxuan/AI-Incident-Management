-- Extensions
CREATE EXTENSION IF NOT EXISTS timescaledb;
CREATE EXTENSION IF NOT EXISTS vector;

-- Raw ingested log lines
CREATE TABLE IF NOT EXISTS raw_logs (
    time        TIMESTAMPTZ      NOT NULL,
    service     TEXT             NOT NULL,
    level       TEXT             NOT NULL,
    message     TEXT             NOT NULL,
    metadata    JSONB            NOT NULL DEFAULT '{}',
    event_id    UUID             NOT NULL
);
SELECT create_hypertable('raw_logs', 'time', if_not_exists => TRUE);
CREATE INDEX IF NOT EXISTS raw_logs_service_time_idx ON raw_logs (service, time DESC);
-- TimescaleDB requires the partitioning column ("time") in any unique index
-- on a hypertable, so the dedup key is the pair, not event_id alone.
CREATE UNIQUE INDEX IF NOT EXISTS raw_logs_event_id_idx ON raw_logs (event_id, time);

-- Numeric metric samples (cpu, latency, error rate, pool utilization, ...)
CREATE TABLE IF NOT EXISTS metrics (
    time        TIMESTAMPTZ      NOT NULL,
    service     TEXT             NOT NULL,
    metric      TEXT             NOT NULL,
    value       DOUBLE PRECISION NOT NULL,
    tags        JSONB            NOT NULL DEFAULT '{}'
);
SELECT create_hypertable('metrics', 'time', if_not_exists => TRUE);
CREATE INDEX IF NOT EXISTS metrics_service_metric_time_idx ON metrics (service, metric, time DESC);

-- Incidents raised by anomaly detection
CREATE TABLE IF NOT EXISTS incidents (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service     TEXT             NOT NULL,
    severity    TEXT             NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    status      TEXT             NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved')),
    summary     TEXT             NOT NULL,
    opened_at   TIMESTAMPTZ      NOT NULL DEFAULT now(),
    resolved_at TIMESTAMPTZ
);

-- Ordered timeline of signals attached to an incident
CREATE TABLE IF NOT EXISTS incident_events (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID             NOT NULL REFERENCES incidents (id) ON DELETE CASCADE,
    type        TEXT             NOT NULL, -- e.g. cpu_spike, http_5xx_spike, redis_timeout, pg_pool_exhausted
    at          TIMESTAMPTZ      NOT NULL,
    payload     JSONB            NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS incident_events_incident_id_idx ON incident_events (incident_id, at);

-- AI-generated root cause narratives
CREATE TABLE IF NOT EXISTS root_cause_analyses (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID             NOT NULL REFERENCES incidents (id) ON DELETE CASCADE,
    narrative   TEXT             NOT NULL,
    cited_runbook_ids UUID[]     NOT NULL DEFAULT '{}',
    model       TEXT             NOT NULL,
    created_at  TIMESTAMPTZ      NOT NULL DEFAULT now()
);

-- RAG corpus: runbooks / past postmortems
CREATE TABLE IF NOT EXISTS runbooks (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title       TEXT             NOT NULL,
    content     TEXT             NOT NULL,
    embedding   VECTOR(1536),
    created_at  TIMESTAMPTZ      NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS runbooks_embedding_idx ON runbooks
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
