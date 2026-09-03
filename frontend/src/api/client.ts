export interface Incident {
  id: string;
  service: string;
  severity: "low" | "medium" | "high" | "critical";
  status: "open" | "investigating" | "resolved";
  summary: string;
  opened_at: string;
  resolved_at: string | null;
}

export interface IncidentEvent {
  type: string;
  at: string;
  payload: Record<string, unknown>;
}

export interface RootCauseAnalysisRecord {
  narrative: string;
  cited_runbook_ids: string[];
  model: string;
  created_at: string;
}

export interface IncidentDetail {
  incident: Incident;
  events: IncidentEvent[];
  analyses: RootCauseAnalysisRecord[];
}

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4002";

export async function fetchIncidents(): Promise<Incident[]> {
  const res = await fetch(`${API_URL}/incidents`);
  if (!res.ok) throw new Error(`failed to fetch incidents: ${res.status}`);
  return res.json();
}

export async function fetchIncidentDetail(id: string): Promise<IncidentDetail> {
  const res = await fetch(`${API_URL}/incidents/${id}`);
  if (!res.ok) throw new Error(`failed to fetch incident ${id}: ${res.status}`);
  return res.json();
}
