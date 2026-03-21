import { NextRequest, NextResponse } from "next/server";
import { auth } from "./auth";
import { validateApiKey } from "./api-auth";
import type { ApiKeyScope } from "@scaffold-landing-pages/database/schema";

export type AuthSource = "session" | "apikey";

export interface ApiContext {
  /** User ID from session or API key */
  userId: string;
  /** Tenant ID from session or API key */
  tenantId: string;
  /** Tenant role (only available for session auth) */
  tenantRole?: "member" | "manager" | "owner";
  /** User role (only available for session auth) */
  userRole?: "user" | "admin" | "super_admin";
  /** API key ID (only available for API key auth) */
  keyId?: string;
  /** API key scopes (only available for API key auth) */
  keyScopes?: ApiKeyScope[];
  /** Source of authentication */
  authSource: AuthSource;
}

export interface AuthResult {
  success: true;
  context: ApiContext;
}

export interface AuthError {
  success: false;
  error: string;
  status: number;
}

/**
 * Get authentication context from either session or API key
 * API key takes precedence if both are present
 */
export async function getApiContext(
  request: NextRequest
): Promise<AuthResult | AuthError> {
  // Try API key first (Bearer token)
  const apiKeyContext = await validateApiKey(request);
  if (apiKeyContext) {
    return {
      success: true,
      context: {
        userId: apiKeyContext.userId,
        tenantId: apiKeyContext.tenantId,
        keyId: apiKeyContext.keyId,
        keyScopes: apiKeyContext.scopes,
        authSource: "apikey",
      },
    };
  }

  // Fall back to session auth
  const session = await auth();
  if (!session?.user?.id) {
    return {
      success: false,
      error: "Unauthorized",
      status: 401,
    };
  }

  if (!session.user.tenantId) {
    return {
      success: false,
      error: "No tenant selected",
      status: 400,
    };
  }

  return {
    success: true,
    context: {
      userId: session.user.id,
      tenantId: session.user.tenantId,
      tenantRole: session.user.tenantRole,
      userRole: session.user.role,
      authSource: "session",
    },
  };
}

/**
 * Higher-order function wrapper for API routes that require authentication
 * Supports both session and API key authentication
 */
export function withAuth<T extends object = object>(
  handler: (
    request: NextRequest,
    context: ApiContext,
    routeContext: T
  ) => Promise<NextResponse>
) {
  return async (request: NextRequest, routeContext: T) => {
    const result = await getApiContext(request);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return handler(request, result.context, routeContext);
  };
}

/**
 * Higher-order function wrapper for API routes that require tenant admin access
 * For session auth: requires manager or owner role
 * For API key auth: requires team:manage scope
 */
export function withTenantAdmin<T extends object = object>(
  handler: (
    request: NextRequest,
    context: ApiContext,
    routeContext: T
  ) => Promise<NextResponse>
) {
  return async (request: NextRequest, routeContext: T) => {
    const result = await getApiContext(request);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    // For session auth, check tenant role
    if (result.context.authSource === "session") {
      const role = result.context.tenantRole;
      if (role !== "owner" && role !== "manager") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } else {
      // For API key auth, check for team:manage scope
      if (!hasApiKeyScope(result.context, "team:manage")) {
        return NextResponse.json(
          { error: "API key lacks required scope: team:manage" },
          { status: 403 }
        );
      }
    }

    return handler(request, result.context, routeContext);
  };
}

/**
 * Higher-order function wrapper for API routes that require system admin access
 * Only works with session auth
 */
export function withAdmin<T extends object = object>(
  handler: (
    request: NextRequest,
    context: ApiContext,
    routeContext: T
  ) => Promise<NextResponse>
) {
  return async (request: NextRequest, routeContext: T) => {
    const result = await getApiContext(request);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    // Admin access requires session auth with admin role
    if (result.context.authSource !== "session") {
      return NextResponse.json(
        { error: "Admin access requires session authentication" },
        { status: 403 }
      );
    }

    if (result.context.userRole !== "admin" && result.context.userRole !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return handler(request, result.context, routeContext);
  };
}

/**
 * Type helper for route handlers with params
 */
export type RouteContext<T extends Record<string, string>> = {
  params: Promise<T>;
};

/**
 * Check if user has tenant owner role
 */
export function isTenantOwner(context: ApiContext): boolean {
  return context.authSource === "session" && context.tenantRole === "owner";
}

/**
 * Check if API key context has a specific scope.
 * For session auth, always returns true (session permissions are handled separately).
 * For legacy API keys (empty scopes array), returns true for backwards compatibility.
 */
export function hasApiKeyScope(context: ApiContext, scope: ApiKeyScope): boolean {
  if (context.authSource === "session") {
    return true; // Session auth doesn't use scopes
  }
  // Legacy keys with empty/undefined scopes have full access
  if (!context.keyScopes || context.keyScopes.length === 0) {
    return true;
  }
  return context.keyScopes.includes(scope);
}

/**
 * Check if API key context has any of the specified scopes.
 * For session auth, always returns true.
 */
export function hasAnyApiKeyScope(context: ApiContext, scopes: ApiKeyScope[]): boolean {
  if (context.authSource === "session") {
    return true;
  }
  // Legacy keys with empty/undefined scopes have full access
  if (!context.keyScopes || context.keyScopes.length === 0) {
    return true;
  }
  return scopes.some((scope) => context.keyScopes!.includes(scope));
}

/**
 * Check if user has tenant admin access (owner or manager)
 * For API keys, checks for team:manage scope
 */
export function hasTenantAdminAccess(context: ApiContext): boolean {
  if (context.authSource === "apikey") {
    return hasApiKeyScope(context, "team:manage");
  }
  return context.tenantRole === "owner" || context.tenantRole === "manager";
}

/**
 * Check if user has system admin role
 */
export function isSystemAdmin(context: ApiContext): boolean {
  return (
    context.authSource === "session" &&
    (context.userRole === "admin" || context.userRole === "super_admin")
  );
}

/**
 * Check if user is super admin
 */
export function isSuperAdmin(context: ApiContext): boolean {
  return context.authSource === "session" && context.userRole === "super_admin";
}

/**
 * Create a tenant-scoped where clause helper for Drizzle queries
 * Usage: where(and(eq(table.id, id), ...tenantScope(table, ctx)))
 */
export function tenantScope<T extends { tenantId: unknown }>(
  table: T,
  context: ApiContext,
  eq: (col: unknown, val: string) => unknown
): unknown[] {
  return [eq(table.tenantId, context.tenantId)];
}

/**
 * Higher-order function wrapper for tenant owner-only operations
 * Only works with session auth
 */
export function withTenantOwner<T extends object = object>(
  handler: (
    request: NextRequest,
    context: ApiContext,
    routeContext: T
  ) => Promise<NextResponse>
) {
  return async (request: NextRequest, routeContext: T) => {
    const result = await getApiContext(request);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    if (!isTenantOwner(result.context)) {
      return NextResponse.json({ error: "Owner access required" }, { status: 403 });
    }

    return handler(request, result.context, routeContext);
  };
}
