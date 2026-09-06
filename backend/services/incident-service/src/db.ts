import type pg from "pg";
import type { AnomalySignal, ReportSummary, RootCauseAnalysis } from "@ai-incident/shared";

export interface IncidentRow {
  id: string;
  service: string;
  severity: string;
  status: string;
  summary: string;
  opened_at: string;
  resolved_at: string | null;
}

export class IncidentRepository {
  constructor(private readonly pool: pg.Pool) {}

  /** Open incidents for a service are correlated into one timeline instead
   *  of spawning a new incident per signal (this is what lets "Redis timeout"
   *  and "pool exhausted" a few minutes apart show up as one story). */
  async findOpenIncidentForService(service: string): Promise<{ id: string } | null> {
    const { rows } = await this.pool.query<{ id: string }>(
      `SELECT id FROM incidents WHERE service = $1 AND status != 'resolved'
       ORDER BY opened_at DESC LIMIT 1`,
      [service],
    );
    return rows[0] ?? null;
  }

  async createIncident(service: string, severity: string, summary: string): Promise<{ id: string }> {
    const { rows } = await this.pool.query<{ id: string }>(
      `INSERT INTO incidents (service, severity, summary) VALUES ($1, $2, $3) RETURNING id`,
      [service, severity, summary],
    );
    return rows[0];
  }

  async addEvent(incidentId: string, signal: AnomalySignal): Promise<void> {
    await this.pool.query(
      `INSERT INTO incident_events (incident_id, type, at, payload) VALUES ($1, $2, $3, $4)`,
      [incidentId, signal.type, signal.at, JSON.stringify(signal.payload)],
    );
  }

  async listIncidents(): Promise<IncidentRow[]> {
    const { rows } = await this.pool.query<IncidentRow>(
      `SELECT * FROM incidents ORDER BY opened_at DESC LIMIT 100`,
    );
    return rows;
  }

  async getIncidentDetail(id: string) {
    const [{ rows: incidentRows }, { rows: eventRows }, { rows: analysisRows }] = await Promise.all([
      this.pool.query<IncidentRow>(`SELECT * FROM incidents WHERE id = $1`, [id]),
      this.pool.query(`SELECT * FROM incident_events WHERE incident_id = $1 ORDER BY at`, [id]),
      this.pool.query(
        `SELECT * FROM root_cause_analyses WHERE incident_id = $1 ORDER BY created_at DESC`,
        [id],
      ),
    ]);
    const incident = incidentRows[0];
    if (!incident) return null;
    return { incident, events: eventRows, analyses: analysisRows };
  }

  async attachRootCause(analysis: RootCauseAnalysis): Promise<void> {
    await this.pool.query(
      `INSERT INTO root_cause_analyses (incident_id, narrative, cited_runbook_ids, model)
       VALUES ($1, $2, $3, $4)`,
      [analysis.incidentId, analysis.narrative, analysis.citedRunbookIds, analysis.model],
    );
    await this.pool.query(
      `UPDATE incidents SET status = 'investigating' WHERE id = $1 AND status = 'open'`,
      [analysis.incidentId],
    );
  }

  /** Aggregated numbers for the reporting dashboard, computed in Postgres
   *  (grouped counts + Timescale `time_bucket` for the daily trend) instead
   *  of pulling raw incident rows to the app and aggregating in JS. */
  async getReportSummary(days: number): Promise<ReportSummary> {
    const [
      { rows: statusRows },
      { rows: severityRows },
      { rows: serviceRows },
      { rows: mttrRows },
      { rows: openedRows },
      { rows: resolvedRows },
    ] = await Promise.all([
      this.pool.query<{ status: "open" | "investigating" | "resolved"; count: number }>(
        `SELECT status, count(*)::int AS count FROM incidents GROUP BY status`,
      ),
      this.pool.query<{ severity: string; count: number }>(
        `SELECT severity, count(*)::int AS count FROM incidents GROUP BY severity`,
      ),
      this.pool.query<{ service: string; total: number; open: number }>(
        `SELECT service,
                count(*)::int AS total,
                count(*) FILTER (WHERE status != 'resolved')::int AS open
         FROM incidents GROUP BY service ORDER BY count(*) DESC LIMIT 20`,
      ),
      this.pool.query<{ mttr_seconds: number | null }>(
        `SELECT avg(extract(epoch FROM (resolved_at - opened_at)))::float8 AS mttr_seconds
         FROM incidents WHERE status = 'resolved' AND resolved_at IS NOT NULL`,
      ),
      this.pool.query<{ bucket: Date | string; count: number }>(
        `SELECT time_bucket('1 day', opened_at) AS bucket, count(*)::int AS count
         FROM incidents WHERE opened_at >= now() - ($1::text || ' days')::interval
         GROUP BY bucket ORDER BY bucket`,
        [days],
      ),
      this.pool.query<{ bucket: Date | string; count: number }>(
        `SELECT time_bucket('1 day', resolved_at) AS bucket, count(*)::int AS count
         FROM incidents WHERE resolved_at IS NOT NULL AND resolved_at >= now() - ($1::text || ' days')::interval
         GROUP BY bucket ORDER BY bucket`,
        [days],
      ),
    ]);

    const totals = { total: 0, open: 0, investigating: 0, resolved: 0 };
    for (const row of statusRows) {
      totals.total += row.count;
      totals[row.status] = row.count;
    }

    const bySeverity: Record<string, number> = {};
    for (const row of severityRows) bySeverity[row.severity] = row.count;

    const byService = serviceRows.map((row) => ({
      service: row.service,
      total: row.total,
      open: row.open,
    }));

    const mttrSeconds = mttrRows[0]?.mttr_seconds ?? null;

    const dateKey = (value: Date | string): string =>
      (value instanceof Date ? value.toISOString() : value).slice(0, 10);

    const trendByDate = new Map<string, { opened: number; resolved: number }>();
    for (const row of openedRows) {
      const key = dateKey(row.bucket);
      trendByDate.set(key, { opened: row.count, resolved: trendByDate.get(key)?.resolved ?? 0 });
    }
    for (const row of resolvedRows) {
      const key = dateKey(row.bucket);
      trendByDate.set(key, { opened: trendByDate.get(key)?.opened ?? 0, resolved: row.count });
    }

    const trend = [...trendByDate.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, counts]) => ({ date, ...counts }));

    return { rangeDays: days, totals, bySeverity, byService, mttrSeconds, trend };
  }
}
