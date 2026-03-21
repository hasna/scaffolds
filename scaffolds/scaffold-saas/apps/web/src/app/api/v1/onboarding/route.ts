import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { db } from "@scaffold-saas/database/client";
import * as schema from "@scaffold-saas/database/schema";
import { eq } from "drizzle-orm";

const onboardingSchema = z.object({
  teamName: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user already has a tenant
    const existingMembership = await db.query.teamMembers.findFirst({
      where: eq(schema.teamMembers.userId, session.user.id),
    });

    if (existingMembership) {
      return NextResponse.json({ error: "Already part of a team" }, { status: 400 });
    }

    const body = await request.json();
    const parsed = onboardingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { teamName, slug } = parsed.data;

    // Check if slug is already taken
    const existingTenant = await db.query.tenants.findFirst({
      where: eq(schema.tenants.slug, slug),
    });

    if (existingTenant) {
      return NextResponse.json({ error: "Team URL already taken" }, { status: 400 });
    }

    // Create tenant and add user as owner
    const [tenant] = await db
      .insert(schema.tenants)
      .values({
        name: teamName,
        slug,
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

    return NextResponse.json({ data: tenant }, { status: 201 });
  } catch (error) {
    console.error("Onboarding error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
