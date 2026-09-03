import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import type { KafkaClient, Logger } from "@ai-incident/shared";
import { createLogsRouter } from "../src/routes/logs.js";

function buildApp(kafka: KafkaClient) {
  const app = express();
  app.use(express.json());
  const logger = { error: vi.fn() } as unknown as Logger;
  app.use(createLogsRouter(kafka, logger));
  return app;
}

describe("POST /logs", () => {
  it("accepts a valid payload and publishes it to kafka", async () => {
    const publish = vi.fn().mockResolvedValue(undefined);
    const kafka = { publish } as unknown as KafkaClient;

    const res = await request(buildApp(kafka)).post("/logs").send({
      service: "checkout-api",
      level: "error",
      message: "connection pool exhausted",
    });

    expect(res.status).toBe(202);
    expect(res.body.eventId).toBeDefined();
    expect(publish).toHaveBeenCalledWith(
      "logs.raw",
      "checkout-api",
      expect.objectContaining({ service: "checkout-api", level: "error" }),
    );
  });

  it("rejects a payload missing required fields", async () => {
    const kafka = { publish: vi.fn() } as unknown as KafkaClient;
    const res = await request(buildApp(kafka)).post("/logs").send({ level: "error" });
    expect(res.status).toBe(400);
  });

  it("returns 503 when kafka publish fails", async () => {
    const publish = vi.fn().mockRejectedValue(new Error("broker unreachable"));
    const kafka = { publish } as unknown as KafkaClient;

    const res = await request(buildApp(kafka)).post("/logs").send({
      service: "checkout-api",
      level: "info",
      message: "hello",
    });

    expect(res.status).toBe(503);
  });
});
