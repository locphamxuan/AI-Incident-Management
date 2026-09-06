import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import type { IncidentRepository } from "../src/db.js";
import { createReportsRouter } from "../src/routes/reports.js";

function buildApp(repository: IncidentRepository) {
  const app = express();
  app.use(createReportsRouter(repository));
  return app;
}

describe("reports routes", () => {
  it("GET /reports/summary defaults to a 30-day range", async () => {
    const getReportSummary = vi.fn().mockResolvedValue({ rangeDays: 30 });
    const repository = { getReportSummary } as unknown as IncidentRepository;

    const res = await request(buildApp(repository)).get("/reports/summary");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ rangeDays: 30 });
    expect(getReportSummary).toHaveBeenCalledWith(30);
  });

  it("GET /reports/summary?days=7 passes through a valid custom range", async () => {
    const getReportSummary = vi.fn().mockResolvedValue({ rangeDays: 7 });
    const repository = { getReportSummary } as unknown as IncidentRepository;

    await request(buildApp(repository)).get("/reports/summary?days=7");

    expect(getReportSummary).toHaveBeenCalledWith(7);
  });

  it("GET /reports/summary?days=-5 falls back to the default range for invalid input", async () => {
    const getReportSummary = vi.fn().mockResolvedValue({});
    const repository = { getReportSummary } as unknown as IncidentRepository;

    await request(buildApp(repository)).get("/reports/summary?days=-5");

    expect(getReportSummary).toHaveBeenCalledWith(30);
  });

  it("GET /reports/summary?days=9999 clamps to the maximum range", async () => {
    const getReportSummary = vi.fn().mockResolvedValue({});
    const repository = { getReportSummary } as unknown as IncidentRepository;

    await request(buildApp(repository)).get("/reports/summary?days=9999");

    expect(getReportSummary).toHaveBeenCalledWith(365);
  });
});
