/**
 * HTTP Request logging utilities
 */

import { type NextRequest } from "next/server";
import { logger, createRequestLogger } from "./index";
import { headers } from "next/headers";

interface RequestLogData {
  method: string;
  url: string;
  path: string;
  userAgent?: string;
  ip?: string;
  referer?: string;
  contentLength?: string;
}

interface ResponseLogData {
  status: number;
  durationMs: number;
  contentLength?: number;
}

/**
 * Extract request metadata for logging
 */
export function extractRequestData(request: NextRequest): RequestLogData {
  const url = new URL(request.url);
  return {
    method: request.method,
    url: request.url,
    path: url.pathname,
    userAgent: request.headers.get("user-agent") ?? undefined,
    ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        request.headers.get("x-real-ip") ??
        undefined,
    referer: request.headers.get("referer") ?? undefined,
    contentLength: request.headers.get("content-length") ?? undefined,
  };
}

/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Log incoming HTTP request
 */
export function logRequest(requestId: string, data: RequestLogData): void {
  const reqLogger = createRequestLogger(requestId);
  reqLogger.info(`${data.method} ${data.path}`, {
    type: "http_request",
    method: data.method,
    path: data.path,
    url: data.url,
    userAgent: data.userAgent,
    ip: data.ip,
    referer: data.referer,
  });
}

/**
 * Log HTTP response
 */
export function logResponse(
  requestId: string,
  requestData: RequestLogData,
  responseData: ResponseLogData
): void {
  const reqLogger = createRequestLogger(requestId);
  const level = responseData.status >= 500 ? "error" :
                responseData.status >= 400 ? "warn" : "info";

  const message = `${requestData.method} ${requestData.path} ${responseData.status} ${responseData.durationMs}ms`;

  reqLogger[level](message, {
    type: "http_response",
    method: requestData.method,
    path: requestData.path,
    status: responseData.status,
    durationMs: responseData.durationMs,
    contentLength: responseData.contentLength,
  });
}

/**
 * Log API error
 */
export function logApiError(
  requestId: string,
  error: Error,
  context?: Record<string, unknown>
): void {
  const reqLogger = createRequestLogger(requestId);
  reqLogger.error("API error occurred", {
    ...context,
    type: "api_error",
    errorName: error.name,
    errorMessage: error.message,
    stack: error.stack,
  });
}

/**
 * Create a performance timer for measuring request duration
 */
export function createTimer(): { stop: () => number } {
  const start = performance.now();
  return {
    stop: () => Math.round(performance.now() - start),
  };
}

/**
 * Server action logger wrapper
 */
export function logServerAction<T extends (...args: unknown[]) => Promise<unknown>>(
  actionName: string,
  action: T
): T {
  return (async (...args: unknown[]) => {
    const timer = createTimer();
    const actionLogger = logger.child({ action: actionName });

    actionLogger.info(`Server action started: ${actionName}`);

    try {
      const result = await action(...args);
      actionLogger.info(`Server action completed: ${actionName}`, {
        durationMs: timer.stop(),
      });
      return result;
    } catch (error) {
      actionLogger.error(`Server action failed: ${actionName}`, {
        durationMs: timer.stop(),
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }) as T;
}

/**
 * Get request ID from headers (server component context)
 */
export async function getRequestIdFromHeaders(): Promise<string | undefined> {
  const headersList = await headers();
  return headersList.get("x-request-id") ?? undefined;
}
