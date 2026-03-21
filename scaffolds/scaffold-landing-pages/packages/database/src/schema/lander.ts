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
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";

// Enums
export const pageStatusEnum = pgEnum("page_status", ["draft", "published"]);

export const sectionTypeEnum = pgEnum("section_type", [
  "hero",
  "features",
  "cta",
  "pricing",
  "footer",
]);

// Pages table
export const pages = pgTable(
  "pages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: varchar("title", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull().unique(),
    description: text("description"),
    status: pageStatusEnum("status").notNull().default("draft"),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    customDomain: varchar("custom_domain", { length: 255 }),
    viewCount: integer("view_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("pages_owner_id_idx").on(table.ownerId), index("pages_slug_idx").on(table.slug)],
);

export const pagesRelations = relations(pages, ({ one, many }) => ({
  owner: one(users, {
    fields: [pages.ownerId],
    references: [users.id],
  }),
  sections: many(sections),
  leads: many(leads),
}));

// Sections table
export const sections = pgTable(
  "sections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pageId: uuid("page_id")
      .notNull()
      .references(() => pages.id, { onDelete: "cascade" }),
    type: sectionTypeEnum("type").notNull(),
    order: integer("order").notNull().default(0),
    content: jsonb("content").$type<Record<string, unknown>>().default({}),
    visible: boolean("visible").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("sections_page_id_idx").on(table.pageId)],
);

export const sectionsRelations = relations(sections, ({ one }) => ({
  page: one(pages, {
    fields: [sections.pageId],
    references: [pages.id],
  }),
}));

// Leads table
export const leads = pgTable(
  "leads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pageId: uuid("page_id")
      .notNull()
      .references(() => pages.id, { onDelete: "cascade" }),
    email: varchar("email", { length: 255 }).notNull(),
    name: varchar("name", { length: 255 }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("leads_page_id_idx").on(table.pageId),
    index("leads_page_id_email_idx").on(table.pageId, table.email),
  ],
);

export const leadsRelations = relations(leads, ({ one }) => ({
  page: one(pages, {
    fields: [leads.pageId],
    references: [pages.id],
  }),
}));

// Types
export type Page = typeof pages.$inferSelect;
export type NewPage = typeof pages.$inferInsert;
export type PageStatus = "draft" | "published";

export type Section = typeof sections.$inferSelect;
export type NewSection = typeof sections.$inferInsert;
export type SectionType = "hero" | "features" | "cta" | "pricing" | "footer";

export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;
