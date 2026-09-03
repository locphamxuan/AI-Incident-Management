# Build context is the repo root (see infra/docker-compose.yml) so the
# @ai-incident/shared workspace package is in scope.
FROM node:20-alpine
WORKDIR /app

COPY package.json ./
COPY backend/shared/package.json backend/shared/package.json
COPY backend/services/incident-service/package.json backend/services/incident-service/package.json
RUN npm install

COPY backend/shared backend/shared
COPY backend/services/incident-service backend/services/incident-service

WORKDIR /app/backend/services/incident-service
EXPOSE 4002 4003
CMD ["npx", "tsx", "src/index.ts"]
