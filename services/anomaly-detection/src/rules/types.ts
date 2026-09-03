import type { AnomalySignal, ProcessedLogEvent } from "@ai-incident/shared";

export interface AnomalyRule {
  name: string;
  evaluate(event: ProcessedLogEvent): Promise<AnomalySignal | null> | AnomalySignal | null;
}
