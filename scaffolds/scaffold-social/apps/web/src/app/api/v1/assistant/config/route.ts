import { NextRequest, NextResponse } from "next/server";
import { getApiContext } from "@/lib/api-context";
import { db } from "@scaffold-social/database/client";
import * as schema from "@scaffold-social/database/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const configSchema = z.object({
  systemPrompt: z.string().max(2000).optional(),
  model: z.string().optional(),
  temperature: z.number().min(0).max(100).optional(),
  maxTokens: z.number().min(100).max(8192).optional(),
  dailyMessageLimit: z.number().nullable().optional(),
  dailyTokenLimit: z.number().nullable().optional(),
  injectUserContext: z
    .object({
      name: z.boolean(),
      email: z.boolean(),
      plan: z.boolean(),
    })
    .optional(),
  injectTenantContext: z
    .object({
      name: z.boolean(),
      settings: z.boolean(),
    })
    .optional(),
});

export async function GET(request: NextRequest) {
  try {
    const authResult = await getApiContext(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { tenantId } = authResult.context;

    const config = await db.query.assistantConfig.findFirst({
      where: eq(schema.assistantConfig.tenantId, tenantId),
    });

    return NextResponse.json({ data: config || null });
  } catch (error) {
    console.error("Get assistant config error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authResult = await getApiContext(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { tenantId, tenantRole, authSource } = authResult.context;

    // Only managers and owners can update config (session auth only)
    if (authSource === "session" && tenantRole !== "owner" && tenantRole !== "manager") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = configSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Check if config exists
    const existing = await db.query.assistantConfig.findFirst({
      where: eq(schema.assistantConfig.tenantId, tenantId),
    });

    if (existing) {
      // Update
      await db
        .update(schema.assistantConfig)
        .set({
          ...parsed.data,
          updatedAt: new Date(),
        })
        .where(eq(schema.assistantConfig.tenantId, tenantId));
    } else {
      // Create
      await db.insert(schema.assistantConfig).values({
        tenantId,
        ...parsed.data,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update assistant config error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
