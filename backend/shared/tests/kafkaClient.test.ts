import { beforeEach, describe, expect, it, vi } from "vitest";

const connect = vi.fn();
const subscribe = vi.fn();
const run = vi.fn();
const producerConnect = vi.fn();
const send = vi.fn();

vi.mock("kafkajs", () => ({
  Kafka: vi.fn().mockImplementation(() => ({
    consumer: () => ({ connect, subscribe, run }),
    producer: () => ({ connect: producerConnect, send }),
  })),
}));

const { KafkaClient } = await import("../src/kafka/client.js");
type Logger = import("../src/logger.js").Logger;

function makeLogger(): Logger {
  return { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } as unknown as Logger;
}

describe("KafkaClient", () => {
  beforeEach(() => {
    connect.mockReset();
    subscribe.mockReset().mockResolvedValue(undefined);
    run.mockReset().mockResolvedValue(undefined);
    producerConnect.mockReset();
    send.mockReset().mockResolvedValue(undefined);
  });

  it("consume() retries a broker connection refusal at startup instead of crashing the process", async () => {
    connect.mockRejectedValueOnce(new Error("ECONNREFUSED")).mockResolvedValue(undefined);
    const logger = makeLogger();
    const client = new KafkaClient({ clientId: "test", brokers: ["kafka:9092"], logger });

    await client.consume({ topic: "logs.raw", groupId: "test-group", handler: vi.fn() });

    expect(connect).toHaveBeenCalledTimes(2);
    expect(subscribe).toHaveBeenCalledWith({ topic: "logs.raw", fromBeginning: false });
    expect(run).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ topic: "logs.raw", groupId: "test-group" }),
      "kafka consumer connect failed, retrying",
    );
  });

  it("publish() retries a failed producer connect instead of throwing immediately", async () => {
    producerConnect.mockRejectedValueOnce(new Error("ECONNREFUSED")).mockResolvedValue(undefined);
    const logger = makeLogger();
    const client = new KafkaClient({ clientId: "test", brokers: ["kafka:9092"], logger });

    await client.publish("incidents.detected", "checkout-api", { hello: "world" });

    expect(producerConnect).toHaveBeenCalledTimes(2);
    expect(send).toHaveBeenCalledWith({
      topic: "incidents.detected",
      messages: [{ key: "checkout-api", value: JSON.stringify({ hello: "world" }) }],
    });
  });
});
