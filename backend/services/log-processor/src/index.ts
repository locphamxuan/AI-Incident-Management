import pg from "pg";
import { createLogger, KafkaClient, type RawLogEvent } from "@ai-incident/shared";
import { normalize } from "./normalize.js";
import { LogRepository } from "./db.js";

const logger = createLogger("log-processor");
const brokers = (process.env.KAFKA_BROKERS ?? "localhost:9092").split(",");

const kafka = new KafkaClient({ clientId: "log-processor", brokers, logger });
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const repository = new LogRepository(pool);

await kafka.consume<RawLogEvent>({
  topic: "logs.raw",
  groupId: "log-processor",
  handler: async (raw) => {
    const processed = normalize(raw);
    await repository.insertLog(processed);
    await kafka.publish("logs.processed", processed.service, processed);
  },
});

logger.info("log-processor consuming logs.raw");
