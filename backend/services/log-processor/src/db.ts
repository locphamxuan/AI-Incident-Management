import pg from "pg";
import type { ProcessedLogEvent } from "@ai-incident/shared";

export class LogRepository {
  constructor(private readonly pool: pg.Pool) {}

  async insertLog(event: ProcessedLogEvent): Promise<void> {
    await this.pool.query(
      `INSERT INTO raw_logs (time, service, level, message, metadata, event_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (event_id, time) DO NOTHING`,
      [
        event.timestamp,
        event.service,
        event.level,
        event.message,
        JSON.stringify(event.metadata ?? {}),
        event.eventId,
      ],
    );
  }
}
