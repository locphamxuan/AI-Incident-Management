import express from "express";
import { createLogger, KafkaClient } from "@ai-incident/shared";
import { createLogsRouter } from "./routes/logs.js";

const logger = createLogger("log-collector");
const port = Number(process.env.LOG_COLLECTOR_PORT ?? 4001);
const brokers = (process.env.KAFKA_BROKERS ?? "localhost:9092").split(",");

const kafka = new KafkaClient({ clientId: "log-collector", brokers, logger });

const app = express();
app.use(express.json());
app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.use(createLogsRouter(kafka, logger));

app.listen(port, () => logger.info({ port }, "log-collector listening"));
