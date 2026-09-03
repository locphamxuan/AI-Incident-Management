import type { Server as HttpServer } from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import type Redis from "ioredis";

const CHANNEL = "incident-updates";

/**
 * WebSocket gateway for the dashboard. Broadcasts go through Redis pub/sub
 * (`publish` here, subscribed on every incident-service replica) instead of
 * iterating this process's local clients directly, so a client connected to
 * *any* replica sees an update raised on *any other* replica — required for
 * horizontal scaling behind a load balancer.
 */
export class RealtimeGateway {
  private readonly wss: WebSocketServer;

  constructor(
    server: HttpServer,
    private readonly redisPub: Redis,
    redisSub: Redis,
  ) {
    this.wss = new WebSocketServer({ server });
    void redisSub.subscribe(CHANNEL);
    redisSub.on("message", (_channel, message) => this.broadcastLocal(message));
  }

  async publish(event: unknown): Promise<void> {
    await this.redisPub.publish(CHANNEL, JSON.stringify(event));
  }

  private broadcastLocal(message: string): void {
    for (const client of this.wss.clients) {
      if (client.readyState === WebSocket.OPEN) client.send(message);
    }
  }
}
