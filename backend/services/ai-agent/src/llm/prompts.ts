import type { IncidentEventRow } from "../db.js";
import type { Runbook } from "../rag/retriever.js";

export const SYSTEM_PROMPT = `You are an SRE assistant that explains the likely root cause of an incident
from a timeline of anomaly signals. Be concise and concrete: name the
triggering event, the causal chain, and the specific timestamps involved.
Do not speculate beyond what the timeline and runbooks support. Format your
answer exactly as:

Possible root cause:

<2-4 short sentences, one causal step per sentence>`;

export function buildRootCausePrompt(
  service: string,
  timeline: IncidentEventRow[],
  runbooks: Runbook[],
): string {
  const timelineText = timeline
    .map((event) => `- [${event.at}] ${event.type}: ${JSON.stringify(event.payload)}`)
    .join("\n");

  const runbookText = runbooks.length
    ? runbooks
        .map((runbook) => `### ${runbook.title}\n${runbook.content}`)
        .join("\n\n")
    : "(no matching runbooks found)";

  return `Service: ${service}

Timeline of signals (chronological):
${timelineText}

Relevant runbooks / past incidents:
${runbookText}

Explain the likely root cause of this incident.`;
}
