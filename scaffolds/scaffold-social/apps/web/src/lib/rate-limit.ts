import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Simple in-memory rate limiter for development
// In production, use Redis-based rate limiting
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Configuration per endpoint pattern
export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  keyGenerator?: (request: NextRequest, context?: RateLimitContext) => string; // Custom key generator
}

// Optional auth context for tenant-aware rate limiting
export interface RateLimitContext {
  userId?: string;
  tenantId?: string;
}

// Default rate limit configs for different endpoint types
export const rateLimitConfigs: Record<string, RateLimitConfig> = {
  // Auth endpoints - stricter limits
  "/api/auth/login": { windowMs: 60 * 1000, maxRequests: 5 },
  "/api/auth/register": { windowMs: 60 * 1000, maxRequests: 3 },
  "/api/auth/forgot-password": { windowMs: 60 * 1000, maxRequests: 3 },
  "/api/auth/reset-password": { windowMs: 60 * 1000, maxRequests: 5 },

  // API v1 endpoints - moderate limits
  "/api/v1/": { windowMs: 60 * 1000, maxRequests: 100 },

  // AI assistant - token-intensive, stricter limits
  "/api/v1/assistant/chat": { windowMs: 60 * 1000, maxRequests: 20 },

  // Stripe webhooks - higher limit (Stripe retries)
  "/api/stripe/webhook": { windowMs: 60 * 1000, maxRequests: 100 },

  // Health check - high limit
  "/api/health": { windowMs: 60 * 1000, maxRequests: 1000 },

  // Default for all other API routes
  default: { windowMs: 60 * 1000, maxRequests: 60 },
};

// Get config for a specific path
function getConfigForPath(pathname: string): RateLimitConfig {
  // Check exact matches first
  if (rateLimitConfigs[pathname]) {
    return rateLimitConfigs[pathname];
  }

  // Check prefix matches
  for (const [pattern, config] of Object.entries(rateLimitConfigs)) {
    if (pattern !== "default" && pathname.startsWith(pattern)) {
      return config;
    }
  }

  return rateLimitConfigs.default ?? { windowMs: 60 * 1000, maxRequests: 60 };
}

// Generate rate limit key from request
function generateKey(
  request: NextRequest,
  config?: RateLimitConfig,
  context?: RateLimitContext
): string {
  if (config?.keyGenerator) {
    return config.keyGenerator(request, context);
  }

  // Priority: tenant > user > api key > ip
  // This ensures tenant-level rate limiting for authenticated requests

  // Use tenant ID if available (most specific for multi-tenant apps)
  if (context?.tenantId) {
    return `tenant:${context.tenantId}`;
  }

  // Use user ID if available
  if (context?.userId) {
    return `user:${context.userId}`;
  }

  // Also consider the API key if present
  const apiKey = request.headers.get("x-api-key");
  if (apiKey) {
    return `apikey:${apiKey.slice(0, 16)}`;
  }

  // Fall back to user ID from headers (legacy support)
  const userId = request.headers.get("x-user-id");
  if (userId) {
    return `user:${userId}`;
  }

  // Use IP address as last resort
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0] ?? request.headers.get("x-real-ip") ?? "unknown";

  return `ip:${ip}`;
}

// Check rate limit and return result
export function checkRateLimit(
  request: NextRequest,
  customConfig?: RateLimitConfig,
  context?: RateLimitContext
): {
  allowed: boolean;
  limit: number;
  remaining: number;
  reset: number;
} {
  const pathname = new URL(request.url).pathname;
  const config = customConfig ?? getConfigForPath(pathname);
  const key = `${pathname}:${generateKey(request, config, context)}`;

  const now = Date.now();
  const entry = rateLimitStore.get(key);

  // Clean up expired entries periodically
  if (rateLimitStore.size > 10000) {
    for (const [k, v] of rateLimitStore.entries()) {
      if (v.resetTime < now) {
        rateLimitStore.delete(k);
      }
    }
  }

  if (!entry || entry.resetTime < now) {
    // New window
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + config.windowMs,
    });
    return {
      allowed: true,
      limit: config.maxRequests,
      remaining: config.maxRequests - 1,
      reset: Math.ceil((now + config.windowMs) / 1000),
    };
  }

  // Existing window
  if (entry.count >= config.maxRequests) {
    return {
      allowed: false,
      limit: config.maxRequests,
      remaining: 0,
      reset: Math.ceil(entry.resetTime / 1000),
    };
  }

  entry.count++;
  return {
    allowed: true,
    limit: config.maxRequests,
    remaining: config.maxRequests - entry.count,
    reset: Math.ceil(entry.resetTime / 1000),
  };
}

// Middleware wrapper for rate limiting
export function withRateLimit(
  handler: (request: NextRequest) => Promise<NextResponse>,
  config?: RateLimitConfig,
  getContext?: (request: NextRequest) => Promise<RateLimitContext | undefined>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const context = getContext ? await getContext(request) : undefined;
    const result = checkRateLimit(request, config, context);

    if (!result.allowed) {
      const response = NextResponse.json(
        {
          error: {
            code: "RATE_LIMIT_EXCEEDED",
            message: "Too many requests. Please try again later.",
          },
        },
        { status: 429 }
      );

      response.headers.set("X-RateLimit-Limit", String(result.limit));
      response.headers.set("X-RateLimit-Remaining", String(result.remaining));
      response.headers.set("X-RateLimit-Reset", String(result.reset));
      response.headers.set("Retry-After", String(result.reset - Math.floor(Date.now() / 1000)));

      return response;
    }

    const response = await handler(request);

    // Add rate limit headers to successful responses
    response.headers.set("X-RateLimit-Limit", String(result.limit));
    response.headers.set("X-RateLimit-Remaining", String(result.remaining));
    response.headers.set("X-RateLimit-Reset", String(result.reset));

    return response;
  };
}

// Track rate limit per API key
export function trackApiKeyUsage(apiKeyId: string): void {
  // In production, this would update the database
  // For now, it's a placeholder
  console.log(`API key usage tracked: ${apiKeyId}`);
}

// Redis-based rate limiter for production (requires Redis connection)
export class RedisRateLimiter {
  private prefix = "ratelimit:";

  constructor(
    private redis: {
      get: (key: string) => Promise<string | null>;
      set: (key: string, value: string, options?: { EX?: number }) => Promise<unknown>;
      incr: (key: string) => Promise<number>;
      expire: (key: string, seconds: number) => Promise<unknown>;
    }
  ) {}

  async check(
    key: string,
    config: RateLimitConfig
  ): Promise<{
    allowed: boolean;
    limit: number;
    remaining: number;
    reset: number;
  }> {
    const redisKey = `${this.prefix}${key}`;
    const windowSeconds = Math.ceil(config.windowMs / 1000);

    const count = await this.redis.incr(redisKey);

    if (count === 1) {
      await this.redis.expire(redisKey, windowSeconds);
    }

    const remaining = Math.max(0, config.maxRequests - count);
    const reset = Math.ceil(Date.now() / 1000) + windowSeconds;

    return {
      allowed: count <= config.maxRequests,
      limit: config.maxRequests,
      remaining,
      reset,
    };
  }
}
