import type { SlidingWindowCounter } from "@ai-incident/shared";
import type { AnomalyRule } from "./types.js";

const ERROR_RATE_THRESHOLD = 0.1; // 10% of requests
const MIN_SAMPLE_SIZE = 10; // don't fire on a handful of noisy requests

export function createHttpErrorRateRule(counter: SlidingWindowCounter): AnomalyRule {
  return {
    name: "http_5xx_spike",
    async evaluate(event) {
      const status = event.metadata?.statusCode;
      if (typeof status !== "number") return null;

      const isError = status >= 500;
      await counter.recordRequest(event.service, isError);
      if (!isError) return null;

      const { rate, total } = await counter.getErrorRate(event.service);
      if (total < MIN_SAMPLE_SIZE || rate < ERROR_RATE_THRESHOLD) return null;

      return {
        eventId: event.eventId,
        type: "http_5xx_spike",
        service: event.service,
        at: event.timestamp,
        payload: { rate, sampleSize: total },
      };
    },
  };
}
