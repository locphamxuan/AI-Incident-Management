# Build context is the repo root (see infra/docker-compose.yml) so the
# @ai-incident/shared workspace package is in scope.
FROM node:20-alpine
WORKDIR /app

COPY package.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY services/anomaly-detection/package.json services/anomaly-detection/package.json
RUN npm install

COPY packages/shared packages/shared
COPY services/anomaly-detection services/anomaly-detection

WORKDIR /app/services/anomaly-detection
CMD ["npx", "tsx", "src/index.ts"]
