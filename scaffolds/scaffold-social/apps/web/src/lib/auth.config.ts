import type { NextAuthConfig } from "next-auth";
import type { JWT } from "next-auth/jwt";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import Resend from "next-auth/providers/resend";
import Credentials from "next-auth/providers/credentials";
/**
 * Edge-compatible auth configuration.
 * This config is used by middleware and doesn't include the database adapter.
 * The full auth config with adapter is in auth.ts
 */

export const authConfig: NextAuthConfig = {
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  pages: {
    signIn: "/login",
    error: "/login",
    newUser: "/onboarding",
  },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
    Resend({
      from: process.env.AUTH_EMAIL_FROM ?? "noreply@example.com",
    }),
    // Note: Credentials provider authorize function is handled in auth.ts
    // since it requires database access
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      // This authorize will be overridden in auth.ts
      authorize() {
        return null;
      },
    }),
  ],
  callbacks: {
    // JWT callback for middleware - just passes through existing token data
    jwt({ token, user, trigger, session }) {
      const typedToken = token as JWT & {
        id?: string;
        role?: "user" | "admin" | "super_admin";
        tenantId?: string;
        tenantRole?: "member" | "manager" | "owner";
      };

      if (user) {
        typedToken.id = user.id;
        typedToken.role = user.role;
      }

      // Handle session update (e.g., when switching tenants)
      if (trigger === "update" && session) {
        const sessionUpdate = session as {
          tenantId?: string;
          tenantRole?: "member" | "manager" | "owner";
        };
        typedToken.tenantId = sessionUpdate.tenantId;
        typedToken.tenantRole = sessionUpdate.tenantRole;
      }

      return typedToken;
    },
    session({ session, token }) {
      const typedToken = token as JWT & {
        id?: string;
        role?: "user" | "admin" | "super_admin";
        tenantId?: string;
        tenantRole?: "member" | "manager" | "owner";
      };

      if (token && session.user) {
        if (typedToken.id) {
          session.user.id = typedToken.id;
        }
        if (typedToken.role) {
          session.user.role = typedToken.role;
        }
        session.user.tenantId = typedToken.tenantId;
        session.user.tenantRole = typedToken.tenantRole;
      }
      return session;
    },
    // Authorize callback for middleware route protection
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;

      // Define public routes that don't require authentication
      const publicRoutes = [
        "/",
        "/login",
        "/register",
        "/forgot-password",
        "/reset-password",
        "/verify-email",
        "/pricing",
        "/privacy",
        "/terms",
        "/features",
        "/about",
        "/blog",
        "/contact",
        "/changelog",
        "/docs",
        "/cookies",
        "/dpa",
        "/security",
        "/acceptable-use",
        "/help",
        "/status",
      ];

      const isPublicRoute = publicRoutes.some(
        (route) => pathname === route || pathname.startsWith(`${route}/`)
      );

      // Allow public routes and API routes
      if (isPublicRoute || pathname.startsWith("/api")) {
        return true;
      }

      // Require authentication for protected routes
      return !!auth;
    },
  },
};
