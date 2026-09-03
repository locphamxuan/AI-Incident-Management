import { Kafka, type Producer, type EachMessagePayload } from "kafkajs";
import type { Logger } from "../logger.js";
import { withRetry } from "../resilience/retry.js";

export interface KafkaClientOptions {
  clientId: string;
  brokers: string[];
  logger: Logger;
}

export interface ConsumeOptions<T> {
  topic: string;
  groupId: string;
  /** Handles one decoded message. Throw to trigger retry / DLQ. */
  handler: (message: T, raw: EachMessagePayload) => Promise<void>;
  /** Attempts before the message is sent to `<topic>.dlq`. */
  maxAttempts?: number;
}

export class KafkaClient {
  private readonly kafka: Kafka;
  private readonly logger: Logger;
  private producer: Producer | undefined;

  constructor(options: KafkaClientOptions) {
    this.kafka = new Kafka({ clientId: options.clientId, brokers: options.brokers });
    this.logger = options.logger;
  }

  private async getProducer(): Promise<Producer> {
    if (!this.producer) {
      this.producer = this.kafka.producer();
      await this.producer.connect();
    }
    return this.producer;
  }

  async publish(topic: string, key: string, value: unknown): Promise<void> {
    const producer = await this.getProducer();
    await producer.send({
      topic,
      messages: [{ key, value: JSON.stringify(value) }],
    });
  }

  /**
   * Subscribes to `topic` and processes each message with `handler`,
   * retrying transient failures and routing permanently-failing messages
   * to `<topic>.dlq` instead of blocking the partition.
   */
  async consume<T>(options: ConsumeOptions<T>): Promise<void> {
    const { topic, groupId, handler, maxAttempts = 3 } = options;
    const consumer = this.kafka.consumer({ groupId });
    await consumer.connect();
    await consumer.subscribe({ topic, fromBeginning: false });

    await consumer.run({
      eachMessage: async (payload) => {
        const raw = payload.message.value?.toString() ?? "null";
        const decoded = JSON.parse(raw) as T;

        try {
          await withRetry(() => handler(decoded, payload), {
            attempts: maxAttempts,
            onRetry: (error, attempt) =>
              this.logger.warn(
                { err: error, attempt, topic },
                "kafka message handler failed, retrying",
              ),
          });
        } catch (error) {
          this.logger.error({ err: error, topic }, "message exhausted retries, sending to DLQ");
          await this.publish(`${topic}.dlq`, payload.message.key?.toString() ?? "", {
            originalTopic: topic,
            error: error instanceof Error ? error.message : String(error),
            payload: decoded,
          });
        }
      },
    });
  }

  async disconnect(): Promise<void> {
    await this.producer?.disconnect();
  }
}
