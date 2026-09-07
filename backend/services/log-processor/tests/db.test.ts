import type pg from "pg";
import { describe, expect, it, vi } from "vitest";
import { LogRepository } from "../src/db.js";

describe("LogRepository.insertLog", () => {
  it("upserts on (event_id, time) — the pair the raw_logs unique index is built on", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const pool = { query } as unknown as pg.Pool;
    const repository = new LogRepository(pool);

    await repository.insertLog({
      eventId: "11111111-1111-1111-1111-111111111111",
      service: "checkout-api",
      level: "error",
      message: "boom",
      timestamp: "2026-09-06T00:00:00.000Z",
      normalizedAt: "2026-09-06T00:00:01.000Z",
    });

    const [sql] = query.mock.calls[0];
    expect(sql).toContain("ON CONFLICT (event_id, time)");
  });
});
