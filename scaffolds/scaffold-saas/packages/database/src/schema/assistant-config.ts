import { pgTable, uuid, text, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { tenants } from "./tenants";

// Assistant configuration per tenant
export const assistantConfig = pgTable("assistant_config", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .unique()
    .references(() => tenants.id, { onDelete: "cascade" }),

  // System prompt customization
  systemPrompt: text("system_prompt"),

  // Model settings
  model: text("model").default("gpt-4o-mini"),
  temperature: integer("temperature").default(70), // Stored as 0-100, convert to 0-1
  maxTokens: integer("max_tokens").default(2048),

  // Rate limits (overrides plan limits if set)
  dailyMessageLimit: integer("daily_message_limit"),
  dailyTokenLimit: integer("daily_token_limit"),

  // Context injection settings
  injectUserContext: jsonb("inject_user_context").default({ name: true, email: false, plan: true }),
  injectTenantContext: jsonb("inject_tenant_context").default({ name: true, settings: false }),

  // Feature toggles
  enableCodeExecution: jsonb("enable_code_execution").default(false),
  enableWebSearch: jsonb("enable_web_search").default(false),
  enableFileUpload: jsonb("enable_file_upload").default(false),

  // Knowledge base
  knowledgeBaseIds: jsonb("knowledge_base_ids").default([]),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Relations
export const assistantConfigRelations = relations(assistantConfig, ({ one }) => ({
  tenant: one(tenants, {
    fields: [assistantConfig.tenantId],
    references: [tenants.id],
  }),
}));

// Type exports
export type AssistantConfig = typeof assistantConfig.$inferSelect;
export type NewAssistantConfig = typeof assistantConfig.$inferInsert;
