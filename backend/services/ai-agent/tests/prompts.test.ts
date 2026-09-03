import { describe, expect, it } from "vitest";
import { buildRootCausePrompt } from "../src/llm/prompts.js";

describe("buildRootCausePrompt", () => {
  it("includes the service, chronological timeline, and runbook content", () => {
    const prompt = buildRootCausePrompt(
      "checkout-api",
      [
        { type: "redis_timeout", at: "2026-09-03T12:41:00Z", payload: {} },
        { type: "pg_pool_exhausted", at: "2026-09-03T12:44:00Z", payload: { poolUtilization: 1 } },
      ],
      [{ id: "r1", title: "Redis outage runbook", content: "Check failover status first." }],
    );

    expect(prompt).toContain("checkout-api");
    expect(prompt.indexOf("redis_timeout")).toBeLessThan(prompt.indexOf("pg_pool_exhausted"));
    expect(prompt).toContain("Redis outage runbook");
    expect(prompt).toContain("Check failover status first.");
  });

  it("notes when there are no matching runbooks", () => {
    const prompt = buildRootCausePrompt("checkout-api", [], []);
    expect(prompt).toContain("no matching runbooks found");
  });
});
