import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getTeamMember, getTenant } from "@/lib/tenant";
import { cookies } from "next/headers";
import { z } from "zod";

const setActiveTenantSchema = z.object({
  tenantId: z.string().uuid(),
});

/**
 * GET /api/v1/tenants/active
 * Get the current active tenant
 */
export async function GET(_request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!session.user.tenantId) {
    return NextResponse.json({ tenant: null });
  }

  try {
    const tenant = await getTenant(session.user.tenantId);

    if (!tenant) {
      return NextResponse.json({ tenant: null });
    }

    return NextResponse.json({
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        avatarUrl: null,
        plan: tenant.plan
          ? {
              id: tenant.plan.id,
              name: tenant.plan.name,
              slug: tenant.plan.slug,
            }
          : null,
        role: session.user.tenantRole,
      },
    });
  } catch (error) {
    console.error("Error fetching active tenant:", error);
    return NextResponse.json(
      { error: "Failed to fetch active tenant" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/v1/tenants/active
 * Set the active tenant for the current session
 */
export async function PATCH(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { tenantId } = setActiveTenantSchema.parse(body);

    // Validate that user is a member of this tenant
    const membership = await getTeamMember(tenantId, session.user.id);

    if (!membership) {
      return NextResponse.json(
        { error: "You are not a member of this team" },
        { status: 403 }
      );
    }

    // Get tenant details
    const tenant = await getTenant(tenantId);

    if (!tenant) {
      return NextResponse.json(
        { error: "Team not found" },
        { status: 404 }
      );
    }

    // Store the active tenant in a cookie
    // The session callback in auth.ts will read this and update the session
    const cookieStore = await cookies();
    cookieStore.set("active-tenant-id", tenantId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    });

    return NextResponse.json({
      success: true,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        avatarUrl: null,
        plan: tenant.plan
          ? {
              id: tenant.plan.id,
              name: tenant.plan.name,
              slug: tenant.plan.slug,
            }
          : null,
        role: membership.role,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error setting active tenant:", error);
    return NextResponse.json(
      { error: "Failed to set active tenant" },
      { status: 500 }
    );
  }
}
