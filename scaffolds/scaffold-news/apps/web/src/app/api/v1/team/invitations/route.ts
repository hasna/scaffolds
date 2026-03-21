import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { db } from "@scaffold-news/database/client";
import * as schema from "@scaffold-news/database/schema";
import { eq, and, isNull } from "drizzle-orm";
import { generateRandomString } from "@scaffold-news/utils";
import { checkTeamMemberLimit } from "@/lib/tenant";

const createInvitationSchema = z.object({
  email: z.string().email(),
  role: z.enum(["member", "manager"]).default("member"),
});

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

    const invitations = await db.query.teamInvitations.findMany({
      where: and(
        eq(schema.teamInvitations.tenantId, tenantId),
        isNull(schema.teamInvitations.acceptedAt)
      ),
      with: {
        inviter: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: (i, { desc }) => [desc(i.createdAt)],
    });

    return NextResponse.json({ data: invitations });
  } catch (error) {
    console.error("Get invitations error:", error);
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
    const parsed = createInvitationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { email, role } = parsed.data;

    // Check if user already exists in team
    const existingUser = await db.query.users.findFirst({
      where: eq(schema.users.email, email),
    });

    if (existingUser) {
      const existingMember = await db.query.teamMembers.findFirst({
        where: and(
          eq(schema.teamMembers.tenantId, tenantId),
          eq(schema.teamMembers.userId, existingUser.id)
        ),
      });

      if (existingMember) {
        return NextResponse.json({ error: "User already in team" }, { status: 400 });
      }
    }

    // Check for existing pending invitation
    const existingInvitation = await db.query.teamInvitations.findFirst({
      where: and(
        eq(schema.teamInvitations.tenantId, tenantId),
        eq(schema.teamInvitations.email, email),
        isNull(schema.teamInvitations.acceptedAt)
      ),
    });

    if (existingInvitation) {
      return NextResponse.json({ error: "Invitation already sent" }, { status: 400 });
    }

    // Check team member limits
    const limitCheck = await checkTeamMemberLimit(tenantId);
    if (!limitCheck.allowed) {
      return NextResponse.json(
        {
          error: "Team member limit reached",
          code: "UPGRADE_REQUIRED",
          details: {
            current: limitCheck.current,
            pending: limitCheck.pendingInvitations,
            limit: limitCheck.limit,
          },
        },
        { status: 403 }
      );
    }

    const token = generateRandomString(32);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    const [invitation] = await db
      .insert(schema.teamInvitations)
      .values({
        tenantId,
        email,
        role,
        token,
        invitedBy: session.user.id,
        expiresAt,
      })
      .returning();

    // TODO: Send invitation email via background job

    return NextResponse.json({ data: invitation }, { status: 201 });
  } catch (error) {
    console.error("Create invitation error:", error);
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
    const invitationId = searchParams.get("invitationId");

    if (!invitationId) {
      return NextResponse.json({ error: "Invitation ID required" }, { status: 400 });
    }

    await db
      .delete(schema.teamInvitations)
      .where(
        and(
          eq(schema.teamInvitations.id, invitationId),
          eq(schema.teamInvitations.tenantId, tenantId)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Revoke invitation error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
