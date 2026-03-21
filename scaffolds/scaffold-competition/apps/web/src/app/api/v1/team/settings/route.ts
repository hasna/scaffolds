import { NextRequest, NextResponse } from "next/server";
import { getApiContext, hasTenantAdminAccess } from "@/lib/api-context";
import { z } from "zod";
import { db } from "@scaffold-competition/database/client";
import * as schema from "@scaffold-competition/database/schema";
import { eq } from "drizzle-orm";

const updateTeamSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
});

export async function GET(request: NextRequest) {
  try {
    const authResult = await getApiContext(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { tenantId } = authResult.context;

    const tenant = await db.query.tenants.findFirst({
      where: eq(schema.tenants.id, tenantId),
    });

    return NextResponse.json({ data: tenant });
  } catch (error) {
    console.error("Get team settings error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authResult = await getApiContext(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { tenantId } = authResult.context;

    if (!hasTenantAdminAccess(authResult.context)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = updateTeamSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, slug } = parsed.data;

    // Check if slug is already taken by another tenant
    const existingTenant = await db.query.tenants.findFirst({
      where: eq(schema.tenants.slug, slug),
    });

    if (existingTenant && existingTenant.id !== tenantId) {
      return NextResponse.json({ error: "Slug already taken" }, { status: 400 });
    }

    const [updated] = await db
      .update(schema.tenants)
      .set({ name, slug, updatedAt: new Date() })
      .where(eq(schema.tenants.id, tenantId))
      .returning();

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("Update team settings error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
