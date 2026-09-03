import { withRetry } from "@ai-incident/shared";

export interface EmbeddingProvider {
  embed(text: string): Promise<number[]>;
}

/**
 * Voyage AI is Anthropic's recommended embeddings provider (Claude itself
 * has no embeddings endpoint). Swap this for any provider behind the same
 * interface without touching the retriever.
 */
export class VoyageEmbeddingProvider implements EmbeddingProvider {
  constructor(
    private readonly apiKey: string,
    private readonly model = "voyage-3",
  ) {}

  async embed(text: string): Promise<number[]> {
    return withRetry(async () => {
      const res = await fetch("https://api.voyageai.com/v1/embeddings", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ input: text, model: this.model }),
      });
      if (!res.ok) {
        throw new Error(`voyage embeddings request failed: ${res.status} ${res.statusText}`);
      }
      const body = (await res.json()) as { data: { embedding: number[] }[] };
      return body.data[0].embedding;
    });
  }
}
