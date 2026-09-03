# Build context is the repo root (see infra/docker-compose.yml) so the
# @ai-incident/shared workspace package is in scope.
FROM node:20-alpine
WORKDIR /app

COPY package.json ./
COPY backend/shared/package.json backend/shared/package.json
COPY backend/services/ai-agent/package.json backend/services/ai-agent/package.json
RUN npm install

COPY backend/shared backend/shared
COPY backend/services/ai-agent backend/services/ai-agent

WORKDIR /app/backend/services/ai-agent
CMD ["npx", "tsx", "src/index.ts"]
