/**
 * CSRF Protection utilities
 * Note: NextAuth.js v5 handles CSRF for auth routes automatically.
 * This module provides additional CSRF protection for custom routes.
 */

import { cookies } from "next/headers";
import { type NextRequest } from "next/server";

const CSRF_TOKEN_NAME = "csrf_token";
const CSRF_HEADER_NAME = "x-csrf-token";
const CSRF_TOKEN_LENGTH = 32;

/**
 * Generate a cryptographically secure random token
 */
function generateToken(length: number): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Generate a new CSRF token and store it in cookies
 */
export async function generateCsrfToken(): Promise<string> {
  const token = generateToken(CSRF_TOKEN_LENGTH);

  const cookieStore = await cookies();
  cookieStore.set(CSRF_TOKEN_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60, // 1 hour
    path: "/",
  });

  return token;
}

/**
 * Get the current CSRF token from cookies
 */
export async function getCsrfToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(CSRF_TOKEN_NAME)?.value;
}

/**
 * Validate CSRF token from request against stored token
 */
export async function validateCsrfToken(request: NextRequest): Promise<boolean> {
  // Get token from header
  const headerToken = request.headers.get(CSRF_HEADER_NAME);

  // Get token from form data (for form submissions)
  let formToken: string | null = null;
  const contentType = request.headers.get("content-type");

  if (contentType?.includes("application/x-www-form-urlencoded")) {
    try {
      const formData = await request.formData();
      formToken = formData.get(CSRF_TOKEN_NAME) as string | null;
    } catch {
      // Ignore form parsing errors
    }
  }

  const requestToken = headerToken ?? formToken;

  if (!requestToken) {
    return false;
  }

  // Get stored token from cookies
  const storedToken = await getCsrfToken();

  if (!storedToken) {
    return false;
  }

  // Constant-time comparison to prevent timing attacks
  return timingSafeEqual(requestToken, storedToken);
}

/**
 * Constant-time string comparison
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

/**
 * CSRF protection middleware for API routes
 * Only validates for state-changing methods (POST, PUT, PATCH, DELETE)
 */
export async function csrfProtection(
  request: NextRequest
): Promise<{ valid: boolean; error?: string }> {
  const safeOrigins = [process.env.NEXT_PUBLIC_APP_URL, process.env.NEXTAUTH_URL].filter(
    (value): value is string => Boolean(value)
  );

  // Skip CSRF for safe methods
  const safeMethods = ["GET", "HEAD", "OPTIONS"];
  if (safeMethods.includes(request.method)) {
    return { valid: true };
  }

  // Check Origin header
  const origin = request.headers.get("origin");
  if (origin && !safeOrigins.some((safe) => origin.startsWith(safe))) {
    return { valid: false, error: "Invalid origin" };
  }

  // Validate CSRF token
  const isValid = await validateCsrfToken(request);
  if (!isValid) {
    return { valid: false, error: "Invalid CSRF token" };
  }

  return { valid: true };
}

/**
 * Check if request is from a safe origin (same-site)
 */
export function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");

  if (!origin || !host) {
    return true; // Allow requests without origin (same-origin requests)
  }

  try {
    const originUrl = new URL(origin);
    return originUrl.host === host;
  } catch {
    return false;
  }
}
