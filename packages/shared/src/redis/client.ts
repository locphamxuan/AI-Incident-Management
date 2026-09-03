import Redis from "ioredis";

export function createRedisClient(url: string): Redis {
  return new Redis(url, { lazyConnect: false, maxRetriesPerRequest: 2 });
}
