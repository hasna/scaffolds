// @ts-nocheck
import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  checkRateLimit,
  rateLimitConfigs,
  RedisRateLimiter,
  type RateLimitConfig,
} from "./rate-limit";

// Helper to create mock NextRequest
function createMockRequest(
  url: string,
  headers: Record<string, string> = {}
): NextRequest {
  const request = new NextRequest(new URL(url, "http://localhost"), {
    headers: new Headers(headers),
  });
  return request;
}

describe("rate-limit", () => {
  describe("rateLimitConfigs", () => {
    it("should have config for auth endpoints", () => {
      expect(rateLimitConfigs["/api/auth/login"]).toBeDefined();
      expect(rateLimitConfigs["/api/auth/register"]).toBeDefined();
      expect(rateLimitConfigs["/api/auth/forgot-password"]).toBeDefined();
    });

    it("should have stricter limits for auth endpoints", () => {
      const loginConfig = rateLimitConfigs["/api/auth/login"]!;
      const defaultConfig = rateLimitConfigs.default!;
      expect(loginConfig.maxRequests).toBeLessThan(defaultConfig.maxRequests);
    });

    it("should have default config", () => {
      expect(rateLimitConfigs.default).toBeDefined();
      expect(rateLimitConfigs.default!.maxRequests).toBeGreaterThan(0);
      expect(rateLimitConfigs.default!.windowMs).toBeGreaterThan(0);
    });

    it("should have higher limits for health check", () => {
      const healthConfig = rateLimitConfigs["/api/health"]!;
      const defaultConfig = rateLimitConfigs.default!;
      expect(healthConfig.maxRequests).toBeGreaterThan(defaultConfig.maxRequests);
    });
  });

  describe("checkRateLimit", () => {
    // Reset the rate limit store between tests by using different IPs
    let testCounter = 0;
    const getTestIp = () => `192.168.1.${++testCounter}`;

    it("should allow first request", () => {
      const request = createMockRequest("http://localhost/api/test", {
        "x-forwarded-for": getTestIp(),
      });
      const result = checkRateLimit(request);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeLessThan(result.limit);
    });

    it("should use IP address for rate limiting", () => {
      const ip = getTestIp();
      const request = createMockRequest("http://localhost/api/test", {
        "x-forwarded-for": ip,
      });
      const result = checkRateLimit(request);

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(rateLimitConfigs.default!.maxRequests);
    });

    it("should use API key for rate limiting when provided", () => {
      const request = createMockRequest("http://localhost/api/test", {
        "x-api-key": "sk_test_1234567890abcdef",
        "x-forwarded-for": getTestIp(),
      });
      const result = checkRateLimit(request);

      expect(result.allowed).toBe(true);
    });

    it("should use user ID for rate limiting when provided", () => {
      const request = createMockRequest("http://localhost/api/test", {
        "x-user-id": "user-123",
        "x-forwarded-for": getTestIp(),
      });
      const result = checkRateLimit(request);

      expect(result.allowed).toBe(true);
    });

    it("should use custom config when provided", () => {
      const customConfig: RateLimitConfig = {
        windowMs: 60000,
        maxRequests: 5,
      };
      const request = createMockRequest("http://localhost/api/custom", {
        "x-forwarded-for": getTestIp(),
      });
      const result = checkRateLimit(request, customConfig);

      expect(result.limit).toBe(5);
    });

    it("should match specific path configs", () => {
      const request = createMockRequest("http://localhost/api/auth/login", {
        "x-forwarded-for": getTestIp(),
      });
      const result = checkRateLimit(request);

      expect(result.limit).toBe(rateLimitConfigs["/api/auth/login"]!.maxRequests);
    });

    it("should match prefix configs", () => {
      const request = createMockRequest("http://localhost/api/v1/users", {
        "x-forwarded-for": getTestIp(),
      });
      const result = checkRateLimit(request);

      expect(result.limit).toBe(rateLimitConfigs["/api/v1/"]!.maxRequests);
    });

    it("should return reset time in seconds", () => {
      const request = createMockRequest("http://localhost/api/test", {
        "x-forwarded-for": getTestIp(),
      });
      const result = checkRateLimit(request);

      // Reset time should be a unix timestamp
      expect(result.reset).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });

    it("should decrement remaining on each request", () => {
      const ip = getTestIp();
      const createReq = () =>
        createMockRequest("http://localhost/api/unique-" + ip, {
          "x-forwarded-for": ip,
        });

      const result1 = checkRateLimit(createReq());
      const result2 = checkRateLimit(createReq());

      expect(result2.remaining).toBe(result1.remaining - 1);
    });
  });

  describe("RedisRateLimiter", () => {
    it("should allow requests within limit", async () => {
      const mockRedis = {
        get: vi.fn(),
        set: vi.fn(),
        incr: vi.fn().mockResolvedValue(1),
        expire: vi.fn(),
      };

      const limiter = new RedisRateLimiter(mockRedis);
      const config: RateLimitConfig = { windowMs: 60000, maxRequests: 10 };

      const result = await limiter.check("test-key", config);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9);
      expect(mockRedis.incr).toHaveBeenCalled();
    });

    it("should block requests over limit", async () => {
      const mockRedis = {
        get: vi.fn(),
        set: vi.fn(),
        incr: vi.fn().mockResolvedValue(11),
        expire: vi.fn(),
      };

      const limiter = new RedisRateLimiter(mockRedis);
      const config: RateLimitConfig = { windowMs: 60000, maxRequests: 10 };

      const result = await limiter.check("test-key", config);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it("should set expiry on first request", async () => {
      const mockRedis = {
        get: vi.fn(),
        set: vi.fn(),
        incr: vi.fn().mockResolvedValue(1),
        expire: vi.fn(),
      };

      const limiter = new RedisRateLimiter(mockRedis);
      const config: RateLimitConfig = { windowMs: 60000, maxRequests: 10 };

      await limiter.check("test-key", config);

      expect(mockRedis.expire).toHaveBeenCalledWith(
        expect.stringContaining("test-key"),
        60
      );
    });

    it("should not reset expiry on subsequent requests", async () => {
      const mockRedis = {
        get: vi.fn(),
        set: vi.fn(),
        incr: vi.fn().mockResolvedValue(5),
        expire: vi.fn(),
      };

      const limiter = new RedisRateLimiter(mockRedis);
      const config: RateLimitConfig = { windowMs: 60000, maxRequests: 10 };

      await limiter.check("test-key", config);

      expect(mockRedis.expire).not.toHaveBeenCalled();
    });
  });
});
