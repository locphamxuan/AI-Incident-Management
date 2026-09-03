import type { AnomalyRule } from "./types.js";

const CPU_THRESHOLD_PERCENT = 90;

/**
 * Fires when a log event carries a `cpuPercent` metadata field above the
 * threshold. In this pipeline, host/container metric samples are shipped
 * through the same log-collector → logs.processed path as regular log
 * lines, tagged with metric fields in `metadata`.
 */
export const cpuSpikeRule: AnomalyRule = {
  name: "cpu_spike",
  evaluate(event) {
    const cpuPercent = event.metadata?.cpuPercent;
    if (typeof cpuPercent !== "number" || cpuPercent < CPU_THRESHOLD_PERCENT) return null;

    return {
      eventId: event.eventId,
      type: "cpu_spike",
      service: event.service,
      at: event.timestamp,
      payload: { cpuPercent },
    };
  },
};
