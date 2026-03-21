import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { db } from "@scaffold-saas/database/client";
import * as schema from "@scaffold-saas/database/schema";
import { eq } from "drizzle-orm";

const updateUserSchema = z.object({
  action: z.enum(["disable", "make-admin"]),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const session = await auth();
    if (
      !session?.user?.id ||
      (session.user.role !== "admin" && session.user.role !== "super_admin")
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { userId } = await params;
    const body = await request.json();
    const parsed = updateUserSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { action } = parsed.data;

    // Prevent self-modification
    if (userId === session.user.id) {
      return NextResponse.json({ error: "Cannot modify your own account" }, { status: 400 });
    }

    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, userId),
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (action === "make-admin") {
      const newRole = user.role === "admin" ? "user" : "admin";
      await db
        .update(schema.users)
        .set({ role: newRole, updatedAt: new Date() })
        .where(eq(schema.users.id, userId));
    } else if (action === "disable") {
      const isDisabled = !user.isDisabled;
      await db
        .update(schema.users)
        .set({
          isDisabled,
          disabledAt: isDisabled ? new Date() : null,
          updatedAt: new Date(),
        })
        .where(eq(schema.users.id, userId));

      // If disabling, invalidate all user sessions
      if (isDisabled) {
        await db.delete(schema.sessions).where(eq(schema.sessions.userId, userId));
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin update user error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await auth();
    if (
      !session?.user?.id ||
      (session.user.role !== "admin" && session.user.role !== "super_admin")
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { userId } = await params;

    // Prevent self-deletion
    if (userId === session.user.id) {
      return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
    }

    // Delete user's related data
    await db.delete(schema.sessions).where(eq(schema.sessions.userId, userId));
    await db.delete(schema.accounts).where(eq(schema.accounts.userId, userId));
    await db.delete(schema.teamMembers).where(eq(schema.teamMembers.userId, userId));
    await db.delete(schema.users).where(eq(schema.users.id, userId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin delete user error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
