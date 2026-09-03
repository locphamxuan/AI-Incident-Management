# Build context is the repo root (see infra/docker-compose.yml) so the
# @ai-incident/shared workspace package is in scope.
FROM node:20-alpine
WORKDIR /app

COPY package.json ./
COPY backend/shared/package.json backend/shared/package.json
COPY backend/services/log-processor/package.json backend/services/log-processor/package.json
RUN npm install

COPY backend/shared backend/shared
COPY backend/services/log-processor backend/services/log-processor

WORKDIR /app/backend/services/log-processor
CMD ["npx", "tsx", "src/index.ts"]
