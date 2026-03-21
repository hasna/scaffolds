import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@scaffold-saas/database/client";
import * as schema from "@scaffold-saas/database/schema";
import { eq, gt, and } from "drizzle-orm";
import bcrypt from "bcryptjs";

const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(8),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = resetPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { token, password } = parsed.data;

    // Find valid reset token
    const resetToken = await db.query.passwordResetTokens.findFirst({
      where: and(
        eq(schema.passwordResetTokens.token, token),
        gt(schema.passwordResetTokens.expiresAt, new Date())
      ),
    });

    if (!resetToken) {
      return NextResponse.json(
        { error: "Invalid or expired reset link" },
        { status: 400 }
      );
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Update user's password
    await db
      .update(schema.users)
      .set({
        passwordHash: hashedPassword,
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, resetToken.userId));

    // Delete the reset token
    await db
      .delete(schema.passwordResetTokens)
      .where(eq(schema.passwordResetTokens.id, resetToken.id));

    // Delete all sessions for this user (force re-login)
    await db
      .delete(schema.sessions)
      .where(eq(schema.sessions.userId, resetToken.userId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
