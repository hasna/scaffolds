// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Create mock functions that we can control - use vi.hoisted to ensure they're available at mock time
const { mockReqLoggerInfo, mockReqLoggerWarn, mockReqLoggerError, mockChildInfo, mockChildError, mockHeadersGet } = vi.hoisted(() => ({
  mockReqLoggerInfo: vi.fn(),
  mockReqLoggerWarn: vi.fn(),
  mockReqLoggerError: vi.fn(),
  mockChildInfo: vi.fn(),
  mockChildError: vi.fn(),
  mockHeadersGet: vi.fn(),
}));

// Mock the logger module
vi.mock("./index", () => ({
  logger: {
    child: vi.fn().mockReturnValue({
      info: mockChildInfo,
      error: mockChildError,
    }),
  },
  createRequestLogger: vi.fn().mockReturnValue({
    info: mockReqLoggerInfo,
    warn: mockReqLoggerWarn,
    error: mockReqLoggerError,
  }),
}));

// Mock next/headers
vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue({
    get: mockHeadersGet,
  }),
}));

import {
  extractRequestData,
  generateRequestId,
  logRequest,
  logResponse,
  logApiError,
  createTimer,
  logServerAction,
  getRequestIdFromHeaders,
} from "./request-logger";
import { logger, createRequestLogger } from "./index";
import { headers } from "next/headers";

