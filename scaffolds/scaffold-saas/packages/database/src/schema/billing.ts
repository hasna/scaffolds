import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { tenants } from "./tenants";

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active",
  "canceled",
  "past_due",
  "trialing",
  "incomplete",
]);

export const pricingPlans = pgTable("pricing_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  description: text("description"),
  priceMonthly: integer("price_monthly").notNull(), // in cents
  priceYearly: integer("price_yearly").notNull(), // in cents
  stripePriceIdMonthly: varchar("stripe_price_id_monthly", { length: 255 }),
  stripePriceIdYearly: varchar("stripe_price_id_yearly", { length: 255 }),
  features: jsonb("features").$type<PlanFeature[]>().default([]),
  limits: jsonb("limits").$type<PlanLimits>().default({}),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const pricingPlansRelations = relations(pricingPlans, ({ many }) => ({
  tenants: many(tenants),
  subscriptions: many(subscriptions),
}));

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" })
    .unique(),
  planId: uuid("plan_id")
    .notNull()
    .references(() => pricingPlans.id),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }).unique(),
  status: subscriptionStatusEnum("status").notNull().default("active"),
  currentPeriodStart: timestamp("current_period_start", { withTimezone: true }).notNull(),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }).notNull(),
  trialEnd: timestamp("trial_end", { withTimezone: true }),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
  canceledAt: timestamp("canceled_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  tenant: one(tenants, {
    fields: [subscriptions.tenantId],
    references: [tenants.id],
  }),
  plan: one(pricingPlans, {
    fields: [subscriptions.planId],
    references: [pricingPlans.id],
  }),
}));

export const invoices = pgTable("invoices", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  stripeInvoiceId: varchar("stripe_invoice_id", { length: 255 }).unique(),
  amount: integer("amount").notNull(), // in cents
  currency: varchar("currency", { length: 3 }).notNull().default("usd"),
  status: varchar("status", { length: 50 }).notNull(),
  pdfUrl: text("pdf_url"),
  hostedInvoiceUrl: text("hosted_invoice_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  paidAt: timestamp("paid_at", { withTimezone: true }),
});

export const invoicesRelations = relations(invoices, ({ one }) => ({
  tenant: one(tenants, {
    fields: [invoices.tenantId],
    references: [tenants.id],
  }),
}));

export interface PlanFeature {
  name: string;
  included: boolean;
  limit?: number;
}

export interface PlanLimits {
  teamMembers?: number;
  apiKeys?: number;
  webhooks?: number;
  assistantMessages?: number;
  storageGb?: number;
  [key: string]: number | undefined;
}

export type PricingPlan = typeof pricingPlans.$inferSelect;
export type NewPricingPlan = typeof pricingPlans.$inferInsert;
export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
export type SubscriptionStatus = "active" | "canceled" | "past_due" | "trialing" | "incomplete";
export type Invoice = typeof invoices.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;
