import { describe, expect, it, vi } from "vitest";
import { CircuitBreaker, CircuitOpenError } from "../src/resilience/circuitBreaker.js";

describe("CircuitBreaker", () => {
  it("stays closed and passes results through while calls succeed", async () => {
    const cb = new CircuitBreaker("test", { failureThreshold: 2 });
    const result = await cb.execute(() => Promise.resolve(42));
    expect(result).toBe(42);
    expect(cb.getState()).toBe("closed");
  });

  it("opens after reaching the failure threshold and fails fast", async () => {
    const cb = new CircuitBreaker("test", { failureThreshold: 2, cooldownMs: 10_000 });
    const failing = () => Promise.reject(new Error("down"));

    await expect(cb.execute(failing)).rejects.toThrow("down");
    await expect(cb.execute(failing)).rejects.toThrow("down");
    expect(cb.getState()).toBe("open");

    await expect(cb.execute(() => Promise.resolve("unreachable"))).rejects.toThrow(
      CircuitOpenError,
    );
  });

  it("moves to half-open after cooldown and closes again on success", async () => {
    vi.useFakeTimers();
    const cb = new CircuitBreaker("test", { failureThreshold: 1, cooldownMs: 1_000 });

    await expect(cb.execute(() => Promise.reject(new Error("down")))).rejects.toThrow();
    expect(cb.getState()).toBe("open");

    vi.advanceTimersByTime(1_001);

    const result = await cb.execute(() => Promise.resolve("recovered"));
    expect(result).toBe("recovered");
    expect(cb.getState()).toBe("closed");

    vi.useRealTimers();
  });

  it("re-opens if the half-open trial call fails", async () => {
    vi.useFakeTimers();
    const cb = new CircuitBreaker("test", { failureThreshold: 1, cooldownMs: 1_000 });

    await expect(cb.execute(() => Promise.reject(new Error("down")))).rejects.toThrow();
    vi.advanceTimersByTime(1_001);
    await expect(cb.execute(() => Promise.reject(new Error("still down")))).rejects.toThrow();

    expect(cb.getState()).toBe("open");
    vi.useRealTimers();
  });
});
