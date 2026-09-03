import { describe, expect, it } from "vitest";
import type { RawLogEvent } from "@ai-incident/shared";
import { InvalidLogEventError, normalize } from "../src/normalize.js";

function makeEvent(overrides: Partial<RawLogEvent> = {}): RawLogEvent {
  return {
    eventId: "11111111-1111-1111-1111-111111111111",
    service: "checkout-api",
    level: "info",
    message: "request completed",
    timestamp: "2026-09-03T12:00:00.000Z",
    ...overrides,
  };
}

describe("normalize", () => {
  it("trims fields and stamps normalizedAt", () => {
    const result = normalize(makeEvent({ service: "  checkout-api  ", message: "  hi  " }));
    expect(result.service).toBe("checkout-api");
    expect(result.message).toBe("hi");
    expect(result.normalizedAt).toBeDefined();
  });

  it("throws InvalidLogEventError when service is missing", () => {
    expect(() => normalize(makeEvent({ service: "" }))).toThrow(InvalidLogEventError);
  });

  it("throws InvalidLogEventError when message is blank", () => {
    expect(() => normalize(makeEvent({ message: "   " }))).toThrow(InvalidLogEventError);
  });
});
