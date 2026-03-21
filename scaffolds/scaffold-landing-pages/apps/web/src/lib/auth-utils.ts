import { redirect } from "next/navigation";
import { auth } from "./auth";
import { db } from "@scaffold-landing-pages/database/client";
import * as schema from "@scaffold-landing-pages/database/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import crypto from "crypto";

/**
 * Get the current session or redirect to login
 */
export async function requireAuth() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  return session;
}

/**
 * Get the current session or return null
 */
export async function getSession() {
  return auth();
}

/**
 * Check if user has a specific role
 */
export async function requireRole(role: "admin" | "super_admin") {
  const session = await requireAuth();
  if (session.user.role !== role && session.user.role !== "super_admin") {
    redirect("/dashboard");
  }
  return session;
}

/**
 * Hash a password
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

/**
 * Verify a password
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate a secure random token
 */
export function generateToken(length: number = 32): string {
  return crypto.randomBytes(length).toString("hex");
}

/**
 * Generate email verification token
 */
export async function createEmailVerificationToken(email: string): Promise<string> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  await db.insert(schema.verificationTokens).values({
    identifier: email,
    token,
    expiresAt,
  });

  return token;
}

/**
 * Verify email verification token
 */
export async function verifyEmailToken(token: string): Promise<string | null> {
  const verificationToken = await db.query.verificationTokens.findFirst({
    where: eq(schema.verificationTokens.token, token),
  });

  if (!verificationToken || verificationToken.expiresAt < new Date()) {
    return null;
  }

  // Delete the token after use
  await db
    .delete(schema.verificationTokens)
    .where(eq(schema.verificationTokens.token, token));

  return verificationToken.identifier;
}

/**
 * Create password reset token
 */
export async function createPasswordResetToken(userId: string): Promise<string> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await db.insert(schema.passwordResetTokens).values({
    userId,
    token,
    expiresAt,
  });

  return token;
}

/**
 * Verify password reset token
 */
export async function verifyPasswordResetToken(token: string): Promise<string | null> {
  const resetToken = await db.query.passwordResetTokens.findFirst({
    where: eq(schema.passwordResetTokens.token, token),
  });

  if (!resetToken || resetToken.expiresAt < new Date() || resetToken.usedAt) {
    return null;
  }

  return resetToken.userId;
}

/**
 * Mark password reset token as used
 */
export async function markPasswordResetTokenUsed(token: string): Promise<void> {
  await db
    .update(schema.passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(eq(schema.passwordResetTokens.token, token));
}

/**
 * Check if email is in admin list
 */
export function isAdminEmail(email: string): boolean {
  const adminEmails = process.env.ADMIN_EMAILS?.split(",").map((e) => e.trim().toLowerCase()) ?? [];
  return adminEmails.includes(email.toLowerCase());
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number");
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push("Password must contain at least one special character");
  }

  return { valid: errors.length === 0, errors };
}
