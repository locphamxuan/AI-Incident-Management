import { createServer } from "node:http";
import pg from "pg";
import { createLogger, createRedisClient, KafkaClient } from "@ai-incident/shared";
import { createApp } from "./app.js";
import { IncidentRepository } from "./db.js";
import { RealtimeGateway } from "./websocket.js";
import { startIncidentConsumer } from "./consumers/incidentConsumer.js";
import { startRootCauseConsumer } from "./consumers/rootCauseConsumer.js";

const logger = createLogger("incident-service");
const port = Number(process.env.INCIDENT_SERVICE_PORT ?? 4002);
const brokers = (process.env.KAFKA_BROKERS ?? "localhost:9092").split(",");
const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";
const corsOrigins = (
  process.env.CORS_ORIGINS ?? "http://localhost:5173,http://localhost:5174"
).split(",");

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const kafka = new KafkaClient({ clientId: "incident-service", brokers, logger });
const repository = new IncidentRepository(pool);

const app = createApp(repository, corsOrigins);

const httpServer = createServer(app);
const gateway = new RealtimeGateway(
  httpServer,
  createRedisClient(redisUrl),
  createRedisClient(redisUrl),
);

await startIncidentConsumer(kafka, repository, gateway, logger);
await startRootCauseConsumer(kafka, gateway);

httpServer.listen(port, () => logger.info({ port }, "incident-service listening (HTTP + WebSocket)"));
