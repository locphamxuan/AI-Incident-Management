import type Anthropic from "@anthropic-ai/sdk";
import { CircuitBreaker, withRetry, type IncidentAnalysisJob, type RootCauseAnalysis } from "@ai-incident/shared";
import type { AnalysisRepository } from "../db.js";
import type { RunbookRetriever } from "../rag/retriever.js";
import { buildRootCausePrompt, SYSTEM_PROMPT } from "./prompts.js";

export class RootCauseAgent {
  private readonly breaker = new CircuitBreaker("anthropic-api", { failureThreshold: 3 });

  constructor(
    private readonly anthropic: Anthropic,
    private readonly model: string,
    private readonly repository: AnalysisRepository,
    private readonly retriever: RunbookRetriever,
  ) {}

  async analyze(job: IncidentAnalysisJob): Promise<RootCauseAnalysis> {
    const timeline = await this.repository.getIncidentTimeline(job.incidentId);
    const query = timeline.map((event) => event.type).join(" ") || job.signals[0]?.type || job.service;
    const runbooks = await this.retriever.retrieveRelevant(query);
    const prompt = buildRootCausePrompt(job.service, timeline, runbooks);

    const narrative = await this.breaker.execute(() =>
      withRetry(async () => {
        const response = await this.anthropic.messages.create({
          model: this.model,
          max_tokens: 400,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: prompt }],
        });
        const block = response.content.find((c) => c.type === "text");
        if (!block || block.type !== "text") throw new Error("no text content in Claude response");
        return block.text.trim();
      }),
    );

    const analysis: RootCauseAnalysis = {
      incidentId: job.incidentId,
      narrative,
      citedRunbookIds: runbooks.map((r) => r.id),
      model: this.model,
    };

    await this.repository.saveRootCauseAnalysis(analysis);
    return analysis;
  }
}
