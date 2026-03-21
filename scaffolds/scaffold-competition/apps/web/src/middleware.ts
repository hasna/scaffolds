import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth.config";

// Use edge-compatible auth config (no database adapter)
const { auth } = NextAuth(authConfig);

/**
 * Edge-compatible rate limiting using in-memory store.
 * Note: This is suitable for single-instance deployments.
 * For production with multiple instances, use Redis via Upstash.
 */
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Rate limit configurations per endpoint pattern
const rateLimitConfigs: Record<string, { windowMs: number; maxRequests: number }> = {
  // Auth endpoints - stricter limits
  "/api/auth/register": { windowMs: 60 * 1000, maxRequests: 5 },
  "/api/auth/forgot-password": { windowMs: 60 * 1000, maxRequests: 3 },
  "/api/auth/reset-password": { windowMs: 60 * 1000, maxRequests: 5 },
  "/api/auth/accept-invite": { windowMs: 60 * 1000, maxRequests: 10 },
  "/api/auth/verify-email": { windowMs: 60 * 1000, maxRequests: 10 },
  // Competition API
  "/api/v1/competitions/": { windowMs: 60 * 1000, maxRequests: 60 },
  "/api/v1/submissions": { windowMs: 60 * 1000, maxRequests: 30 },
  "/api/v1/scores": { windowMs: 60 * 1000, maxRequests: 60 },
  // Health check - high limit
  "/api/health": { windowMs: 60 * 1000, maxRequests: 1000 },
  // API v1 general
  "/api/v1/": { windowMs: 60 * 1000, maxRequests: 100 },
  // Default for all other API routes
  "/api/": { windowMs: 60 * 1000, maxRequests: 60 },
};

function getRateLimitConfig(pathname: string): { windowMs: number; maxRequests: number } {
  // Check exact matches first
  if (rateLimitConfigs[pathname]) {
    return rateLimitConfigs[pathname];
  }
  // Check prefix matches (in order of specificity)
  for (const [pattern, config] of Object.entries(rateLimitConfigs)) {
    if (pathname.startsWith(pattern)) {
      return config;
    }
  }
  return { windowMs: 60 * 1000, maxRequests: 60 };
}

function checkRateLimit(
  pathname: string,
  clientKey: string
): { allowed: boolean; limit: number; remaining: number; reset: number } {
  const config = getRateLimitConfig(pathname);
  const key = `${pathname}:${clientKey}`;
  const now = Date.now();

  // Periodic cleanup of expired entries
  if (rateLimitStore.size > 10000) {
    for (const [k, v] of rateLimitStore.entries()) {
      if (v.resetTime < now) {
        rateLimitStore.delete(k);
      }
    }
  }

  const entry = rateLimitStore.get(key);

  if (!entry || entry.resetTime < now) {
    // New window
    rateLimitStore.set(key, { count: 1, resetTime: now + config.windowMs });
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

function getClientKey(request: Request): string {
  // Check for API key first
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer sk_")) {
    return `apikey:${authHeader.slice(7, 23)}`; // First 16 chars of API key
  }

  // Fall back to IP address
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip") ?? "unknown";
  return `ip:${ip}`;
}

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const pathname = nextUrl.pathname;

  // Allow static files
  const isStaticFile =
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".");

  if (isStaticFile) {
    return NextResponse.next();
  }

  // Rate limiting for API routes
  if (pathname.startsWith("/api/")) {
    const clientKey = getClientKey(req);
    const rateLimitResult = checkRateLimit(pathname, clientKey);

    if (!rateLimitResult.allowed) {
      const response = NextResponse.json(
        {
          error: "Too many requests",
          code: "RATE_LIMIT_EXCEEDED",
          retryAfter: rateLimitResult.reset - Math.floor(Date.now() / 1000),
        },
        { status: 429 }
      );
      response.headers.set("X-RateLimit-Limit", String(rateLimitResult.limit));
      response.headers.set("X-RateLimit-Remaining", String(rateLimitResult.remaining));
      response.headers.set("X-RateLimit-Reset", String(rateLimitResult.reset));
      response.headers.set("Retry-After", String(rateLimitResult.reset - Math.floor(Date.now() / 1000)));
      return response;
    }

    // Continue with the request but add rate limit headers
    const response = NextResponse.next();
    response.headers.set("X-RateLimit-Limit", String(rateLimitResult.limit));
    response.headers.set("X-RateLimit-Remaining", String(rateLimitResult.remaining));
    response.headers.set("X-RateLimit-Reset", String(rateLimitResult.reset));

    // Apply auth checks for API routes if needed
    // (API routes handle their own auth via getApiContext)
    return response;
  }

  // Redirect logged-in users away from auth routes
  const authRoutes = ["/login", "/register", "/forgot-password", "/reset-password"];
  const isAuthRoute = authRoutes.some((route) => pathname === route);
  if (isAuthRoute && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  // Admin route protection
  if (pathname.startsWith("/admin")) {
    const userRole = req.auth?.user?.role;
    if (userRole !== "admin" && userRole !== "super_admin") {
      return NextResponse.redirect(new URL("/dashboard", nextUrl));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
