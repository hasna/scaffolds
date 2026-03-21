import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  jsonb,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { tenants } from "./tenants";
import { users } from "./users";

export const messageRoleEnum = pgEnum("message_role", ["user", "assistant", "system"]);

export const assistantThreads = pgTable("assistant_threads", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }),
  model: varchar("model", { length: 100 }).notNull().default("gpt-4o"),
  systemPrompt: text("system_prompt"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const assistantThreadsRelations = relations(assistantThreads, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [assistantThreads.tenantId],
    references: [tenants.id],
  }),
  user: one(users, {
    fields: [assistantThreads.userId],
    references: [users.id],
  }),
  messages: many(assistantMessages),
}));

export const assistantMessages = pgTable("assistant_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  threadId: uuid("thread_id")
    .notNull()
    .references(() => assistantThreads.id, { onDelete: "cascade" }),
  role: messageRoleEnum("role").notNull(),
  content: text("content").notNull(),
  tokensUsed: integer("tokens_used").notNull().default(0),
  metadata: jsonb("metadata").$type<MessageMetadata>().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const assistantMessagesRelations = relations(assistantMessages, ({ one }) => ({
  thread: one(assistantThreads, {
    fields: [assistantMessages.threadId],
    references: [assistantThreads.id],
  }),
}));

export const assistantUsage = pgTable("assistant_usage", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  model: varchar("model", { length: 100 }).notNull(),
  inputTokens: integer("input_tokens").notNull().default(0),
  outputTokens: integer("output_tokens").notNull().default(0),
  costCents: integer("cost_cents").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const assistantUsageRelations = relations(assistantUsage, ({ one }) => ({
  tenant: one(tenants, {
    fields: [assistantUsage.tenantId],
    references: [tenants.id],
  }),
  user: one(users, {
    fields: [assistantUsage.userId],
    references: [users.id],
  }),
}));

// Note: assistantConfig schema is defined in assistant-config.ts

export interface MessageMetadata {
  toolCalls?: ToolCall[];
  attachments?: Attachment[];
  finishReason?: string;
  [key: string]: unknown;
}

export interface ToolCall {
  id: string;
  type: string;
  function: {
    name: string;
    arguments: string;
  };
}

export interface Attachment {
  type: string;
  url: string;
  name: string;
}

export type AssistantThread = typeof assistantThreads.$inferSelect;
export type NewAssistantThread = typeof assistantThreads.$inferInsert;
export type AssistantMessage = typeof assistantMessages.$inferSelect;
export type NewAssistantMessage = typeof assistantMessages.$inferInsert;
export type MessageRole = "user" | "assistant" | "system";
export type AssistantUsage = typeof assistantUsage.$inferSelect;
export type NewAssistantUsage = typeof assistantUsage.$inferInsert;
// Note: AssistantConfig and NewAssistantConfig types are exported from assistant-config.ts
