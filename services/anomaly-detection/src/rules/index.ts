import type { AnomalySignal, ProcessedLogEvent } from "@ai-incident/shared";
import type { AnomalyRule } from "./types.js";

export { cpuSpikeRule } from "./cpuSpike.js";
export { redisTimeoutRule } from "./redisTimeout.js";
export { pgPoolExhaustionRule } from "./pgPoolExhaustion.js";
export { createHttpErrorRateRule } from "./httpErrorRate.js";
export type { AnomalyRule };

/** Runs every rule against an event and returns whichever signals fired. */
export async function evaluateRules(
  event: ProcessedLogEvent,
  rules: AnomalyRule[],
): Promise<AnomalySignal[]> {
  const results = await Promise.all(rules.map((rule) => rule.evaluate(event)));
  return results.filter((signal): signal is AnomalySignal => signal !== null);
}
