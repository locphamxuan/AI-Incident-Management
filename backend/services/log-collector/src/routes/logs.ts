import { Router } from "express";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { KafkaClient, Logger, RawLogEvent } from "@ai-incident/shared";

const logPayloadSchema = z.object({
  service: z.string().min(1),
  level: z.enum(["debug", "info", "warn", "error"]),
  message: z.string().min(1),
  timestamp: z.string().datetime().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export function createLogsRouter(kafka: KafkaClient, logger: Logger): Router {
  const router = Router();

  router.post("/logs", async (req, res) => {
    const parsed = logPayloadSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_payload", details: parsed.error.flatten() });
      return;
    }

    const event: RawLogEvent = {
      eventId: randomUUID(),
      service: parsed.data.service,
      level: parsed.data.level,
      message: parsed.data.message,
      timestamp: parsed.data.timestamp ?? new Date().toISOString(),
      metadata: parsed.data.metadata,
    };

    try {
      await kafka.publish("logs.raw", event.service, event);
      res.status(202).json({ eventId: event.eventId });
    } catch (error) {
      logger.error({ err: error }, "failed to publish log event to kafka");
      res.status(503).json({ error: "ingest_unavailable" });
    }
  });

  return router;
}
