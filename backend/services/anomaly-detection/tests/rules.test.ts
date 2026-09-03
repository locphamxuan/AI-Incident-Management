import { describe, expect, it, vi } from "vitest";
import type { ProcessedLogEvent, SlidingWindowCounter } from "@ai-incident/shared";
import { cpuSpikeRule } from "../src/rules/cpuSpike.js";
import { redisTimeoutRule } from "../src/rules/redisTimeout.js";
import { pgPoolExhaustionRule } from "../src/rules/pgPoolExhaustion.js";
import { createHttpErrorRateRule } from "../src/rules/httpErrorRate.js";

function makeEvent(overrides: Partial<ProcessedLogEvent> = {}): ProcessedLogEvent {
  return {
    eventId: "e1",
    service: "checkout-api",
    level: "info",
    message: "request completed",
    timestamp: "2026-09-03T12:41:00.000Z",
    normalizedAt: "2026-09-03T12:41:00.100Z",
    ...overrides,
  };
}

describe("cpuSpikeRule", () => {
  it("fires when cpuPercent is above the threshold", () => {
    const signal = cpuSpikeRule.evaluate(makeEvent({ metadata: { cpuPercent: 95 } }));
    expect(signal?.type).toBe("cpu_spike");
  });

  it("does not fire below the threshold", () => {
    expect(cpuSpikeRule.evaluate(makeEvent({ metadata: { cpuPercent: 40 } }))).toBeNull();
  });
});

describe("redisTimeoutRule", () => {
  it("fires on an error log mentioning redis + timeout", () => {
    const signal = redisTimeoutRule.evaluate(
      makeEvent({ level: "error", message: "Redis connection timeout after 5000ms" }),
    );
    expect(signal?.type).toBe("redis_timeout");
  });

  it("does not fire on an unrelated error", () => {
    expect(
      redisTimeoutRule.evaluate(makeEvent({ level: "error", message: "disk full" })),
    ).toBeNull();
  });
});

describe("pgPoolExhaustionRule", () => {
  it("fires when pool utilization breaches the threshold", () => {
    const signal = pgPoolExhaustionRule.evaluate(
      makeEvent({ metadata: { poolUtilization: 1.0 } }),
    );
    expect(signal?.type).toBe("pg_pool_exhausted");
  });

  it("fires on a message pattern even without metadata", () => {
    const signal = pgPoolExhaustionRule.evaluate(
      makeEvent({ message: "connection pool exhausted, too many clients" }),
    );
    expect(signal?.type).toBe("pg_pool_exhausted");
  });

  it("does not fire on a healthy pool", () => {
    expect(
      pgPoolExhaustionRule.evaluate(makeEvent({ metadata: { poolUtilization: 0.3 } })),
    ).toBeNull();
  });
});

describe("httpErrorRateRule", () => {
  it("fires once the 5xx rate crosses the threshold with enough samples", async () => {
    const counter = {
      recordRequest: vi.fn(),
      getErrorRate: vi.fn().mockResolvedValue({ rate: 0.5, total: 20 }),
    } as unknown as SlidingWindowCounter;

    const rule = createHttpErrorRateRule(counter);
    const signal = await rule.evaluate(makeEvent({ metadata: { statusCode: 500 } }));

    expect(signal?.type).toBe("http_5xx_spike");
    expect(counter.recordRequest).toHaveBeenCalledWith("checkout-api", true);
  });

  it("does not fire below the minimum sample size", async () => {
    const counter = {
      recordRequest: vi.fn(),
      getErrorRate: vi.fn().mockResolvedValue({ rate: 0.9, total: 3 }),
    } as unknown as SlidingWindowCounter;

    const rule = createHttpErrorRateRule(counter);
    const signal = await rule.evaluate(makeEvent({ metadata: { statusCode: 503 } }));
    expect(signal).toBeNull();
  });

  it("ignores non-error responses", async () => {
    const counter = {
      recordRequest: vi.fn(),
      getErrorRate: vi.fn(),
    } as unknown as SlidingWindowCounter;

    const rule = createHttpErrorRateRule(counter);
    const signal = await rule.evaluate(makeEvent({ metadata: { statusCode: 200 } }));
    expect(signal).toBeNull();
    expect(counter.getErrorRate).not.toHaveBeenCalled();
  });
});
