import { describe, expect, it } from "vitest";
import type { AnomalySignal } from "@ai-incident/shared";
import { severityForSignal, summaryForSignal } from "../src/severity.js";

function makeSignal(overrides: Partial<AnomalySignal> = {}): AnomalySignal {
  return {
    eventId: "e1",
    type: "redis_timeout",
    service: "checkout-api",
    at: "2026-09-03T12:41:00.000Z",
    payload: {},
    ...overrides,
  };
}

describe("severityForSignal", () => {
  it("ranks pg_pool_exhausted as critical", () => {
    expect(severityForSignal("pg_pool_exhausted")).toBe("critical");
  });

  it("ranks redis_timeout as high", () => {
    expect(severityForSignal("redis_timeout")).toBe("high");
  });

  it("ranks cpu_spike and http_5xx_spike as medium", () => {
    expect(severityForSignal("cpu_spike")).toBe("medium");
    expect(severityForSignal("http_5xx_spike")).toBe("medium");
  });
});

describe("summaryForSignal", () => {
  it("mentions the affected service", () => {
    const summary = summaryForSignal(makeSignal({ type: "pg_pool_exhausted", service: "checkout-api" }));
    expect(summary).toContain("checkout-api");
    expect(summary.toLowerCase()).toContain("pool");
  });
});
