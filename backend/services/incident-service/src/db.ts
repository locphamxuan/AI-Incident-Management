import type pg from "pg";
import type { AnomalySignal, RootCauseAnalysis } from "@ai-incident/shared";

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
}
