# AI Incident Management — Project Rules

These rules apply to every contributor (human or AI) working in this repository.
They are binding: follow them without asking for re-confirmation each time —
that authorization is granted by this file existing.

## 1. Git workflow

- **`dev` is the integration branch; `main` is deploy-only.** All active
  development happens on `dev` (directly, or via short-lived branches cut
  from `dev` and merged back into it). `main` is only ever updated by
  merging `dev` → `main` at the moment of a deploy — never commit feature
  work, fixes, or docs straight to `main`.
- **Always branch per context.** Before starting any task, checkout a new
  branch from `dev` — no direct commits to `dev`, even for small same-session
  work:
  - `feature/<short-name>` — new capability
  - `fix/<short-name>` — bug fix
  - `chore/<short-name>` — tooling, config, docs, refactors with no behavior change
  - Merge back into `dev` when done.
- **Auto-commit and auto-push, but never auto-PR.** Once a task's commits are
  made on its branch and pass tests/lint (see below), push the branch to
  `origin` right away — this is pre-authorized and doesn't need to be
  confirmed each time. Do **not** open a pull request or merge the branch
  into `dev`/`main` without being explicitly asked — leave that step to the
  user.
- **Split commits by context.** One commit = one cohesive change. Don't bundle
  unrelated changes ("add retry util" and "fix websocket reconnect" are two
  commits, not one). Prefer several small, reviewable commits over one large one.
- **Commit messages: English only.**
  - Imperative mood, Conventional Commits prefix: `feat:`, `fix:`, `chore:`,
    `refactor:`, `test:`, `docs:`, `perf:`.
  - Plain text only. Do **not** add any AI tool name, logo, byline, or
    `Co-Authored-By` trailer to commits in this repository — this project's
    commit history stays tool-agnostic.
- **Tests gate the commit.** After finishing a feature or a fix, run the test
  suite for the affected workspace(s) before committing. Don't commit code
  with failing tests or skip tests to "come back later."
- **Update project context.** After finishing any task — a feature, a fix, an
  architecture change — update [`PROJECT_CONTEXT.md`](PROJECT_CONTEXT.md) with
  what changed, why, and what's next. A task isn't done until that file
  reflects it.

## 2. Tech stack & layout

- **`backend/`** — Node.js + TypeScript. `backend/shared` is the common
  library (resilience primitives, Kafka/Redis clients, shared types);
  `backend/services/*` are independently deployable pipeline stages
  (log-collector, log-processor, anomaly-detection, incident-service,
  ai-agent).
- **`frontend/`** — React + TypeScript (Vite) dashboard.
- **Primary datastore:** PostgreSQL (+ TimescaleDB extension for time-series
  metrics/logs, + pgvector for RAG embeddings)
- **Event backbone:** Apache Kafka — used for both the high-throughput
  log/event stream and the AI agent's analysis job queue (see
  `docs/ARCHITECTURE.md` for why a second broker isn't warranted here)
- **Cache / pub-sub:** Redis (hot-path caching, WebSocket fan-out across
  instances, circuit-breaker state)
- **Realtime:** WebSocket (incident-service → dashboard live updates)
- **AI:** Anthropic Claude API + RAG over a runbook/past-incident corpus
  (pgvector similarity search)

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full design and the
rationale behind each choice.

## 3. Code quality & testing

- Lint/format: ESLint + Prettier — `npm run lint` / `npm run format` at the
  repo root (runs across all workspaces).
- Tests: Vitest per workspace — `npm test -w <workspace>` for a single
  package/service, `npm test` at the root for everything.
- CI (`.github/workflows/ci.yml`) runs lint + tests on every push/PR; don't
  merge a branch that fails CI.
- Favor small, composable modules over large ones. No speculative
  abstractions — build what the current pipeline stage needs.

## 4. Working in this repo with Claude Code

- Use the `codebase-memory` MCP graph tools (`search_graph`, `trace_path`,
  `get_architecture`, `get_code_snippet`) to navigate the codebase instead of
  blind grepping. Re-run `index_repository` after structural changes.
- Use the `/code-review` skill before merging any non-trivial branch.
- Use the `/security-review` skill for anything touching auth, secrets,
  external input parsing, or the LLM prompt/tool boundary.
- Use the `run` skill / `docker-compose up` to actually exercise a change
  through the pipeline before calling it done — passing tests confirm
  correctness, not that the feature works end to end.

## 5. Resilience patterns (non-negotiable for any new consumer/producer)

Every new Kafka consumer or outbound call to Redis/Postgres/an external API
must use the shared primitives in `backend/shared/src/resilience/` (retry
with backoff, circuit breaker) and publish failed messages to the relevant
`<topic>.dlq` instead of dropping or infinite-looping them. See
`docs/ARCHITECTURE.md` §Fault Tolerance for the pattern each stage uses.
