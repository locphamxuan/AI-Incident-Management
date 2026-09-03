import type { AnomalyRule } from "./types.js";

const POOL_UTILIZATION_THRESHOLD = 0.95;
const POOL_EXHAUSTED_PATTERN = /pool.*(exhaust|full|timeout)|too many (clients|connections)/i;

export const pgPoolExhaustionRule: AnomalyRule = {
  name: "pg_pool_exhausted",
  evaluate(event) {
    const poolUtilization = event.metadata?.poolUtilization;
    const utilizationBreached =
      typeof poolUtilization === "number" && poolUtilization >= POOL_UTILIZATION_THRESHOLD;
    const messageMatches = POOL_EXHAUSTED_PATTERN.test(event.message);

    if (!utilizationBreached && !messageMatches) return null;

    return {
      eventId: event.eventId,
      type: "pg_pool_exhausted",
      service: event.service,
      at: event.timestamp,
      payload: { poolUtilization: poolUtilization ?? null, message: event.message },
    };
  },
};
