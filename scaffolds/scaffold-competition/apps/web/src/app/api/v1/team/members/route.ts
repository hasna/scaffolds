import { NextRequest, NextResponse } from "next/server";
import { getApiContext, isTenantOwner, hasTenantAdminAccess } from "@/lib/api-context";
import { z } from "zod";
import { db } from "@scaffold-competition/database/client";
import * as schema from "@scaffold-competition/database/schema";
import { eq, and } from "drizzle-orm";

const updateMemberSchema = z.object({
  memberId: z.string(),
  role: z.enum(["member", "manager"]),
});

export async function GET(request: NextRequest) {
  try {
    const authResult = await getApiContext(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { tenantId } = authResult.context;

    const members = await db.query.teamMembers.findMany({
      where: eq(schema.teamMembers.tenantId, tenantId),
      with: {
        user: {
          columns: {
            id: true,
            email: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: (m, { desc }) => [desc(m.joinedAt)],
    });

    return NextResponse.json({ data: members });
  } catch (error) {
    console.error("Get team members error:", error);
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

    if (!isTenantOwner(authResult.context)) {
      return NextResponse.json({ error: "Only owners can update roles" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = updateMemberSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { memberId, role } = parsed.data;

    // Check if target is owner (can't change owner's role)
    const targetMember = await db.query.teamMembers.findFirst({
      where: and(
        eq(schema.teamMembers.id, memberId),
        eq(schema.teamMembers.tenantId, tenantId)
      ),
    });

    if (!targetMember) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    if (targetMember.role === "owner") {
      return NextResponse.json({ error: "Cannot change owner's role" }, { status: 400 });
    }

    const [updated] = await db
      .update(schema.teamMembers)
      .set({ role })
      .where(eq(schema.teamMembers.id, memberId))
      .returning();

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("Update team member error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authResult = await getApiContext(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { tenantId, tenantRole } = authResult.context;

    if (!hasTenantAdminAccess(authResult.context)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get("memberId");

    if (!memberId) {
      return NextResponse.json({ error: "Member ID required" }, { status: 400 });
    }

    // Check if target is owner (can't remove owner)
    const targetMember = await db.query.teamMembers.findFirst({
      where: and(
        eq(schema.teamMembers.id, memberId),
        eq(schema.teamMembers.tenantId, tenantId)
      ),
    });

    if (!targetMember) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    if (targetMember.role === "owner") {
      return NextResponse.json({ error: "Cannot remove owner" }, { status: 400 });
    }

    // Managers can only remove members, not other managers
    if (tenantRole === "manager" && targetMember.role === "manager") {
      return NextResponse.json({ error: "Managers cannot remove other managers" }, { status: 403 });
    }

    await db
      .delete(schema.teamMembers)
      .where(eq(schema.teamMembers.id, memberId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Remove team member error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
