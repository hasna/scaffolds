import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@scaffold-review/database/client";
import * as schema from "@scaffold-review/database/schema";
import { eq, and } from "drizzle-orm";

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

    // Get tenant's subscription to determine plan
    const subscription = await db.query.subscriptions.findFirst({
      where: and(
        eq(schema.subscriptions.tenantId, tenantId),
        eq(schema.subscriptions.status, "active")
      ),
      with: {
        plan: true,
      },
    });

    // Get all feature flags
    const allFlags = await db.query.featureFlags.findMany();

    // Get plan features if subscription exists
    let planFeatures: typeof schema.planFeatures.$inferSelect[] = [];
    if (subscription?.planId) {
      planFeatures = await db.query.planFeatures.findMany({
        where: eq(schema.planFeatures.planId, subscription.planId),
      });
    }

    // Get tenant-specific overrides
    const tenantOverrides = await db.query.tenantFeatureOverrides.findMany({
      where: eq(schema.tenantFeatureOverrides.tenantId, tenantId),
    });

    // Build response with effective feature states
    const flags = allFlags.map((flag) => {
      // Check for tenant override first
      const override = tenantOverrides.find((o) => o.featureFlagId === flag.id);
      if (override) {
        // Check if override is expired
        if (!override.expiresAt || new Date(override.expiresAt) > new Date()) {
          return {
            key: flag.key,
            name: flag.name,
            enabled: override.enabled,
            limits: override.limits as Record<string, number> | undefined,
          };
        }
      }

      // Check plan features
      const planFeature = planFeatures.find((pf) => pf.featureFlagId === flag.id);
      if (planFeature) {
        return {
          key: flag.key,
          name: flag.name,
          enabled: planFeature.enabled,
          limits: planFeature.limits as Record<string, number> | undefined,
        };
      }

      // Fall back to default
      return {
        key: flag.key,
        name: flag.name,
        enabled: flag.defaultEnabled,
        limits: undefined,
      };
    });

    return NextResponse.json({ data: flags });
  } catch (error) {
    console.error("Get feature flags error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
