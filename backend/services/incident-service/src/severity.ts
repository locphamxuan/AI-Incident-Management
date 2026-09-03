import type { AnomalySignal, AnomalyType } from "@ai-incident/shared";

const SEVERITY_BY_TYPE: Record<AnomalyType, "low" | "medium" | "high" | "critical"> = {
  pg_pool_exhausted: "critical",
  redis_timeout: "high",
  http_5xx_spike: "medium",
  cpu_spike: "medium",
};

export function severityForSignal(type: AnomalyType): "low" | "medium" | "high" | "critical" {
  return SEVERITY_BY_TYPE[type] ?? "low";
}

const SUMMARY_BY_TYPE: Record<AnomalyType, (signal: AnomalySignal) => string> = {
  pg_pool_exhausted: (s) => `PostgreSQL connection pool exhausted on ${s.service}`,
  redis_timeout: (s) => `Redis became unavailable for ${s.service}`,
  http_5xx_spike: (s) => `Elevated 5xx error rate on ${s.service}`,
  cpu_spike: (s) => `CPU spike on ${s.service}`,
};

export function summaryForSignal(signal: AnomalySignal): string {
  return SUMMARY_BY_TYPE[signal.type](signal);
}
