import { describe, expect, it, vi } from "vitest";
import type Anthropic from "@anthropic-ai/sdk";
import type { AnalysisRepository } from "../src/db.js";
import type { RunbookRetriever } from "../src/rag/retriever.js";
import { RootCauseAgent } from "../src/llm/rootCauseAgent.js";

function makeAgent(overrides: {
  narrative?: string;
  runbooks?: { id: string; title: string; content: string }[];
  saveRootCauseAnalysis?: ReturnType<typeof vi.fn>;
}) {
  const anthropic = {
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: "text", text: overrides.narrative ?? "Possible root cause:\n\nRedis went down." }],
      }),
    },
  } as unknown as Anthropic;

  const repository = {
    getIncidentTimeline: vi.fn().mockResolvedValue([
      { type: "redis_timeout", at: "2026-09-03T12:41:00Z", payload: {} },
    ]),
    saveRootCauseAnalysis: overrides.saveRootCauseAnalysis ?? vi.fn().mockResolvedValue(undefined),
  } as unknown as AnalysisRepository;

  const retriever = {
    retrieveRelevant: vi.fn().mockResolvedValue(overrides.runbooks ?? []),
  } as unknown as RunbookRetriever;

  return { agent: new RootCauseAgent(anthropic, "claude-sonnet-5", repository, retriever), anthropic, repository, retriever };
}

describe("RootCauseAgent", () => {
  it("builds a narrative from the timeline and retrieved runbooks, then persists it", async () => {
    const { agent, repository } = makeAgent({
      runbooks: [{ id: "r1", title: "Redis outage", content: "..." }],
    });

    const result = await agent.analyze({
      jobId: "j1",
      incidentId: "inc-1",
      service: "checkout-api",
      signals: [],
    });

    expect(result.incidentId).toBe("inc-1");
    expect(result.narrative).toContain("Redis went down");
    expect(result.citedRunbookIds).toEqual(["r1"]);
    expect(repository.saveRootCauseAnalysis).toHaveBeenCalledWith(result);
  });

  it("throws if Claude returns no text content", async () => {
    const anthropic = {
      messages: { create: vi.fn().mockResolvedValue({ content: [] }) },
    } as unknown as Anthropic;
    const repository = {
      getIncidentTimeline: vi.fn().mockResolvedValue([]),
      saveRootCauseAnalysis: vi.fn(),
    } as unknown as AnalysisRepository;
    const retriever = { retrieveRelevant: vi.fn().mockResolvedValue([]) } as unknown as RunbookRetriever;

    const agent = new RootCauseAgent(anthropic, "claude-sonnet-5", repository, retriever);
    await expect(
      agent.analyze({ jobId: "j1", incidentId: "inc-1", service: "checkout-api", signals: [] }),
    ).rejects.toThrow();
  });
});
