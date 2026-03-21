import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { db } from "@scaffold-review/database/client";
import * as schema from "@scaffold-review/database/schema";
import { API_KEY_SCOPES, type ApiKeyScope } from "@scaffold-review/database/schema";
import { eq, and } from "drizzle-orm";
import { generateRandomString } from "@scaffold-review/utils";
import crypto from "crypto";
import { checkApiKeyLimit } from "@/lib/tenant";

const createApiKeySchema = z.object({
  name: z.string().min(2).max(100),
  expiresAt: z.string().datetime().optional(),
  scopes: z.array(z.enum(API_KEY_SCOPES as unknown as [string, ...string[]])).optional(),
});

function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = session.user.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant" }, { status: 400 });
    }

    const apiKeys = await db.query.apiKeys.findMany({
      where: eq(schema.apiKeys.tenantId, tenantId),
      columns: {
        id: true,
        name: true,
        keyPrefix: true,
        scopes: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: (k, { desc }) => [desc(k.createdAt)],
    });

    return NextResponse.json({ data: apiKeys });
  } catch (error) {
    console.error("Get API keys error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = session.user.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant" }, { status: 400 });
    }

    if (session.user.tenantRole !== "owner" && session.user.tenantRole !== "manager") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createApiKeySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, expiresAt, scopes } = parsed.data;

    // Check API key limits
    const limitCheck = await checkApiKeyLimit(tenantId);
    if (!limitCheck.allowed) {
      return NextResponse.json(
        {
          error: "API key limit reached",
          code: "UPGRADE_REQUIRED",
          details: {
            current: limitCheck.current,
            limit: limitCheck.limit,
          },
        },
        { status: 403 }
      );
    }

    // Generate API key: prefix_randomstring
    const prefix = "sk_live";
    const secret = generateRandomString(32);
    const fullKey = `${prefix}_${secret}`;
    const hashedKey = hashApiKey(fullKey);

    // Default to empty scopes (legacy full access) if not provided
    const keyScopes = scopes || [];

    const [apiKey] = await db
      .insert(schema.apiKeys)
      .values({
        tenantId,
        userId: session.user.id,
        name,
        keyPrefix: prefix,
        keyHash: hashedKey,
        scopes: keyScopes as ApiKeyScope[],
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      })
      .returning({
        id: schema.apiKeys.id,
        name: schema.apiKeys.name,
        keyPrefix: schema.apiKeys.keyPrefix,
        createdAt: schema.apiKeys.createdAt,
      });

    // Return the full key only once - it won't be shown again
    return NextResponse.json(
      {
        data: {
          ...apiKey,
          key: fullKey, // Only returned on creation
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create API key error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = session.user.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant" }, { status: 400 });
    }

    if (session.user.tenantRole !== "owner" && session.user.tenantRole !== "manager") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const keyId = searchParams.get("keyId");

    if (!keyId) {
      return NextResponse.json({ error: "Key ID required" }, { status: 400 });
    }

    await db
      .delete(schema.apiKeys)
      .where(
        and(
          eq(schema.apiKeys.id, keyId),
          eq(schema.apiKeys.tenantId, tenantId)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete API key error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
