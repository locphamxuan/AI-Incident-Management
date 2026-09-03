import {
  createLogger,
  createRedisClient,
  KafkaClient,
  SlidingWindowCounter,
  type ProcessedLogEvent,
} from "@ai-incident/shared";
import {
  cpuSpikeRule,
  createHttpErrorRateRule,
  evaluateRules,
  pgPoolExhaustionRule,
  redisTimeoutRule,
} from "./rules/index.js";

const logger = createLogger("anomaly-detection");
const brokers = (process.env.KAFKA_BROKERS ?? "localhost:9092").split(",");
const redis = createRedisClient(process.env.REDIS_URL ?? "redis://localhost:6379");

const kafka = new KafkaClient({ clientId: "anomaly-detection", brokers, logger });
const errorRateCounter = new SlidingWindowCounter(redis);

const rules = [
  cpuSpikeRule,
  redisTimeoutRule,
  pgPoolExhaustionRule,
  createHttpErrorRateRule(errorRateCounter),
];

await kafka.consume<ProcessedLogEvent>({
  topic: "logs.processed",
  groupId: "anomaly-detection",
  handler: async (event) => {
    const signals = await evaluateRules(event, rules);
    for (const signal of signals) {
      logger.info({ signal }, "anomaly detected");
      await kafka.publish("incidents.detected", signal.service, signal);
    }
  },
});

logger.info("anomaly-detection consuming logs.processed");