describe("request-logger", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("extractRequestData", () => {
    it("should extract basic request data", () => {
      const request = new NextRequest("https://example.com/api/users", {
        method: "GET",
      });

      const data = extractRequestData(request);

      expect(data.method).toBe("GET");
      expect(data.url).toBe("https://example.com/api/users");
      expect(data.path).toBe("/api/users");
    });

    it("should extract user-agent header", () => {
      const request = new NextRequest("https://example.com/api/users", {
        method: "GET",
        headers: {
          "user-agent": "Mozilla/5.0 Chrome",
        },
      });

      const data = extractRequestData(request);

      expect(data.userAgent).toBe("Mozilla/5.0 Chrome");
    });

    it("should extract IP from x-forwarded-for header", () => {
      const request = new NextRequest("https://example.com/api/users", {
        method: "GET",
        headers: {
          "x-forwarded-for": "192.168.1.1, 10.0.0.1",
        },
      });

      const data = extractRequestData(request);

      expect(data.ip).toBe("192.168.1.1");
    });

    it("should extract IP from x-real-ip header when x-forwarded-for is missing", () => {
      const request = new NextRequest("https://example.com/api/users", {
        method: "GET",
        headers: {
          "x-real-ip": "10.0.0.5",
        },
      });

      const data = extractRequestData(request);

      expect(data.ip).toBe("10.0.0.5");
    });

    it("should extract referer header", () => {
      const request = new NextRequest("https://example.com/api/users", {
        method: "GET",
        headers: {
          referer: "https://example.com/dashboard",
        },
      });

      const data = extractRequestData(request);

      expect(data.referer).toBe("https://example.com/dashboard");
    });

    it("should extract content-length header", () => {
      const request = new NextRequest("https://example.com/api/users", {
        method: "POST",
        headers: {
          "content-length": "1024",
        },
      });

      const data = extractRequestData(request);

      expect(data.contentLength).toBe("1024");
    });

    it("should return undefined for missing optional headers", () => {
      const request = new NextRequest("https://example.com/api/users", {
        method: "GET",
      });

      const data = extractRequestData(request);

      expect(data.userAgent).toBeUndefined();
      expect(data.ip).toBeUndefined();
      expect(data.referer).toBeUndefined();
      expect(data.contentLength).toBeUndefined();
    });

    it("should handle URL with query parameters", () => {
      const request = new NextRequest(
        "https://example.com/api/users?page=1&limit=10",
        {
          method: "GET",
        }
      );

      const data = extractRequestData(request);

      expect(data.path).toBe("/api/users");
      expect(data.url).toBe("https://example.com/api/users?page=1&limit=10");
    });
  });

  describe("generateRequestId", () => {
    it("should generate a string starting with req_", () => {
      const id = generateRequestId();

      expect(id).toMatch(/^req_/);
    });

    it("should generate unique IDs", () => {
      const id1 = generateRequestId();
      const id2 = generateRequestId();

      expect(id1).not.toBe(id2);
    });

    it("should have reasonable length", () => {
      const id = generateRequestId();

      // req_ + timestamp (base36) + _ + random (7 chars)
      expect(id.length).toBeGreaterThan(10);
      expect(id.length).toBeLessThan(30);
    });
  });

  describe("logRequest", () => {
    it("should call createRequestLogger with requestId", () => {
      const requestData = {
        method: "GET",
        url: "https://example.com/api/users",
        path: "/api/users",
      };

      logRequest("req-123", requestData);

      expect(createRequestLogger).toHaveBeenCalledWith("req-123");
    });

    it("should log request with correct message format", () => {
      const requestData = {
        method: "POST",
        url: "https://example.com/api/users",
        path: "/api/users",
        userAgent: "Mozilla/5.0",
        ip: "192.168.1.1",
        referer: "https://example.com",
      };

      logRequest("req-123", requestData);

      expect(mockReqLoggerInfo).toHaveBeenCalledWith(
        "POST /api/users",
        expect.objectContaining({
          type: "http_request",
          method: "POST",
          path: "/api/users",
          userAgent: "Mozilla/5.0",
          ip: "192.168.1.1",
          referer: "https://example.com",
        })
      );
    });
  });

  describe("logResponse", () => {
    it("should log info level for successful responses (2xx)", () => {
      const requestData = {
        method: "GET",
        url: "https://example.com/api/users",
        path: "/api/users",
      };
      const responseData = {
        status: 200,
        durationMs: 50,
      };

      logResponse("req-123", requestData, responseData);

      expect(mockReqLoggerInfo).toHaveBeenCalledWith(
        "GET /api/users 200 50ms",
        expect.objectContaining({
          type: "http_response",
          status: 200,
          durationMs: 50,
        })
      );
    });

    it("should log warn level for client errors (4xx)", () => {
      const requestData = {
        method: "GET",
        url: "https://example.com/api/users",
        path: "/api/users",
      };
      const responseData = {
        status: 404,
        durationMs: 10,
      };

      logResponse("req-123", requestData, responseData);

      expect(mockReqLoggerWarn).toHaveBeenCalledWith(
        "GET /api/users 404 10ms",
        expect.objectContaining({
          type: "http_response",
          status: 404,
        })
      );
    });

    it("should log error level for server errors (5xx)", () => {
      const requestData = {
        method: "POST",
        url: "https://example.com/api/users",
        path: "/api/users",
      };
      const responseData = {
        status: 500,
        durationMs: 100,
      };

      logResponse("req-123", requestData, responseData);

      expect(mockReqLoggerError).toHaveBeenCalledWith(
        "POST /api/users 500 100ms",
        expect.objectContaining({
          type: "http_response",
          status: 500,
        })
      );
    });

    it("should include content length when provided", () => {
      const requestData = {
        method: "GET",
        url: "https://example.com/api/users",
        path: "/api/users",
      };
      const responseData = {
        status: 200,
        durationMs: 50,
        contentLength: 2048,
      };

      logResponse("req-123", requestData, responseData);

      expect(mockReqLoggerInfo).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          contentLength: 2048,
        })
      );
    });
  });

  describe("logApiError", () => {
    it("should log error with error details", () => {
      const error = new Error("Database connection failed");
      logApiError("req-123", error);

      expect(mockReqLoggerError).toHaveBeenCalledWith(
        "API error occurred",
        expect.objectContaining({
          type: "api_error",
          errorName: "Error",
          errorMessage: "Database connection failed",
        })
      );
    });

    it("should include stack trace", () => {
      const error = new Error("Test error");
      logApiError("req-123", error);

      expect(mockReqLoggerError).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          stack: expect.stringContaining("Error: Test error"),
        })
      );
    });

    it("should merge additional context", () => {
      const error = new Error("Test error");
      logApiError("req-123", error, { userId: "user-123", endpoint: "/api/test" });

      expect(mockReqLoggerError).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          userId: "user-123",
          endpoint: "/api/test",
          type: "api_error",
        })
      );
    });
  });

  describe("createTimer", () => {
    it("should return an object with stop method", () => {
      const timer = createTimer();

      expect(timer).toHaveProperty("stop");
      expect(typeof timer.stop).toBe("function");
    });

    it("should return elapsed time in milliseconds", async () => {
      const timer = createTimer();

      // Wait a small amount of time
      await new Promise((resolve) => setTimeout(resolve, 10));

      const elapsed = timer.stop();

      expect(elapsed).toBeGreaterThanOrEqual(0);
      expect(typeof elapsed).toBe("number");
    });

    it("should return rounded value", () => {
      const timer = createTimer();
      const elapsed = timer.stop();

      expect(Number.isInteger(elapsed)).toBe(true);
    });
  });

  describe("logServerAction", () => {
    it("should create a child logger with action name", async () => {
      const action = vi.fn().mockResolvedValue({ success: true });
      const wrappedAction = logServerAction("testAction", action);

      await wrappedAction();

      expect(logger.child).toHaveBeenCalledWith({ action: "testAction" });
    });

    it("should log action start and completion on success", async () => {
      const action = vi.fn().mockResolvedValue({ data: "result" });
      const wrappedAction = logServerAction("createUser", action);

      await wrappedAction();

      expect(mockChildInfo).toHaveBeenCalledWith(
        "Server action started: createUser"
      );
      expect(mockChildInfo).toHaveBeenCalledWith(
        "Server action completed: createUser",
        expect.objectContaining({
          durationMs: expect.any(Number),
        })
      );
    });

    it("should return the action result", async () => {
      const expectedResult = { id: "123", name: "Test" };
      const action = vi.fn().mockResolvedValue(expectedResult);
      const wrappedAction = logServerAction("testAction", action);

      const result = await wrappedAction();

      expect(result).toEqual(expectedResult);
    });

    it("should pass arguments to the wrapped action", async () => {
      const action = vi.fn().mockResolvedValue(undefined);
      const wrappedAction = logServerAction("testAction", action);

      await wrappedAction("arg1", "arg2", { key: "value" });

      expect(action).toHaveBeenCalledWith("arg1", "arg2", { key: "value" });
    });

    it("should log error and rethrow on failure", async () => {
      const error = new Error("Action failed");
      const action = vi.fn().mockRejectedValue(error);
      const wrappedAction = logServerAction("failingAction", action);

      await expect(wrappedAction()).rejects.toThrow("Action failed");

      expect(mockChildError).toHaveBeenCalledWith(
        "Server action failed: failingAction",
        expect.objectContaining({
          error: "Action failed",
          durationMs: expect.any(Number),
        })
      );
    });

    it("should handle non-Error thrown values", async () => {
      const action = vi.fn().mockRejectedValue("string error");
      const wrappedAction = logServerAction("failingAction", action);

      await expect(wrappedAction()).rejects.toBe("string error");

      expect(mockChildError).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          error: "string error",
        })
      );
    });
  });

  describe("getRequestIdFromHeaders", () => {
    it("should return request ID from headers", async () => {
      mockHeadersGet.mockReturnValue("req-from-header");

      const requestId = await getRequestIdFromHeaders();

      expect(requestId).toBe("req-from-header");
      expect(mockHeadersGet).toHaveBeenCalledWith("x-request-id");
    });

    it("should return undefined when x-request-id header is not present", async () => {
      mockHeadersGet.mockReturnValue(null);

      const requestId = await getRequestIdFromHeaders();

      expect(requestId).toBeUndefined();
    });
  });
});
