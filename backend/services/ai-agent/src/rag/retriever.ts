import type pg from "pg";
import type { EmbeddingProvider } from "./embeddings.js";

export interface Runbook {
  id: string;
  title: string;
  content: string;
}

/**
 * Retrieves the runbooks/past-incident writeups most relevant to the
 * current anomaly signals via pgvector cosine-distance search, so the LLM
 * prompt is grounded in this organization's actual operational history
 * instead of generic knowledge.
 */
export class RunbookRetriever {
  constructor(
    private readonly pool: pg.Pool,
    private readonly embeddings: EmbeddingProvider,
  ) {}

  async retrieveRelevant(queryText: string, limit = 3): Promise<Runbook[]> {
    const embedding = await this.embeddings.embed(queryText);
    const { rows } = await this.pool.query<Runbook>(
      `SELECT id, title, content FROM runbooks
       ORDER BY embedding <=> $1::vector
       LIMIT $2`,
      [`[${embedding.join(",")}]`, limit],
    );
    return rows;
  }
}
