import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@scaffold-review/database/client";
import * as schema from "@scaffold-review/database/schema";
import { eq } from "drizzle-orm";
import { hashPassword, createEmailVerificationToken, isAdminEmail } from "@/lib/auth-utils";

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z
    .string()
    .min(8)
    .regex(/[A-Z]/)
    .regex(/[a-z]/)
    .regex(/[0-9]/)
    .regex(/[!@#$%^&*(),.?":{}|<>]/),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Invalid input", errors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, email, password } = parsed.data;

    // Check if user already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(schema.users.email, email),
    });

    if (existingUser) {
      return NextResponse.json(
        { message: "An account with this email already exists" },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Determine user role
    const role = isAdminEmail(email) ? "admin" : "user";

    // Create user
    const [user] = await db
      .insert(schema.users)
      .values({
        name,
        email,
        passwordHash,
        role,
      })
      .returning();

    if (!user) {
      return NextResponse.json({ message: "Failed to create account" }, { status: 500 });
    }

    // Create default tenant
    const slug =
      email
        .split("@")[0]
        ?.toLowerCase()
        .replace(/[^a-z0-9]/g, "-") ?? user.id;
    const [tenant] = await db
      .insert(schema.tenants)
      .values({
        name: name ?? "My Team",
        slug: `${slug}-${Date.now().toString(36)}`,
      })
      .returning();

    if (tenant) {
      await db.insert(schema.teamMembers).values({
        tenantId: tenant.id,
        userId: user.id,
        role: "owner",
      });
    }

    // Create verification token and send email
    const token = await createEmailVerificationToken(email);

    // In production, queue the email. In dev, log the token for testing.
    if (process.env.NODE_ENV === "production" && process.env.REDIS_URL) {
      // Dynamic import to avoid issues when Redis isn't configured
      const { Queue } = await import("bullmq");
      const { Redis } = await import("ioredis");
      const connection = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: null });
      const emailQueue = new Queue("email", { connection });
      await emailQueue.add("verify-email", {
        type: "email-verification",
        to: email,
        verificationToken: token,
      });
      await connection.quit();
    } else {
      // For development - log verification URL
      console.log(`Verify email: ${process.env.NEXT_PUBLIC_APP_URL}/verify-email?token=${token}`);
    }

    return NextResponse.json(
      { message: "Account created successfully. Please check your email to verify your account." },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 });
  }
}
