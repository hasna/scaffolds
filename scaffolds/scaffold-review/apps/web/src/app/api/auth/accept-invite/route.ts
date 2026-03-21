import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@scaffold-review/database/client";
import * as schema from "@scaffold-review/database/schema";
import { eq, and, gt, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { checkTeamMemberLimit } from "@/lib/tenant";

const acceptInviteSchema = z.object({
  token: z.string(),
  name: z.string().min(2).optional(),
  password: z.string().min(8).optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = acceptInviteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { token, name, password } = parsed.data;

    // Find valid invitation
    const invitation = await db.query.teamInvitations.findFirst({
      where: and(
        eq(schema.teamInvitations.token, token),
        isNull(schema.teamInvitations.acceptedAt),
        gt(schema.teamInvitations.expiresAt, new Date())
      ),
    });

    if (!invitation) {
      return NextResponse.json(
        { error: "Invalid or expired invitation" },
        { status: 400 }
      );
    }

    const session = await auth();

    let userId: string;

    if (session?.user?.id) {
      // User is logged in - verify email matches
      if (session.user.email !== invitation.email) {
        return NextResponse.json(
          { error: "Invitation was sent to a different email" },
          { status: 400 }
        );
      }
      userId = session.user.id;
    } else {
      // User needs to create account
      if (!name || !password) {
        return NextResponse.json(
          { error: "Name and password required for new users" },
          { status: 400 }
        );
      }

      // Check if user already exists
      const existingUser = await db.query.users.findFirst({
        where: eq(schema.users.email, invitation.email),
      });

      if (existingUser) {
        return NextResponse.json(
          { error: "Please sign in with your existing account" },
          { status: 400 }
        );
      }

      // Create new user
      const hashedPassword = await bcrypt.hash(password, 12);

      const [newUser] = await db
        .insert(schema.users)
        .values({
          email: invitation.email,
          name,
          passwordHash: hashedPassword,
          emailVerifiedAt: new Date(), // Auto-verify since they received the invite
        })
        .returning({ id: schema.users.id });

      userId = newUser!.id;
    }

    // Check if user is already a member of this team
    const existingMembership = await db.query.teamMembers.findFirst({
      where: and(
        eq(schema.teamMembers.tenantId, invitation.tenantId),
        eq(schema.teamMembers.userId, userId)
      ),
    });

    if (existingMembership) {
      // User is already a member - just mark invitation as accepted
      await db
        .update(schema.teamInvitations)
        .set({ acceptedAt: new Date() })
        .where(eq(schema.teamInvitations.id, invitation.id));

      return NextResponse.json({
        success: true,
        message: "You are already a member of this team",
      });
    }

    // Check team member limits (excluding this pending invitation since it's being accepted)
    const limitCheck = await checkTeamMemberLimit(invitation.tenantId);
    const totalAfterAccept = limitCheck.current + 1;

    if (limitCheck.limit !== null && totalAfterAccept > limitCheck.limit) {
      return NextResponse.json(
        {
          error: "Team member limit reached",
          code: "UPGRADE_REQUIRED",
          details: {
            current: limitCheck.current,
            limit: limitCheck.limit,
          },
        },
        { status: 403 }
      );
    }

    // Add user to team
    await db.insert(schema.teamMembers).values({
      tenantId: invitation.tenantId,
      userId,
      role: invitation.role,
      invitedBy: invitation.invitedBy,
    });

    // Mark invitation as accepted
    await db
      .update(schema.teamInvitations)
      .set({ acceptedAt: new Date() })
      .where(eq(schema.teamInvitations.id, invitation.id));

    // Get tenant details for the response
    const tenant = await db.query.tenants.findFirst({
      where: eq(schema.tenants.id, invitation.tenantId),
      columns: { id: true, name: true, slug: true },
    });

    // If user is logged in, switch them to the new tenant
    if (session?.user?.id) {
      const cookieStore = await cookies();
      cookieStore.set("active-tenant-id", invitation.tenantId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: "/",
      });
    }

    return NextResponse.json({
      success: true,
      tenant: tenant ? {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        role: invitation.role,
      } : null,
    });
  } catch (error) {
    console.error("Accept invite error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
