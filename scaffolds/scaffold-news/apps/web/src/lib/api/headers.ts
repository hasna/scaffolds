import { NextResponse } from "next/server";
import { nanoid } from "nanoid";

// API Version
export const API_VERSION = "1.0.0";

// Add standard API headers to response
export function addApiHeaders(
  response: NextResponse,
  options?: {
    requestId?: string;
    rateLimit?: {
      limit: number;
      remaining: number;
      reset: number;
    };
  }
): NextResponse {
  const requestId = options?.requestId || nanoid();

  // API version header
  response.headers.set("X-API-Version", API_VERSION);

  // Request ID header
  response.headers.set("X-Request-ID", requestId);

  // Rate limit headers
  if (options?.rateLimit) {
    response.headers.set("X-RateLimit-Limit", String(options.rateLimit.limit));
    response.headers.set("X-RateLimit-Remaining", String(options.rateLimit.remaining));
    response.headers.set("X-RateLimit-Reset", String(options.rateLimit.reset));
  }

  // Cache control for API responses
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");

  return response;
}

// Create API JSON response with headers
export function createApiResponse<T>(
  data: T,
  options?: {
    status?: number;
    requestId?: string;
    rateLimit?: {
      limit: number;
      remaining: number;
      reset: number;
    };
  }
): NextResponse {
  const response = NextResponse.json(data, { status: options?.status || 200 });
  return addApiHeaders(response, options);
}

// Create API error response with headers
export function createApiErrorResponse(
  error: {
    code: string;
    message: string;
    details?: unknown;
  },
  options?: {
    status?: number;
    requestId?: string;
    rateLimit?: {
      limit: number;
      remaining: number;
      reset: number;
    };
  }
): NextResponse {
  const response = NextResponse.json(
    { error },
    { status: options?.status || 500 }
  );
  return addApiHeaders(response, options);
}

// Get request ID from incoming request or generate new one
export function getRequestId(request: Request): string {
  return request.headers.get("X-Request-ID") || nanoid();
}
