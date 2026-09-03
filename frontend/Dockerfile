# Build context is the repo root (see infra/docker-compose.yml) so the
# @ai-incident/shared workspace package (used only for TS types) is in scope.
FROM node:20-alpine
WORKDIR /app

COPY package.json ./
COPY backend/shared/package.json backend/shared/package.json
COPY frontend/package.json frontend/package.json
RUN npm install

COPY backend/shared backend/shared
COPY frontend frontend

WORKDIR /app/frontend
EXPOSE 5173
CMD ["npx", "vite", "--host"]
