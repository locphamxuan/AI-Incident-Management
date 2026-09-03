import type { ProcessedLogEvent, RawLogEvent } from "@ai-incident/shared";

export class InvalidLogEventError extends Error {}

/**
 * Normalizes a raw log event into the shape persisted to `raw_logs` and
 * forwarded downstream. Throws InvalidLogEventError for a structurally
 * unusable event (missing service/message) so the caller can route it to
 * the DLQ instead of writing garbage rows.
 */
export function normalize(event: RawLogEvent): ProcessedLogEvent {
  if (!event.service?.trim()) {
    throw new InvalidLogEventError("missing service");
  }
  if (!event.message?.trim()) {
    throw new InvalidLogEventError("missing message");
  }

  return {
    ...event,
    service: event.service.trim(),
    message: event.message.trim(),
    normalizedAt: new Date().toISOString(),
  };
}
