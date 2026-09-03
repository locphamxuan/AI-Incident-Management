# AI Incident Management

An event-driven, AI-assisted incident management platform. Application logs
flow through Kafka into a normalization stage, an anomaly-detection rule
engine, and an incident service; an AI agent then retrieves relevant
runbooks (RAG over pgvector) and asks Claude to explain the likely root
cause — e.g. *"Redis became unavailable at 12:41, which caused a fallback
surge on PostgreSQL, exhausting the connection pool by 12:44."*

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full pipeline
diagram and design rationale, and [`CLAUDE.md`](CLAUDE.md) for this repo's
git/testing/quality conventions.

## Layout

```
frontend/          React dashboard (Vite + TS)
backend/
  shared/          common lib: resilience, Kafka + Redis clients, types
  services/        log-collector, log-processor, anomaly-detection,
                    incident-service, ai-agent
infra/             docker-compose.yml, Postgres init SQL, Kafka topics
docs/              architecture design
```

## Getting started

```bash
npm install
docker compose -f infra/docker-compose.yml up -d   # Kafka, Redis, Postgres/Timescale
cp .env.example .env                                 # fill in ANTHROPIC_API_KEY, VOYAGE_API_KEY
npm test                                              # unit tests, all workspaces
npm run typecheck
npm run lint
```

Run an individual service locally against the dockerized dependencies with
`npm run dev -w @ai-incident/<service-name>` (e.g.
`npm run dev -w @ai-incident/log-collector`), or bring up the whole stack
with `docker compose -f infra/docker-compose.yml up --build`.
