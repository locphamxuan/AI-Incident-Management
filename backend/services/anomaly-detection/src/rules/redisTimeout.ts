import type { AnomalyRule } from "./types.js";

const REDIS_TIMEOUT_PATTERN = /redis/i;
const TIMEOUT_PATTERN = /timeout|timed out|unavailable|connection refused/i;

export const redisTimeoutRule: AnomalyRule = {
  name: "redis_timeout",
  evaluate(event) {
    if (event.level !== "error" && event.level !== "warn") return null;
    if (!REDIS_TIMEOUT_PATTERN.test(event.message) || !TIMEOUT_PATTERN.test(event.message)) {
      return null;
    }

    return {
      eventId: event.eventId,
      type: "redis_timeout",
      service: event.service,
      at: event.timestamp,
      payload: { message: event.message },
    };
  },
};
