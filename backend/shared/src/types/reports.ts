export interface ReportTrendPoint {
  /** Day bucket, YYYY-MM-DD (UTC). */
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
  /** Mean time to resolution across resolved incidents in the dataset, or null if none are resolved yet. */
  mttrSeconds: number | null;
  trend: ReportTrendPoint[];
}
