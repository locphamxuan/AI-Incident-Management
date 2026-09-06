export interface ReportTrendPoint {
  date: string;
  opened: number;
  resolved: number;
}

export interface ReportSummary {
  rangeDays: number;
  totals: {
    total: number;
    open: number;
    investigating: number;
    resolved: number;
  };
  bySeverity: Record<string, number>;
  byService: Array<{ service: string; total: number; open: number }>;
  mttrSeconds: number | null;
  trend: ReportTrendPoint[];
}

const API_URL = import.meta.env.VITE_INCIDENT_API_URL ?? "http://localhost:4002";

export async function fetchReportSummary(days: number): Promise<ReportSummary> {
  const res = await fetch(`${API_URL}/reports/summary?days=${days}`);
  if (!res.ok) throw new Error(`failed to fetch report summary: ${res.status}`);
  return res.json();
}
