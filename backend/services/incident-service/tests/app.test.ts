import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import type { IncidentRepository } from "../src/db.js";
import { createApp } from "../src/app.js";

describe("createApp", () => {
  it("exposes a health check", async () => {
    const app = createApp({} as IncidentRepository, []);

    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });

  it("allows a configured dashboard origin via CORS", async () => {
    const repository = { listIncidents: vi.fn().mockResolvedValue([]) } as unknown as IncidentRepository;
    const app = createApp(repository, ["http://localhost:5173", "http://localhost:5174"]);

    const res = await request(app).get("/incidents").set("Origin", "http://localhost:5174");

    expect(res.status).toBe(200);
    expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:5174");
  });

  it("does not reflect an origin outside the configured allowlist", async () => {
    const repository = { listIncidents: vi.fn().mockResolvedValue([]) } as unknown as IncidentRepository;
    const app = createApp(repository, ["http://localhost:5173"]);

    const res = await request(app).get("/incidents").set("Origin", "http://evil.example");

    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });
});
