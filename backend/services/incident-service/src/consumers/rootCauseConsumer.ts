import type { KafkaClient, RootCauseAnalysis } from "@ai-incident/shared";
import type { RealtimeGateway } from "../websocket.js";

/** Pushes the AI agent's finished root-cause narrative straight to the
 *  dashboard as soon as it's published — no polling. */
export function startRootCauseConsumer(kafka: KafkaClient, gateway: RealtimeGateway): Promise<void> {
  return kafka.consume<RootCauseAnalysis>({
    topic: "incidents.analyzed",
    groupId: "incident-service",
    handler: async (analysis) => {
      await gateway.publish({ type: "incident.analyzed", ...analysis });
    },
  });
}
