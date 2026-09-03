import type Redis from "ioredis";
import { CircuitBreaker } from "../resilience/circuitBreaker.js";
import { withRetry } from "../resilience/retry.js";

export interface ErrorRate {
  rate: number;
  total: number;
}

/**
 * Fixed-window request/error counter backed by Redis, used for rate-based
 * anomaly rules (e.g. "5xx rate over the last minute"). Every Redis call
 * goes through retry + a circuit breaker per the project's resilience
 * rules — if Redis is down, `getErrorRate` fails fast instead of hanging
 * the anomaly-detection consumer.
 */
export class SlidingWindowCounter {
  private readonly breaker: CircuitBreaker;

  constructor(
    private readonly redis: Redis,
    private readonly windowMs = 60_000,
  ) {
    this.breaker = new CircuitBreaker("redis-sliding-window", { failureThreshold: 5 });
  }

  async recordRequest(service: string, isError: boolean): Promise<void> {
    await this.breaker.execute(() =>
      withRetry(async () => {
        const ttlSeconds = Math.ceil((this.windowMs / 1000) * 2);
        const pipeline = this.redis.pipeline();
        pipeline.incr(this.bucketKey("http:total", service));
        pipeline.expire(this.bucketKey("http:total", service), ttlSeconds);
        if (isError) {
          pipeline.incr(this.bucketKey("http:err", service));
          pipeline.expire(this.bucketKey("http:err", service), ttlSeconds);
        }
        await pipeline.exec();
      }),
    );
  }

  async getErrorRate(service: string): Promise<ErrorRate> {
    return this.breaker.execute(() =>
      withRetry(async () => {
        const [totalStr, errStr] = await this.redis.mget(
          this.bucketKey("http:total", service),
          this.bucketKey("http:err", service),
        );
        const total = Number(totalStr ?? 0);
        const err = Number(errStr ?? 0);
        return { rate: total === 0 ? 0 : err / total, total };
      }),
    );
  }

  private bucketKey(prefix: string, service: string): string {
    const bucket = Math.floor(Date.now() / this.windowMs);
    return `${prefix}:${service}:${bucket}`;
  }
}
