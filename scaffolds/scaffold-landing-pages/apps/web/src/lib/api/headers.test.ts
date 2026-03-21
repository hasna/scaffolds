// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";
import {
  API_VERSION,
  addApiHeaders,
  createApiResponse,
  createApiErrorResponse,
  getRequestId,
} from "./headers";

// Mock nanoid
vi.mock("nanoid", () => ({
  nanoid: () => "mock-request-id",
}));

describe("api/headers", () => {
  describe("API_VERSION", () => {
    it("should be defined", () => {
      expect(API_VERSION).toBeDefined();
      expect(typeof API_VERSION).toBe("string");
    });
  });

  describe("addApiHeaders", () => {
    it("should add API version header", () => {
      const response = NextResponse.json({ data: "test" });
      const result = addApiHeaders(response);
      expect(result.headers.get("X-API-Version")).toBe(API_VERSION);
    });

    it("should add request ID header when provided", () => {
      const response = NextResponse.json({ data: "test" });
      const result = addApiHeaders(response, { requestId: "custom-id" });
      expect(result.headers.get("X-Request-ID")).toBe("custom-id");
    });

    it("should generate request ID when not provided", () => {
      const response = NextResponse.json({ data: "test" });
      const result = addApiHeaders(response);
      expect(result.headers.get("X-Request-ID")).toBe("mock-request-id");
    });

    it("should add rate limit headers when provided", () => {
      const response = NextResponse.json({ data: "test" });
      const result = addApiHeaders(response, {
        rateLimit: { limit: 100, remaining: 95, reset: 1234567890 },
      });
      expect(result.headers.get("X-RateLimit-Limit")).toBe("100");
      expect(result.headers.get("X-RateLimit-Remaining")).toBe("95");
      expect(result.headers.get("X-RateLimit-Reset")).toBe("1234567890");
    });

    it("should not add rate limit headers when not provided", () => {
      const response = NextResponse.json({ data: "test" });
      const result = addApiHeaders(response);
      expect(result.headers.get("X-RateLimit-Limit")).toBeNull();
    });

    it("should add cache control header", () => {
      const response = NextResponse.json({ data: "test" });
      const result = addApiHeaders(response);
      expect(result.headers.get("Cache-Control")).toBe(
        "no-store, no-cache, must-revalidate"
      );
    });
  });

  describe("createApiResponse", () => {
    it("should create JSON response with data", async () => {
      const data = { message: "Hello" };
      const response = createApiResponse(data);
      const json = await response.json();
      expect(json).toEqual(data);
    });

    it("should use 200 status by default", () => {
      const response = createApiResponse({ data: "test" });
      expect(response.status).toBe(200);
    });

    it("should use custom status when provided", () => {
      const response = createApiResponse({ data: "test" }, { status: 201 });
      expect(response.status).toBe(201);
    });

    it("should include API headers", () => {
      const response = createApiResponse({ data: "test" });
      expect(response.headers.get("X-API-Version")).toBe(API_VERSION);
      expect(response.headers.get("X-Request-ID")).toBeTruthy();
    });
  });

  describe("createApiErrorResponse", () => {
    it("should create error response", async () => {
      const error = { code: "ERROR_CODE", message: "Error message" };
      const response = createApiErrorResponse(error);
      const json = await response.json();
      expect(json).toEqual({ error });
    });

    it("should use 500 status by default", () => {
      const error = { code: "ERROR_CODE", message: "Error message" };
      const response = createApiErrorResponse(error);
      expect(response.status).toBe(500);
    });

    it("should use custom status when provided", () => {
      const error = { code: "NOT_FOUND", message: "Not found" };
      const response = createApiErrorResponse(error, { status: 404 });
      expect(response.status).toBe(404);
    });

    it("should include error details when provided", async () => {
      const error = {
        code: "VALIDATION_ERROR",
        message: "Validation failed",
        details: { field: "email", error: "invalid format" },
      };
      const response = createApiErrorResponse(error);
      const json = await response.json();
      expect(json.error.details).toEqual(error.details);
    });

    it("should include API headers", () => {
      const error = { code: "ERROR_CODE", message: "Error message" };
      const response = createApiErrorResponse(error);
      expect(response.headers.get("X-API-Version")).toBe(API_VERSION);
    });
  });

  describe("getRequestId", () => {
    it("should return request ID from header when present", () => {
      const request = new Request("http://localhost/api", {
        headers: { "X-Request-ID": "custom-request-id" },
      });
      const result = getRequestId(request);
      expect(result).toBe("custom-request-id");
    });

    it("should generate request ID when not present in header", () => {
      const request = new Request("http://localhost/api");
      const result = getRequestId(request);
      expect(result).toBe("mock-request-id");
    });
  });
});
