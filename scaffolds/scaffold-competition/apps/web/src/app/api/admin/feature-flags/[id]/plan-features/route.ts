import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@scaffold-competition/database/client";
import * as schema from "@scaffold-competition/database/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const updateSchema = z.object({
  planFeatures: z.record(
    z.string(),
    z.object({
      enabled: z.boolean(),
      limits: z.record(z.string(), z.number().optional()).optional(),
    })
  ),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin (you may want to add proper admin check)
    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, session.user.id),
    });

    if (!user || (user.role !== "admin" && user.role !== "super_admin")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: featureFlagId } = await params;

    // Verify feature flag exists
    const featureFlag = await db.query.featureFlags.findFirst({
      where: eq(schema.featureFlags.id, featureFlagId),
    });

    if (!featureFlag) {
      return NextResponse.json({ error: "Feature flag not found" }, { status: 404 });
    }

    const body = await request.json();
    const { planFeatures } = updateSchema.parse(body);

    // Update plan features for each plan
    for (const [planId, config] of Object.entries(planFeatures)) {
      // Clean up limits - remove undefined values
      const cleanLimits = config.limits
        ? Object.fromEntries(
            Object.entries(config.limits).filter(([, v]) => v !== undefined)
          )
        : null;

      await db
        .insert(schema.planFeatures)
        .values({
          planId,
          featureFlagId,
          enabled: config.enabled,
          limits: cleanLimits && Object.keys(cleanLimits).length > 0 ? cleanLimits : null,
        })
        .onConflictDoUpdate({
          target: [schema.planFeatures.planId, schema.planFeatures.featureFlagId],
          set: {
            enabled: config.enabled,
            limits: cleanLimits && Object.keys(cleanLimits).length > 0 ? cleanLimits : null,
          },
        });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request", details: error.issues }, { status: 400 });
    }
    console.error("Update plan features error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
