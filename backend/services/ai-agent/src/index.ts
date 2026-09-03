import Anthropic from "@anthropic-ai/sdk";
import pg from "pg";
import { createLogger, KafkaClient, type IncidentAnalysisJob } from "@ai-incident/shared";
import { AnalysisRepository } from "./db.js";
import { VoyageEmbeddingProvider } from "./rag/embeddings.js";
import { RunbookRetriever } from "./rag/retriever.js";
import { RootCauseAgent } from "./llm/rootCauseAgent.js";

const logger = createLogger("ai-agent");
const brokers = (process.env.KAFKA_BROKERS ?? "localhost:9092").split(",");

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const kafka = new KafkaClient({ clientId: "ai-agent", brokers, logger });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const model = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5";

const repository = new AnalysisRepository(pool);
const embeddings = new VoyageEmbeddingProvider(process.env.VOYAGE_API_KEY ?? "");
const retriever = new RunbookRetriever(pool, embeddings);
const agent = new RootCauseAgent(anthropic, model, repository, retriever);

await kafka.consume<IncidentAnalysisJob>({
  topic: "incident.analysis.jobs",
  groupId: "ai-agent",
  handler: async (job) => {
    const analysis = await agent.analyze(job);
    await kafka.publish("incidents.analyzed", job.incidentId, analysis);
    logger.info({ incidentId: job.incidentId }, "root cause analysis published");
  },
});

logger.info("ai-agent consuming incident.analysis.jobs");
