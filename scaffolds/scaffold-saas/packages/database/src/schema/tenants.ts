import { pgTable, uuid, varchar, jsonb, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { pricingPlans, subscriptions } from "./billing";
import { teamMembers } from "./team-members";
import { webhooks } from "./webhooks";
import { assistantThreads, assistantUsage } from "./assistant";
import { auditLogs } from "./audit";

export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  planId: uuid("plan_id").references(() => pricingPlans.id),
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }).unique(),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }).unique(),
  settings: jsonb("settings").$type<TenantSettings>().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const tenantsRelations = relations(tenants, ({ one, many }) => ({
  plan: one(pricingPlans, {
    fields: [tenants.planId],
    references: [pricingPlans.id],
  }),
  subscription: one(subscriptions, {
    fields: [tenants.id],
    references: [subscriptions.tenantId],
  }),
  teamMembers: many(teamMembers),
  webhooks: many(webhooks),
  assistantThreads: many(assistantThreads),
  assistantUsage: many(assistantUsage),
  auditLogs: many(auditLogs),
}));

export interface TenantSettings {
  logoUrl?: string;
  primaryColor?: string;
  timezone?: string;
  locale?: string;
  assistantSystemPrompt?: string;
  [key: string]: unknown;
}

export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;
