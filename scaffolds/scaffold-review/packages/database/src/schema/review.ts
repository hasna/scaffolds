import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  numeric,
  pgEnum,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";

// Enums
export const reviewStatusEnum = pgEnum("review_status", ["pending", "approved", "rejected"]);
export const voteTypeEnum = pgEnum("vote_type", ["helpful", "not_helpful"]);

// Product categories
export const productCategories = pgTable("product_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Products
export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull().unique(),
    description: text("description"),
    imageUrl: text("image_url"),
    category: varchar("category", { length: 255 }),
    ownerId: uuid("owner_id").references(() => users.id, { onDelete: "set null" }),
    averageRating: numeric("average_rating", { precision: 3, scale: 2 }).notNull().default("0"),
    reviewCount: integer("review_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("products_slug_idx").on(table.slug),
    index("products_category_idx").on(table.category),
    index("products_owner_id_idx").on(table.ownerId),
  ]
);

// Reviews
export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(),
    title: varchar("title", { length: 255 }),
    content: text("content").notNull(),
    status: reviewStatusEnum("status").notNull().default("pending"),
    helpful: integer("helpful").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("reviews_product_id_idx").on(table.productId),
    index("reviews_author_id_idx").on(table.authorId),
    index("reviews_status_idx").on(table.status),
  ]
);

// Review votes
export const reviewVotes = pgTable(
  "review_votes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reviewId: uuid("review_id")
      .notNull()
      .references(() => reviews.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    vote: voteTypeEnum("vote").notNull(),
  },
  (table) => [unique("review_votes_review_user_unique").on(table.reviewId, table.userId)]
);

// Relations
export const productCategoriesRelations = relations(productCategories, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  owner: one(users, { fields: [products.ownerId], references: [users.id] }),
  reviews: many(reviews),
}));

export const reviewsRelations = relations(reviews, ({ one, many }) => ({
  product: one(products, { fields: [reviews.productId], references: [products.id] }),
  author: one(users, { fields: [reviews.authorId], references: [users.id] }),
  votes: many(reviewVotes),
}));

export const reviewVotesRelations = relations(reviewVotes, ({ one }) => ({
  review: one(reviews, { fields: [reviewVotes.reviewId], references: [reviews.id] }),
  user: one(users, { fields: [reviewVotes.userId], references: [users.id] }),
}));

// Types
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type Review = typeof reviews.$inferSelect;
export type NewReview = typeof reviews.$inferInsert;
export type ReviewVote = typeof reviewVotes.$inferSelect;
export type NewReviewVote = typeof reviewVotes.$inferInsert;
export type ProductCategory = typeof productCategories.$inferSelect;
export type NewProductCategory = typeof productCategories.$inferInsert;
export type ReviewStatus = "pending" | "approved" | "rejected";
export type VoteType = "helpful" | "not_helpful";
