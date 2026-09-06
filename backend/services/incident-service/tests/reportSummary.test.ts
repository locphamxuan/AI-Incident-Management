import type pg from "pg";
import { describe, expect, it, vi } from "vitest";
import { IncidentRepository } from "../src/db.js";

function makePool(responses: unknown[][]): pg.Pool {
  const query = vi.fn();
  for (const rows of responses) query.mockResolvedValueOnce({ rows });
  return { query } as unknown as pg.Pool;
}

describe("IncidentRepository.getReportSummary", () => {
  it("aggregates totals, severity, per-service and MTTR, and merges the opened/resolved trend by day", async () => {
    const pool = makePool([
      [
        { status: "open", count: 2 },
        { status: "resolved", count: 3 },
      ],
      [
        { severity: "high", count: 4 },
        { severity: "low", count: 1 },
      ],
      [{ service: "checkout-api", total: 4, open: 1 }],
      [{ mttr_seconds: 125.5 }],
      [{ bucket: new Date("2026-09-01T00:00:00Z"), count: 2 }],
      [
        { bucket: new Date("2026-09-01T00:00:00Z"), count: 1 },
        { bucket: new Date("2026-09-02T00:00:00Z"), count: 1 },
      ],
    ]);
    const repository = new IncidentRepository(pool);

    const summary = await repository.getReportSummary(30);

    expect(summary.rangeDays).toBe(30);
    expect(summary.totals).toEqual({ total: 5, open: 2, investigating: 0, resolved: 3 });
    expect(summary.bySeverity).toEqual({ high: 4, low: 1 });
    expect(summary.byService).toEqual([{ service: "checkout-api", total: 4, open: 1 }]);
    expect(summary.mttrSeconds).toBe(125.5);
    expect(summary.trend).toEqual([
      { date: "2026-09-01", opened: 2, resolved: 1 },
      { date: "2026-09-02", opened: 0, resolved: 1 },
    ]);
  });

  it("returns null MTTR when no incidents have resolved yet", async () => {
    const pool = makePool([[], [], [], [{ mttr_seconds: null }], [], []]);
    const repository = new IncidentRepository(pool);

    const summary = await repository.getReportSummary(7);

    expect(summary.mttrSeconds).toBeNull();
    expect(summary.trend).toEqual([]);
  });
});
