import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@scaffold-social/database/client";
import * as schema from "@scaffold-social/database/schema";
import { eq } from "drizzle-orm";
import { verifyEmailToken } from "@/lib/auth-utils";

const verifyEmailSchema = z.object({
  token: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = verifyEmailSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { token } = parsed.data;

    // Verify the token and get the email
    const email = await verifyEmailToken(token);

    if (!email) {
      return NextResponse.json(
        { error: "Invalid or expired verification token" },
        { status: 400 }
      );
    }

    // Update the user's email verification status
    const result = await db
      .update(schema.users)
      .set({ emailVerifiedAt: new Date() })
      .where(eq(schema.users.email, email))
      .returning({ id: schema.users.id });

    if (result.length === 0) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Email verified successfully. You can now sign in.",
    });
  } catch (error) {
    console.error("Email verification error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// Also support GET for direct link verification
export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/login?error=missing-token", request.url));
  }

  const email = await verifyEmailToken(token);

  if (!email) {
    return NextResponse.redirect(new URL("/login?error=invalid-token", request.url));
  }

  await db
    .update(schema.users)
    .set({ emailVerifiedAt: new Date() })
    .where(eq(schema.users.email, email));

  return NextResponse.redirect(new URL("/login?verified=true", request.url));
}
