import NextAuth, { type DefaultSession } from "next-auth";
import type { JWT } from "next-auth/jwt";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import Credentials from "next-auth/providers/credentials";
import { db } from "@scaffold-competition/database/client";
import * as schema from "@scaffold-competition/database/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { authConfig } from "./auth.config";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      role: "user" | "admin" | "super_admin";
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
    async jwt({ token, user }) {
      const typedToken = token as JWT & {
        id?: string;
        role?: "user" | "admin" | "super_admin";
      };

      if (user) {
        typedToken.id = user.id;
        typedToken.role = user.role;
      }

      return typedToken;
    },
    async session({ session, token }) {
      const typedToken = token as JWT & {
        id?: string;
        role?: "user" | "admin" | "super_admin";
      };

      if (typedToken.id) {
        session.user.id = typedToken.id;
      }
      if (typedToken.role) {
        session.user.role = typedToken.role;
      }

      return session;
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
});
