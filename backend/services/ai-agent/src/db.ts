import type pg from "pg";
import type { RootCauseAnalysis } from "@ai-incident/shared";

export interface IncidentEventRow {
  type: string;
  at: string;
  payload: Record<string, unknown>;
}

export class AnalysisRepository {
  constructor(private readonly pool: pg.Pool) {}

  async getIncidentTimeline(incidentId: string): Promise<IncidentEventRow[]> {
    const { rows } = await this.pool.query<IncidentEventRow>(
      `SELECT type, at, payload FROM incident_events WHERE incident_id = $1 ORDER BY at`,
      [incidentId],
    );
    return rows;
  }

  async saveRootCauseAnalysis(analysis: RootCauseAnalysis): Promise<void> {
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
