export type CircuitState = "closed" | "open" | "half-open";

export interface CircuitBreakerOptions {
  /** Consecutive failures before the circuit opens. */
  failureThreshold?: number;
  /** How long the circuit stays open before allowing a trial call. */
  cooldownMs?: number;
  onStateChange?: (state: CircuitState) => void;
}

export class CircuitOpenError extends Error {
  constructor(name: string) {
    super(`Circuit "${name}" is open — failing fast`);
    this.name = "CircuitOpenError";
  }
}

/**
 * Wraps calls to a flaky dependency (Redis, Postgres, an external API).
 * After `failureThreshold` consecutive failures, the circuit opens and
 * every call fails immediately (no dogpiling a downed dependency). After
 * `cooldownMs`, a single trial call is allowed through (half-open); success
 * closes the circuit, failure re-opens it.
 */
export class CircuitBreaker {
  private state: CircuitState = "closed";
  private consecutiveFailures = 0;
  private openedAt = 0;

  private readonly failureThreshold: number;
  private readonly cooldownMs: number;
  private readonly onStateChange?: (state: CircuitState) => void;

  constructor(
    private readonly name: string,
    options: CircuitBreakerOptions = {},
  ) {
    this.failureThreshold = options.failureThreshold ?? 5;
    this.cooldownMs = options.cooldownMs ?? 30_000;
    this.onStateChange = options.onStateChange;
  }

  getState(): CircuitState {
    return this.state;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === "open") {
      if (Date.now() - this.openedAt < this.cooldownMs) {
        throw new CircuitOpenError(this.name);
      }
      this.transition("half-open");
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.consecutiveFailures = 0;
    if (this.state !== "closed") this.transition("closed");
  }

  private onFailure(): void {
    this.consecutiveFailures += 1;
    if (this.state === "half-open" || this.consecutiveFailures >= this.failureThreshold) {
      this.openedAt = Date.now();
      this.transition("open");
    }
  }

  private transition(next: CircuitState): void {
    this.state = next;
    this.onStateChange?.(next);
  }
}
