import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
  integer,
  boolean,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";

// Enums
export const cmsPageStatusEnum = pgEnum("cms_page_status", ["draft", "published", "archived"]);
export const blogPostStatusEnum = pgEnum("blog_post_status", ["draft", "published", "archived"]);
export const changelogTypeEnum = pgEnum("changelog_type", ["feature", "improvement", "fix", "breaking"]);

// CMS Pages
export const cmsPages = pgTable("cms_pages", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  title: varchar("title", { length: 255 }).notNull(),
  seoTitle: varchar("seo_title", { length: 255 }),
  seoDescription: text("seo_description"),
  ogImage: text("og_image"),
  status: cmsPageStatusEnum("status").notNull().default("draft"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const cmsPagesRelations = relations(cmsPages, ({ many }) => ({
  sections: many(cmsSections),
}));

// CMS Sections
export const cmsSections = pgTable("cms_sections", {
  id: uuid("id").primaryKey().defaultRandom(),
  pageId: uuid("page_id")
    .notNull()
    .references(() => cmsPages.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 100 }).notNull(),
  order: integer("order").notNull().default(0),
  content: jsonb("content").$type<Record<string, unknown>>().default({}),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const cmsSectionsRelations = relations(cmsSections, ({ one }) => ({
  page: one(cmsPages, {
    fields: [cmsSections.pageId],
    references: [cmsPages.id],
  }),
}));

// CMS Images
export const cmsImages = pgTable("cms_images", {
  id: uuid("id").primaryKey().defaultRandom(),
  url: text("url").notNull(),
  alt: varchar("alt", { length: 255 }),
  width: integer("width"),
  height: integer("height"),
  size: integer("size"),
  mimeType: varchar("mime_type", { length: 100 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Blog Categories
export const blogCategories = pgTable("blog_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const blogCategoriesRelations = relations(blogCategories, ({ many }) => ({
  posts: many(blogPosts),
}));

// Blog Posts
export const blogPosts = pgTable("blog_posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  title: varchar("title", { length: 255 }).notNull(),
  excerpt: text("excerpt"),
  content: text("content").notNull(),
  authorId: uuid("author_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  categoryId: uuid("category_id").references(() => blogCategories.id, { onDelete: "set null" }),
  featuredImage: text("featured_image"),
  seoTitle: varchar("seo_title", { length: 255 }),
  seoDescription: text("seo_description"),
  status: blogPostStatusEnum("status").notNull().default("draft"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const blogPostsRelations = relations(blogPosts, ({ one }) => ({
  author: one(users, {
    fields: [blogPosts.authorId],
    references: [users.id],
  }),
  category: one(blogCategories, {
    fields: [blogPosts.categoryId],
    references: [blogCategories.id],
  }),
}));

// Changelog Entries
export const changelogEntries = pgTable("changelog_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  version: varchar("version", { length: 50 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  type: changelogTypeEnum("type").notNull().default("feature"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Documentation Pages
export const docsPages = pgTable("docs_pages", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  parentId: uuid("parent_id"), // Self-referencing, handled via relations
  order: integer("order").notNull().default(0),
  seoTitle: varchar("seo_title", { length: 255 }),
  seoDescription: text("seo_description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const docsPagesRelations = relations(docsPages, ({ one, many }) => ({
  parent: one(docsPages, {
    fields: [docsPages.parentId],
    references: [docsPages.id],
    relationName: "parent",
  }),
  children: many(docsPages, { relationName: "parent" }),
}));

// Type exports
export type CmsPage = typeof cmsPages.$inferSelect;
export type NewCmsPage = typeof cmsPages.$inferInsert;
export type CmsSection = typeof cmsSections.$inferSelect;
export type NewCmsSection = typeof cmsSections.$inferInsert;
export type CmsImage = typeof cmsImages.$inferSelect;
export type NewCmsImage = typeof cmsImages.$inferInsert;
export type BlogCategory = typeof blogCategories.$inferSelect;
export type NewBlogCategory = typeof blogCategories.$inferInsert;
export type BlogPost = typeof blogPosts.$inferSelect;
export type NewBlogPost = typeof blogPosts.$inferInsert;
export type ChangelogEntry = typeof changelogEntries.$inferSelect;
export type NewChangelogEntry = typeof changelogEntries.$inferInsert;
export type DocsPage = typeof docsPages.$inferSelect;
export type NewDocsPage = typeof docsPages.$inferInsert;
