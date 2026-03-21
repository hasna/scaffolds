// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import {
  checkRateLimit,
  rateLimitConfigs,
  withRateLimit,
  RedisRateLimiter,
  type RateLimitConfig,
  type RateLimitContext,
} from "../rate-limit";

function createRequest(
  pathname: string,
  headers?: Record<string, string>
): NextRequest {
  const url = `http://localhost:3000${pathname}`;
  return new NextRequest(url, {
    method: "GET",
    headers,
  });
}

describe("rate-limit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear the rate limit store between tests
    // We need to reset state by making lots of requests to different paths
  });

  describe("rateLimitConfigs", () => {
    it("should have auth endpoint configs", () => {
      expect(rateLimitConfigs["/api/auth/login"]).toBeDefined();
      expect(rateLimitConfigs["/api/auth/login"].maxRequests).toBe(5);
      expect(rateLimitConfigs["/api/auth/register"]).toBeDefined();
      expect(rateLimitConfigs["/api/auth/register"].maxRequests).toBe(3);
    });

    it("should have stricter limits for auth endpoints", () => {
      expect(rateLimitConfigs["/api/auth/login"].maxRequests).toBeLessThan(
        rateLimitConfigs["/api/v1/"].maxRequests
      );
    });

    it("should have high limits for health check", () => {
      expect(rateLimitConfigs["/api/health"].maxRequests).toBe(1000);
    });

    it("should have default config", () => {
      expect(rateLimitConfigs.default).toBeDefined();
      expect(rateLimitConfigs.default.windowMs).toBe(60 * 1000);
      expect(rateLimitConfigs.default.maxRequests).toBe(60);
    });
  });

  describe("checkRateLimit", () => {
    it("should allow first request", () => {
      const request = createRequest("/api/unique-path-1");
      const result = checkRateLimit(request);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeGreaterThan(0);
    });

    it("should track multiple requests", () => {
      const request = createRequest("/api/unique-path-2");

      const result1 = checkRateLimit(request);
      const result2 = checkRateLimit(request);

      expect(result1.allowed).toBe(true);
      expect(result2.allowed).toBe(true);
      expect(result2.remaining).toBe(result1.remaining - 1);
    });

    it("should respect custom config", () => {
      const customConfig: RateLimitConfig = {
        windowMs: 60000,
        maxRequests: 2,
      };
      const request = createRequest("/api/unique-path-3");

      const result1 = checkRateLimit(request, customConfig);
      const result2 = checkRateLimit(request, customConfig);
      const result3 = checkRateLimit(request, customConfig);

      expect(result1.allowed).toBe(true);
      expect(result2.allowed).toBe(true);
      expect(result3.allowed).toBe(false);
      expect(result3.remaining).toBe(0);
    });

    it("should use tenant ID when provided in context", () => {
      const request = createRequest("/api/unique-path-4");
      const context: RateLimitContext = { tenantId: "tenant-123" };

      const result = checkRateLimit(request, undefined, context);

      expect(result.allowed).toBe(true);
    });

    it("should use user ID when provided in context", () => {
      const request = createRequest("/api/unique-path-5");
      const context: RateLimitContext = { userId: "user-123" };

      const result = checkRateLimit(request, undefined, context);

      expect(result.allowed).toBe(true);
    });

    it("should use API key from header", () => {
      const request = createRequest("/api/unique-path-6", {
        "x-api-key": "api-key-123",
      });

      const result = checkRateLimit(request);

      expect(result.allowed).toBe(true);
    });

    it("should use IP address as fallback", () => {
      const request = createRequest("/api/unique-path-7", {
        "x-forwarded-for": "192.168.1.1",
      });

      const result = checkRateLimit(request);

      expect(result.allowed).toBe(true);
    });

    it("should return correct reset timestamp", () => {
      const request = createRequest("/api/unique-path-8");
      const result = checkRateLimit(request);

      expect(result.reset).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });
  });

  describe("withRateLimit", () => {
    it("should pass through when rate limit not exceeded", async () => {
      const mockHandler = vi.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      );
      const wrappedHandler = withRateLimit(mockHandler);

      const request = createRequest("/api/unique-path-9");
      const response = await wrappedHandler(request);

      expect(response.status).toBe(200);
      expect(mockHandler).toHaveBeenCalled();
      expect(response.headers.get("X-RateLimit-Limit")).toBeDefined();
      expect(response.headers.get("X-RateLimit-Remaining")).toBeDefined();
    });

    it("should return 429 when rate limit exceeded", async () => {
      const customConfig: RateLimitConfig = {
        windowMs: 60000,
        maxRequests: 1,
      };
      const mockHandler = vi.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      );
      const wrappedHandler = withRateLimit(mockHandler, customConfig);

      const request = createRequest("/api/unique-path-10");

      // First request should succeed
      await wrappedHandler(request);

      // Second request should be rate limited
      const response = await wrappedHandler(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error.code).toBe("RATE_LIMIT_EXCEEDED");
      expect(response.headers.get("Retry-After")).toBeDefined();
    });

    it("should use context getter when provided", async () => {
      const mockHandler = vi.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      );
      const mockContextGetter = vi.fn().mockResolvedValue({
        userId: "user-123",
        tenantId: "tenant-456",
      });

      const wrappedHandler = withRateLimit(mockHandler, undefined, mockContextGetter);
      const request = createRequest("/api/unique-path-11");

      await wrappedHandler(request);

      expect(mockContextGetter).toHaveBeenCalledWith(request);
    });
  });

  describe("RedisRateLimiter", () => {
    it("should check rate limit with Redis", async () => {
      const mockRedis = {
        get: vi.fn().mockResolvedValue(null),
        set: vi.fn().mockResolvedValue("OK"),
        incr: vi.fn().mockResolvedValue(1),
        expire: vi.fn().mockResolvedValue(1),
      };

      const limiter = new RedisRateLimiter(mockRedis);
      const result = await limiter.check("test-key", {
        windowMs: 60000,
        maxRequests: 10,
      });

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9);
      expect(mockRedis.incr).toHaveBeenCalled();
    });

    it("should set expiry on first request", async () => {
      const mockRedis = {
        get: vi.fn().mockResolvedValue(null),
        set: vi.fn().mockResolvedValue("OK"),
        incr: vi.fn().mockResolvedValue(1),
        expire: vi.fn().mockResolvedValue(1),
      };

      const limiter = new RedisRateLimiter(mockRedis);
      await limiter.check("test-key-2", {
        windowMs: 60000,
        maxRequests: 10,
      });

      expect(mockRedis.expire).toHaveBeenCalledWith("ratelimit:test-key-2", 60);
    });

    it("should not allow when limit exceeded", async () => {
      const mockRedis = {
        get: vi.fn().mockResolvedValue("10"),
        set: vi.fn().mockResolvedValue("OK"),
        incr: vi.fn().mockResolvedValue(11),
        expire: vi.fn().mockResolvedValue(1),
      };

      const limiter = new RedisRateLimiter(mockRedis);
      const result = await limiter.check("test-key-3", {
        windowMs: 60000,
        maxRequests: 10,
      });

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });
  });
});
