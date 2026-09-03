# Build context is the repo root (see infra/docker-compose.yml) so the
# @ai-incident/shared workspace package is in scope.
FROM node:20-alpine
WORKDIR /app

COPY package.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY services/log-collector/package.json services/log-collector/package.json
RUN npm install

COPY packages/shared packages/shared
COPY services/log-collector services/log-collector

WORKDIR /app/services/log-collector
EXPOSE 4001
CMD ["npx", "tsx", "src/index.ts"]
