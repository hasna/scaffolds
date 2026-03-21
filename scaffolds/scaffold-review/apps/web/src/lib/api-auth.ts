import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@scaffold-review/database/client";
import * as schema from "@scaffold-review/database/schema";
import { eq, and, gt, isNull, or } from "drizzle-orm";
import type { ApiKeyScope } from "@scaffold-review/database/schema";

export interface ApiKeyContext {
  tenantId: string;
  userId: string;
  keyId: string;
  /** Scopes this API key has. Empty array means legacy key with full access. */
  scopes: ApiKeyScope[];
}

/**
 * Check if API key has a specific scope.
 * Empty scopes array means legacy key with full access (returns true for all scopes).
 */
export function hasScope(context: ApiKeyContext, scope: ApiKeyScope): boolean {
  // Legacy keys with empty scopes have full access for backwards compatibility
  if (context.scopes.length === 0) {
    return true;
  }
  return context.scopes.includes(scope);
}

/**
 * Check if API key has any of the specified scopes.
 */
export function hasAnyScope(context: ApiKeyContext, scopes: ApiKeyScope[]): boolean {
  // Legacy keys with empty scopes have full access
  if (context.scopes.length === 0) {
    return true;
  }
  return scopes.some((scope) => context.scopes.includes(scope));
}

/**
 * Check if API key has all of the specified scopes.
 */
export function hasAllScopes(context: ApiKeyContext, scopes: ApiKeyScope[]): boolean {
  // Legacy keys with empty scopes have full access
  if (context.scopes.length === 0) {
    return true;
  }
  return scopes.every((scope) => context.scopes.includes(scope));
}

function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

export async function validateApiKey(
  request: NextRequest
): Promise<ApiKeyContext | null> {
  const authHeader = request.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const apiKey = authHeader.slice(7);

  if (!apiKey.startsWith("sk_")) {
    return null;
  }

  const hashedKey = hashApiKey(apiKey);

  const key = await db.query.apiKeys.findFirst({
    where: and(
      eq(schema.apiKeys.keyHash, hashedKey),
      or(
        isNull(schema.apiKeys.expiresAt),
        gt(schema.apiKeys.expiresAt, new Date())
      )
    ),
  });

  if (!key) {
    return null;
  }

  // Update last used timestamp (fire and forget)
  db.update(schema.apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(schema.apiKeys.id, key.id))
    .catch(() => {});

  return {
    tenantId: key.tenantId,
    userId: key.userId,
    keyId: key.id,
    scopes: (key.scopes || []) as ApiKeyScope[],
  };
}

export function withApiAuth(
  handler: (
    request: NextRequest,
    context: ApiKeyContext
  ) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    const apiContext = await validateApiKey(request);

    if (!apiContext) {
      return NextResponse.json(
        { error: "Invalid or expired API key" },
        { status: 401 }
      );
    }

    return handler(request, apiContext);
  };
}
