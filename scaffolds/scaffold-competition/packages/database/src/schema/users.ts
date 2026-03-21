import { pgTable, uuid, varchar, text, timestamp, boolean, pgEnum, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { accounts, sessions, apiKeys } from "./auth";
import { auditLogs, notifications } from "./audit";

export const userRoleEnum = pgEnum("user_role", ["user", "admin", "super_admin"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
  passwordHash: text("password_hash"),
  name: varchar("name", { length: 255 }),
  avatarUrl: text("avatar_url"),
  role: userRoleEnum("role").notNull().default("user"),
  twoFactorEnabled: boolean("two_factor_enabled").notNull().default(false),
  twoFactorSecret: text("two_factor_secret"),
  isDisabled: boolean("is_disabled").notNull().default(false),
  disabledAt: timestamp("disabled_at", { withTimezone: true }),
  notificationPreferences: jsonb("notification_preferences").$type<NotificationPreferences>().default({
    email: true,
    marketing: false,
    updates: true,
    security: true,
  }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  apiKeys: many(apiKeys),
  auditLogs: many(auditLogs),
  notifications: many(notifications),
}));

export interface NotificationPreferences {
  email: boolean;
  marketing: boolean;
  updates: boolean;
  security: boolean;
}

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type UserRole = "user" | "admin" | "super_admin";
