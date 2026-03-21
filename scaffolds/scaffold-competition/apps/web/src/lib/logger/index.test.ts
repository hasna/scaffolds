// @ts-nocheck
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  Logger,
  logger,
  createRequestLogger,
  createModuleLogger,
  type LogLevel,
} from "./index";

describe("logger", () => {
  let consoleSpy: {
    debug: ReturnType<typeof vi.spyOn>;
    info: ReturnType<typeof vi.spyOn>;
    warn: ReturnType<typeof vi.spyOn>;
    error: ReturnType<typeof vi.spyOn>;
  };

  beforeEach(() => {
    consoleSpy = {
      debug: vi.spyOn(console, "debug").mockImplementation(() => {}),
      info: vi.spyOn(console, "info").mockImplementation(() => {}),
      warn: vi.spyOn(console, "warn").mockImplementation(() => {}),
      error: vi.spyOn(console, "error").mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Logger class", () => {
    it("should create a logger with default config", () => {
      const testLogger = new Logger();
      const config = testLogger.getConfig();

      expect(config.serviceName).toBe("web");
      expect(config.jsonOutput).toBe(false); // development mode
    });

    it("should create a logger with custom config", () => {
      const testLogger = new Logger({
        level: "debug",
        serviceName: "test-service",
      });
      const config = testLogger.getConfig();

      expect(config.level).toBe("debug");
      expect(config.serviceName).toBe("test-service");
    });

    it("should log info messages", () => {
      const testLogger = new Logger({ level: "info" });
      testLogger.info("Test message");

      expect(consoleSpy.info).toHaveBeenCalled();
    });

    it("should log warn messages", () => {
      const testLogger = new Logger({ level: "info" });
      testLogger.warn("Warning message");

      expect(consoleSpy.warn).toHaveBeenCalled();
    });

    it("should log error messages", () => {
      const testLogger = new Logger({ level: "info" });
      testLogger.error("Error message");

      expect(consoleSpy.error).toHaveBeenCalled();
    });

    it("should log debug messages when level is debug", () => {
      const testLogger = new Logger({ level: "debug" });
      testLogger.debug("Debug message");

      expect(consoleSpy.debug).toHaveBeenCalled();
    });

    it("should not log debug messages when level is info", () => {
      const testLogger = new Logger({ level: "info" });
      testLogger.debug("Debug message");

      expect(consoleSpy.debug).not.toHaveBeenCalled();
    });

    it("should not log info messages when level is warn", () => {
      const testLogger = new Logger({ level: "warn" });
      testLogger.info("Info message");

      expect(consoleSpy.info).not.toHaveBeenCalled();
    });

    it("should include meta in log output", () => {
      const testLogger = new Logger({ level: "info" });
      testLogger.info("Message", { key: "value" });

      expect(consoleSpy.info).toHaveBeenCalled();
      const output = consoleSpy.info.mock.calls[0][0];
      expect(output).toContain("key");
      expect(output).toContain("value");
    });

    it("should handle Error objects", () => {
      const testLogger = new Logger({ level: "info" });
      const error = new Error("Test error");
      testLogger.error("Error occurred", error);

      expect(consoleSpy.error).toHaveBeenCalled();
      const output = consoleSpy.error.mock.calls[0][0];
      expect(output).toContain("Test error");
    });

    it("should handle error as meta object", () => {
      const testLogger = new Logger({ level: "info" });
      testLogger.error("Error occurred", { code: "ERR_001" });

      expect(consoleSpy.error).toHaveBeenCalled();
      const output = consoleSpy.error.mock.calls[0][0];
      expect(output).toContain("ERR_001");
    });
  });

  describe("child logger", () => {
    it("should create a child logger with additional context", () => {
      const parentLogger = new Logger({ level: "info" });
      const childLogger = parentLogger.child({ requestId: "req-123" });

      childLogger.info("Child message");

      expect(consoleSpy.info).toHaveBeenCalled();
      const output = consoleSpy.info.mock.calls[0][0];
      expect(output).toContain("req-123");
    });

    it("should inherit parent config", () => {
      const parentLogger = new Logger({
        level: "debug",
        serviceName: "parent-service",
      });
      const childLogger = parentLogger.child({ module: "child" });

      const config = childLogger.getConfig();
      expect(config.level).toBe("debug");
      expect(config.serviceName).toBe("parent-service");
    });

    it("should merge context with parent", () => {
      const parentLogger = new Logger({ level: "info" }, { userId: "user-1" });
      const childLogger = parentLogger.child({ requestId: "req-123" });

      childLogger.info("Message");

      const output = consoleSpy.info.mock.calls[0][0];
      expect(output).toContain("user-1");
      expect(output).toContain("req-123");
    });
  });

  describe("setLevel", () => {
    it("should change log level dynamically", () => {
      const testLogger = new Logger({ level: "info" });

      // Debug should not log at info level
      testLogger.debug("Debug 1");
      expect(consoleSpy.debug).not.toHaveBeenCalled();

      // Change to debug level
      testLogger.setLevel("debug");

      // Debug should log now
      testLogger.debug("Debug 2");
      expect(consoleSpy.debug).toHaveBeenCalled();
    });
  });

  describe("JSON output", () => {
    it("should output JSON when jsonOutput is true", () => {
      const testLogger = new Logger({
        level: "info",
        jsonOutput: true,
        serviceName: "test-service",
        version: "1.0.0",
      });

      testLogger.info("JSON message", { key: "value" });

      expect(consoleSpy.info).toHaveBeenCalled();
      const output = consoleSpy.info.mock.calls[0][0];

      // Should be valid JSON
      const parsed = JSON.parse(output);
      expect(parsed.message).toBe("JSON message");
      expect(parsed.level).toBe("info");
      expect(parsed.service).toBe("test-service");
      expect(parsed.version).toBe("1.0.0");
      expect(parsed.meta).toEqual({ key: "value" });
    });
  });

  describe("createRequestLogger", () => {
    it("should create a logger with requestId", () => {
      const requestLogger = createRequestLogger("req-123");
      requestLogger.info("Request message");

      const output = consoleSpy.info.mock.calls[0][0];
      expect(output).toContain("req-123");
    });

    it("should create a logger with requestId and userId", () => {
      const requestLogger = createRequestLogger("req-123", "user-456");
      requestLogger.info("Request message");

      const output = consoleSpy.info.mock.calls[0][0];
      expect(output).toContain("req-123");
      expect(output).toContain("user-456");
    });
  });

  describe("createModuleLogger", () => {
    it("should create a logger with module name", () => {
      const moduleLogger = createModuleLogger("auth");
      moduleLogger.info("Module message");

      const output = consoleSpy.info.mock.calls[0][0];
      expect(output).toContain("auth");
    });
  });

  describe("singleton logger", () => {
    it("should be a Logger instance", () => {
      expect(logger).toBeInstanceOf(Logger);
    });

    it("should log messages", () => {
      logger.info("Singleton message");
      expect(consoleSpy.info).toHaveBeenCalled();
    });
  });
});
