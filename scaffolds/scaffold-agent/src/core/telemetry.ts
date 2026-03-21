/**
 * Telemetry service for logging and monitoring agent activity
 */

export interface TelemetryEvent {
  event: string;
  sessionId: string;
  agentId: string;
  tool?: string;
  input?: Record<string, unknown>;
  output?: unknown;
  success?: boolean;
  error?: string;
  timestamp: number;
  duration?: number;
  metadata?: Record<string, unknown>;
}

export interface TelemetryConfig {
  enabled: boolean;
  endpoint?: string;
  apiKey?: string;
  batchSize?: number;
  flushInterval?: number;
}

class TelemetryService {
  private config: TelemetryConfig;
  private buffer: TelemetryEvent[] = [];
  private flushTimer?: ReturnType<typeof setInterval>;

  constructor(config?: Partial<TelemetryConfig>) {
    this.config = {
      enabled: config?.enabled ?? true,
      endpoint: config?.endpoint ?? process.env.TELEMETRY_ENDPOINT,
      apiKey: config?.apiKey ?? process.env.TELEMETRY_API_KEY,
      batchSize: config?.batchSize ?? 100,
      flushInterval: config?.flushInterval ?? 30000,
    };

    if (this.config.enabled && this.config.endpoint) {
      this.startFlushTimer();
    }
  }

  async log(event: Omit<TelemetryEvent, "timestamp">): Promise<void> {
    const fullEvent: TelemetryEvent = {
      ...event,
      timestamp: Date.now(),
    };

    // Always log to console in development
    if (process.env.NODE_ENV !== "production") {
      this.logToConsole(fullEvent);
    }

    if (!this.config.enabled) return;

    // Sanitize sensitive data
    const sanitized = this.sanitize(fullEvent);
    this.buffer.push(sanitized);

    if (this.buffer.length >= (this.config.batchSize ?? 100)) {
      await this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const events = [...this.buffer];
    this.buffer = [];

    if (this.config.endpoint && this.config.apiKey) {
      try {
        await fetch(this.config.endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.config.apiKey}`,
          },
          body: JSON.stringify({ events }),
        });
      } catch (error) {
        // Re-add events to buffer on failure
        this.buffer = [...events, ...this.buffer];
        console.error("Failed to flush telemetry:", error);
      }
    }
  }

  private sanitize(event: TelemetryEvent): TelemetryEvent {
    const sanitized = { ...event };

    // Redact sensitive fields from input
    if (sanitized.input) {
      sanitized.input = this.redactSensitiveFields(sanitized.input);
    }

    return sanitized;
  }

  private redactSensitiveFields(
    obj: Record<string, unknown>
  ): Record<string, unknown> {
    const sensitivePatterns = [
      /password/i,
      /secret/i,
      /token/i,
      /api[_-]?key/i,
      /auth/i,
      /credential/i,
    ];

    const redacted: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      const isSensitive = sensitivePatterns.some((pattern) =>
        pattern.test(key)
      );
      redacted[key] = isSensitive ? "[REDACTED]" : value;
    }

    return redacted;
  }

  private logToConsole(event: TelemetryEvent): void {
    const timestamp = new Date(event.timestamp).toISOString();
    const status = event.success === false ? "FAILED" : "OK";
    const tool = event.tool ? ` [${event.tool}]` : "";

    console.log(`[${timestamp}] ${event.event}${tool} - ${status}`);

    if (event.error) {
      console.error(`  Error: ${event.error}`);
    }
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush().catch(console.error);
    }, this.config.flushInterval);
  }

  shutdown(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flush().catch(console.error);
  }
}

// Singleton instance
export const telemetry = new TelemetryService();

// Factory for custom instances
export function createTelemetry(config: Partial<TelemetryConfig>): TelemetryService {
  return new TelemetryService(config);
}
