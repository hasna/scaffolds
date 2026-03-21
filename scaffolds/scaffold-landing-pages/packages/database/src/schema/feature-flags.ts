import { pgTable, uuid, text, boolean, timestamp, jsonb, primaryKey } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { pricingPlans } from "./billing";
import { tenants } from "./tenants";

// Feature flags definition table
export const featureFlags = pgTable("feature_flags", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(), // e.g., "ai_assistant", "webhooks", "api_access"
  name: text("name").notNull(),
  description: text("description"),
  defaultEnabled: boolean("default_enabled").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Feature flags per plan mapping
export const planFeatures = pgTable(
  "plan_features",
  {
    planId: uuid("plan_id")
      .notNull()
      .references(() => pricingPlans.id, { onDelete: "cascade" }),
    featureFlagId: uuid("feature_flag_id")
      .notNull()
      .references(() => featureFlags.id, { onDelete: "cascade" }),
    enabled: boolean("enabled").default(true).notNull(),
    limits: jsonb("limits"), // e.g., { "max_requests": 1000, "max_tokens": 50000 }
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.planId, table.featureFlagId] }),
  })
);

// Tenant-specific feature overrides
export const tenantFeatureOverrides = pgTable(
  "tenant_feature_overrides",
  {
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    featureFlagId: uuid("feature_flag_id")
      .notNull()
      .references(() => featureFlags.id, { onDelete: "cascade" }),
    enabled: boolean("enabled").notNull(),
    limits: jsonb("limits"),
    reason: text("reason"), // Why this override exists
    expiresAt: timestamp("expires_at"), // Optional expiration
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.tenantId, table.featureFlagId] }),
  })
);

// Relations
export const featureFlagsRelations = relations(featureFlags, ({ many }) => ({
  planFeatures: many(planFeatures),
  tenantOverrides: many(tenantFeatureOverrides),
}));

export const planFeaturesRelations = relations(planFeatures, ({ one }) => ({
  plan: one(pricingPlans, {
    fields: [planFeatures.planId],
    references: [pricingPlans.id],
  }),
  featureFlag: one(featureFlags, {
    fields: [planFeatures.featureFlagId],
    references: [featureFlags.id],
  }),
}));

export const tenantFeatureOverridesRelations = relations(tenantFeatureOverrides, ({ one }) => ({
  tenant: one(tenants, {
    fields: [tenantFeatureOverrides.tenantId],
    references: [tenants.id],
  }),
  featureFlag: one(featureFlags, {
    fields: [tenantFeatureOverrides.featureFlagId],
    references: [featureFlags.id],
  }),
}));

// Type exports
export type FeatureFlag = typeof featureFlags.$inferSelect;
export type NewFeatureFlag = typeof featureFlags.$inferInsert;
export type PlanFeatureMapping = typeof planFeatures.$inferSelect;
export type NewPlanFeatureMapping = typeof planFeatures.$inferInsert;
export type TenantFeatureOverride = typeof tenantFeatureOverrides.$inferSelect;
export type NewTenantFeatureOverride = typeof tenantFeatureOverrides.$inferInsert;
