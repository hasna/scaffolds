import NextAuth, { type DefaultSession } from "next-auth";
import type { JWT } from "next-auth/jwt";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import Credentials from "next-auth/providers/credentials";
import { db } from "@scaffold-review/database/client";
import * as schema from "@scaffold-review/database/schema";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { cookies } from "next/headers";
import { authConfig } from "./auth.config";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      role: "user" | "admin" | "super_admin";
      tenantId?: string;
      tenantRole?: "member" | "manager" | "owner";
    } & DefaultSession["user"];
  }

  interface User {
    role: "user" | "admin" | "super_admin";
  }
}

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  adapter: DrizzleAdapter(db, {
    usersTable: schema.users as never,
    accountsTable: schema.accounts as never,
    sessionsTable: schema.sessions as never,
    verificationTokensTable: schema.verificationTokens as never,
  }) as never,
  providers: [
    // Keep Google, GitHub, Resend from base config; override Credentials with DB-enabled version
    ...authConfig.providers.filter((p) => p.name !== "Credentials"),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }

        const { email, password } = parsed.data;

        const user = await db.query.users.findFirst({
          where: eq(schema.users.email, email),
        });

        if (!user?.passwordHash) {
          return null;
        }

        const isValidPassword = await bcrypt.compare(password, user.passwordHash);
        if (!isValidPassword) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.avatarUrl,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user, trigger, session }) {
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
        return typedToken;
      }

      // Get user ID from token or user
      const userId = user?.id ?? typedToken.id;
      if (!userId) {
        return typedToken;
      }

      // Validate membership on every request to handle revoked access
      try {
        const cookieStore = await cookies();
        const activeTenantId = cookieStore.get("active-tenant-id")?.value;

        // Determine which tenant to validate (cookie takes precedence)
        const targetTenantId = activeTenantId ?? typedToken.tenantId;

        if (targetTenantId) {
          // Verify user is still a member of this tenant
          const membership = await db.query.teamMembers.findFirst({
            where: and(
              eq(schema.teamMembers.userId, userId),
              eq(schema.teamMembers.tenantId, targetTenantId)
            ),
          });

          if (membership) {
            // Update token with current membership (role may have changed)
            typedToken.tenantId = membership.tenantId;
            typedToken.tenantRole = membership.role;
          } else {
            // Membership revoked - clear tenant from token
            typedToken.tenantId = undefined;
            typedToken.tenantRole = undefined;
          }
          return typedToken;
        }
      } catch {
        // Cookie access may fail in some contexts, continue with existing token
      }

      // On initial sign-in only, set default tenant if none in token
      if (user?.id && !typedToken.tenantId) {
        const membership = await db.query.teamMembers.findFirst({
          where: eq(schema.teamMembers.userId, user.id),
          orderBy: (tm, { desc }) => [desc(tm.joinedAt)],
        });

        if (membership) {
          typedToken.tenantId = membership.tenantId;
          typedToken.tenantRole = membership.role;
        }
      }

      return typedToken;
    },
    async signIn({ user, account }) {
      // Check if email is verified for credentials provider
      if (account?.provider === "credentials") {
        if (!user.id) {
          return false;
        }
        const dbUser = await db.query.users.findFirst({
          where: eq(schema.users.id, user.id),
        });
        if (dbUser && !dbUser.emailVerifiedAt) {
          return "/login?error=email-not-verified";
        }
      }
      return true;
    },
  },
  events: {
    async createUser({ user }) {
      // Create a default tenant for new users
      if (user.id && user.email) {
        const slug =
          user.email
            .split("@")[0]
            ?.toLowerCase()
            .replace(/[^a-z0-9]/g, "-") ?? user.id;

        const [tenant] = await db
          .insert(schema.tenants)
          .values({
            name: user.name ?? "My Team",
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
      }
    },
  },
});
