import { NextResponse } from "next/server";
import { z } from "zod";
import { Resend } from "resend";
import { db } from "@scaffold-landing-pages/database/client";
import * as schema from "@scaffold-landing-pages/database/schema";
import { eq } from "drizzle-orm";
import { createPasswordResetToken } from "@/lib/auth-utils";

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = forgotPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid email" }, { status: 400 });
    }

    const { email } = parsed.data;

    // Find user
    const user = await db.query.users.findFirst({
      where: eq(schema.users.email, email),
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({ message: "If an account exists, we sent a reset link" });
    }

    // Create reset token
    const token = await createPasswordResetToken(user.id);

    // Send reset email via Resend
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:5900";
    const fromEmail = process.env.AUTH_EMAIL_FROM ?? "noreply@example.com";
    const resetLink = `${appUrl}/reset-password?token=${token}`;

    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: fromEmail,
        to: email,
        subject: "Reset your password",
        html: `
          <p>You requested a password reset.</p>
          <p>Click the link below to reset your password. This link expires in 1 hour.</p>
          <p><a href="${resetLink}">Reset Password</a></p>
          <p>If you did not request this, you can safely ignore this email.</p>
        `,
      });
    } else {
      // Development fallback — log to console
      console.log("Password reset link:", resetLink);
    }

    return NextResponse.json({ message: "If an account exists, we sent a reset link" });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 });
  }
}
