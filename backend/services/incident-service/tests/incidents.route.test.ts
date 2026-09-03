import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import type { IncidentRepository } from "../src/db.js";
import { createIncidentsRouter } from "../src/routes/incidents.js";

function buildApp(repository: IncidentRepository) {
  const app = express();
  app.use(createIncidentsRouter(repository));
  return app;
}

describe("incidents routes", () => {
  it("GET /incidents lists incidents", async () => {
    const repository = {
      listIncidents: vi.fn().mockResolvedValue([{ id: "1", service: "checkout-api" }]),
    } as unknown as IncidentRepository;

    const res = await request(buildApp(repository)).get("/incidents");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  it("GET /incidents/:id returns 404 when missing", async () => {
    const repository = {
      getIncidentDetail: vi.fn().mockResolvedValue(null),
    } as unknown as IncidentRepository;

    const res = await request(buildApp(repository)).get("/incidents/missing");
    expect(res.status).toBe(404);
  });

  it("GET /incidents/:id returns the incident detail", async () => {
    const detail = { incident: { id: "1" }, events: [], analyses: [] };
    const repository = {
      getIncidentDetail: vi.fn().mockResolvedValue(detail),
    } as unknown as IncidentRepository;

    const res = await request(buildApp(repository)).get("/incidents/1");
    expect(res.status).toBe(200);
    expect(res.body).toEqual(detail);
  });
});
