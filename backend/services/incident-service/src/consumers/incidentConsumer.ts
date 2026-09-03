import { randomUUID } from "node:crypto";
import type { AnomalySignal, IncidentAnalysisJob, KafkaClient, Logger } from "@ai-incident/shared";
import type { IncidentRepository } from "../db.js";
import type { RealtimeGateway } from "../websocket.js";
import { severityForSignal, summaryForSignal } from "../severity.js";

export function startIncidentConsumer(
  kafka: KafkaClient,
  repository: IncidentRepository,
  gateway: RealtimeGateway,
  logger: Logger,
): Promise<void> {
  return kafka.consume<AnomalySignal>({
    topic: "incidents.detected",
    groupId: "incident-service",
    handler: async (signal) => {
      const existing = await repository.findOpenIncidentForService(signal.service);
      const incidentId = existing
        ? existing.id
        : (await repository.createIncident(signal.service, severityForSignal(signal.type), summaryForSignal(signal))).id;

      await repository.addEvent(incidentId, signal);
      await gateway.publish({ type: "incident.updated", incidentId, signal });

      const job: IncidentAnalysisJob = {
        jobId: randomUUID(),
        incidentId,
        service: signal.service,
        signals: [signal],
      };
      await kafka.publish("incident.analysis.jobs", incidentId, job);

      logger.info({ incidentId, signalType: signal.type }, "incident updated, analysis job queued");
    },
  });
}
