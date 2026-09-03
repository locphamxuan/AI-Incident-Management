import amqplib, { type ChannelModel, type Channel } from "amqplib";
import type { Logger } from "../logger.js";
import { withRetry } from "../resilience/retry.js";

export interface RabbitMqClientOptions {
  url: string;
  logger: Logger;
}

export interface ConsumeQueueOptions<T> {
  queue: string;
  handler: (message: T) => Promise<void>;
  maxAttempts?: number;
  prefetch?: number;
}

/**
 * Thin RabbitMQ wrapper that provisions `<queue>` with a matching
 * `<queue>.dlq` dead-letter queue and nacks-to-DLQ any message that keeps
 * failing after `maxAttempts` redeliveries.
 */
export class RabbitMqClient {
  private connection: ChannelModel | undefined;
  private channel: Channel | undefined;

  constructor(private readonly options: RabbitMqClientOptions) {}

  private async getChannel(): Promise<Channel> {
    if (!this.channel) {
      this.connection = await amqplib.connect(this.options.url);
      this.channel = await this.connection.createChannel();
    }
    return this.channel;
  }

  private async assertQueueWithDlq(channel: Channel, queue: string): Promise<void> {
    const dlq = `${queue}.dlq`;
    await channel.assertQueue(dlq, { durable: true });
    await channel.assertQueue(queue, {
      durable: true,
      deadLetterExchange: "",
      deadLetterRoutingKey: dlq,
    });
  }

  async publish(queue: string, message: unknown): Promise<void> {
    const channel = await this.getChannel();
    await this.assertQueueWithDlq(channel, queue);
    channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), { persistent: true });
  }

  async consume<T>(options: ConsumeQueueOptions<T>): Promise<void> {
    const { queue, handler, maxAttempts = 3, prefetch = 4 } = options;
    const channel = await this.getChannel();
    await this.assertQueueWithDlq(channel, queue);
    await channel.prefetch(prefetch);

    await channel.consume(queue, (msg) => {
      if (!msg) return;
      void (async () => {
        const decoded = JSON.parse(msg.content.toString()) as T;
        try {
          await withRetry(() => handler(decoded), {
            attempts: maxAttempts,
            onRetry: (error, attempt) =>
              this.options.logger.warn(
                { err: error, attempt, queue },
                "rabbitmq message handler failed, retrying",
              ),
          });
          channel.ack(msg);
        } catch (error) {
          this.options.logger.error(
            { err: error, queue },
            "message exhausted retries, routing to DLQ",
          );
          // requeue=false + dead-letter config on the queue routes this to `<queue>.dlq`
          channel.nack(msg, false, false);
        }
      })();
    });
  }

  async disconnect(): Promise<void> {
    await this.channel?.close();
    await this.connection?.close();
  }
}
