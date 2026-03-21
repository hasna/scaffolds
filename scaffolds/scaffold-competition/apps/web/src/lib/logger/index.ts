/**
 * Structured logging system for the application
 * Supports JSON output, context propagation, and Sentry integration
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

interface LogContext {
  requestId?: string;
  userId?: string;
  sessionId?: string;
  traceId?: string;
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  meta?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

interface LoggerConfig {
  level: LogLevel;
  jsonOutput: boolean;
  serviceName: string;
  version: string;
}

const envLogLevel = process.env.LOG_LEVEL?.trim();
const envServiceName = process.env.SERVICE_NAME?.trim();
const envAppVersion = process.env.APP_VERSION?.trim();

const defaultConfig: LoggerConfig = {
  level: (envLogLevel as LogLevel | undefined) ?? "info",
  jsonOutput: process.env.NODE_ENV === "production",
  serviceName: envServiceName ?? "web",
  version: envAppVersion ?? "0.0.0",
};

// ANSI color codes for development console output
const colors = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
};

const levelColors: Record<LogLevel, string> = {
  debug: colors.gray,
  info: colors.cyan,
  warn: colors.yellow,
  error: colors.red,
};

function shouldLog(level: LogLevel, configLevel: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[configLevel];
}

function formatPretty(entry: LogEntry): string {
  const color = levelColors[entry.level];
  const timestamp = colors.dim + entry.timestamp + colors.reset;
  const level = color + entry.level.toUpperCase().padEnd(5) + colors.reset;
  const message = entry.message;

  let output = `${timestamp} ${level} ${message}`;

  if (entry.context && Object.keys(entry.context).length > 0) {
    output += ` ${colors.dim}ctx=${JSON.stringify(entry.context)}${colors.reset}`;
  }

  if (entry.meta && Object.keys(entry.meta).length > 0) {
    output += ` ${colors.blue}${JSON.stringify(entry.meta)}${colors.reset}`;
  }

  if (entry.error) {
    output += `\n${colors.red}${entry.error.name}: ${entry.error.message}${colors.reset}`;
    if (entry.error.stack) {
      output += `\n${colors.dim}${entry.error.stack}${colors.reset}`;
    }
  }

  return output;
}

function formatJson(entry: LogEntry, config: LoggerConfig): string {
  return JSON.stringify({
    ...entry,
    service: config.serviceName,
    version: config.version,
  });
}

class Logger {
  private config: LoggerConfig;
  private context: LogContext;

  constructor(config: Partial<LoggerConfig> = {}, context: LogContext = {}) {
    this.config = { ...defaultConfig, ...config };
    this.context = context;
  }

  private log(
    level: LogLevel,
    message: string,
    meta?: Record<string, unknown>,
    error?: Error
  ): void {
    if (!shouldLog(level, this.config.level)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: Object.keys(this.context).length > 0 ? this.context : undefined,
      meta: meta && Object.keys(meta).length > 0 ? meta : undefined,
    };

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    const output = this.config.jsonOutput ? formatJson(entry, this.config) : formatPretty(entry);

    switch (level) {
      case "debug":
        console.debug(output);
        break;
      case "info":
        console.info(output);
        break;
      case "warn":
        console.warn(output);
        break;
      case "error":
        console.error(output);
        break;
    }
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    this.log("debug", message, meta);
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.log("info", message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.log("warn", message, meta);
  }

  error(message: string, error?: Error | Record<string, unknown>): void {
    if (error instanceof Error) {
      this.log("error", message, undefined, error);
    } else {
      this.log("error", message, error);
    }
  }

  /**
   * Create a child logger with additional context
   */
  child(context: LogContext): Logger {
    return new Logger(this.config, { ...this.context, ...context });
  }

  /**
   * Set the log level dynamically
   */
  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  /**
   * Get current configuration
   */
  getConfig(): LoggerConfig {
    return { ...this.config };
  }
}

// Export a singleton logger instance
export const logger = new Logger();

// Export the Logger class for creating custom instances
export { Logger };

// Utility to create a request-scoped logger
export function createRequestLogger(requestId: string, userId?: string): Logger {
  return logger.child({
    requestId,
    userId,
  });
}

// Utility to create a module-scoped logger
export function createModuleLogger(moduleName: string): Logger {
  return logger.child({
    module: moduleName,
  });
}
