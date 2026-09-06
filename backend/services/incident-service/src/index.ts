import { createServer } from "node:http";
import express from "express";
import pg from "pg";
import { createLogger, createRedisClient, KafkaClient } from "@ai-incident/shared";
import { IncidentRepository } from "./db.js";
import { RealtimeGateway } from "./websocket.js";
import { startIncidentConsumer } from "./consumers/incidentConsumer.js";
import { startRootCauseConsumer } from "./consumers/rootCauseConsumer.js";
import { createIncidentsRouter } from "./routes/incidents.js";
import { createReportsRouter } from "./routes/reports.js";

const logger = createLogger("incident-service");
const port = Number(process.env.INCIDENT_SERVICE_PORT ?? 4002);
const brokers = (process.env.KAFKA_BROKERS ?? "localhost:9092").split(",");
const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const kafka = new KafkaClient({ clientId: "incident-service", brokers, logger });
const repository = new IncidentRepository(pool);

const app = express();
app.use(express.json());
app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.use(createIncidentsRouter(repository));
app.use(createReportsRouter(repository));

const httpServer = createServer(app);
const gateway = new RealtimeGateway(
  httpServer,
  createRedisClient(redisUrl),
  createRedisClient(redisUrl),
);

await startIncidentConsumer(kafka, repository, gateway, logger);
await startRootCauseConsumer(kafka, gateway);

httpServer.listen(port, () => logger.info({ port }, "incident-service listening (HTTP + WebSocket)"));
