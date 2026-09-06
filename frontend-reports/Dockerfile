# Build context is the repo root (see infra/docker-compose.yml).
FROM node:20-alpine
WORKDIR /app

COPY package.json ./
COPY frontend-reports/package.json frontend-reports/package.json
RUN npm install

COPY frontend-reports frontend-reports

WORKDIR /app/frontend-reports
EXPOSE 5174
CMD ["npx", "vite", "--host"]
