export interface RawLogEvent {
  eventId: string;
  service: string;
  level: "debug" | "info" | "warn" | "error";
  message: string;
  timestamp: string; // ISO 8601
  metadata?: Record<string, unknown>;
}

export interface ProcessedLogEvent extends RawLogEvent {
  normalizedAt: string;
}

export type AnomalyType =
  | "cpu_spike"
  | "http_5xx_spike"
  | "redis_timeout"
  | "pg_pool_exhausted";

export interface AnomalySignal {
  eventId: string;
  type: AnomalyType;
  service: string;
  at: string; // ISO 8601
  payload: Record<string, unknown>;
}

export interface IncidentAnalysisJob {
  jobId: string;
  incidentId: string;
  service: string;
  signals: AnomalySignal[];
}

export interface RootCauseAnalysis {
  incidentId: string;
  narrative: string;
  citedRunbookIds: string[];
  model: string;
}
