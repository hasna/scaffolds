import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserTenants } from "@/lib/tenant";
import { db } from "@scaffold-social/database/client";
import * as schema from "@scaffold-social/database/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const createTenantSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  slug: z
    .string()
    .min(2, "URL must be at least 2 characters")
    .max(50)
    .regex(/^[a-z0-9-]+$/, "URL can only contain lowercase letters, numbers, and hyphens"),
});

/**
 * GET /api/v1/tenants
 * List all tenants (teams) the current user belongs to
 */
export async function GET(_request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const tenants = await getUserTenants(session.user.id);

    return NextResponse.json({
      tenants: tenants.map((t) => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        avatarUrl:
          "avatarUrl" in t ? ((t as { avatarUrl?: string | null }).avatarUrl ?? null) : null,
        plan: t.plan
          ? {
              id: t.plan.id,
              name: t.plan.name,
              slug: t.plan.slug,
            }
          : null,
        role: t.role,
        createdAt: t.createdAt,
      })),
    });
  } catch (error) {
    console.error("Error fetching user tenants:", error);
    return NextResponse.json({ error: "Failed to fetch tenants" }, { status: 500 });
  }
}

/**
 * POST /api/v1/tenants
 * Create a new tenant (team)
 */
export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = createTenantSchema.parse(body);

    // Check if slug is already taken
    const existingTenant = await db.query.tenants.findFirst({
      where: eq(schema.tenants.slug, data.slug),
    });

    if (existingTenant) {
      return NextResponse.json({ error: "This team URL is already taken" }, { status: 400 });
    }

    // Create tenant and add user as owner
    const [tenant] = await db
      .insert(schema.tenants)
      .values({
        name: data.name,
        slug: data.slug,
      })
      .returning();

    if (!tenant) {
      return NextResponse.json({ error: "Failed to create tenant" }, { status: 500 });
    }

    await db.insert(schema.teamMembers).values({
      tenantId: tenant.id,
      userId: session.user.id,
      role: "owner",
    });

    return NextResponse.json(
      {
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          avatarUrl: null,
          role: "owner",
          createdAt: tenant.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error creating tenant:", error);
    return NextResponse.json({ error: "Failed to create team" }, { status: 500 });
  }
}
