import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  boolean,
  uniqueIndex,
  index,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";

export const notificationTypeEnum = pgEnum("notification_type", [
  "like",
  "comment",
  "follow",
  "repost",
]);

// ─── Profiles ────────────────────────────────────────────────────────────────

export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    username: varchar("username", { length: 50 }).notNull().unique(),
    displayName: varchar("display_name", { length: 100 }),
    bio: text("bio"),
    avatarUrl: text("avatar_url"),
    website: text("website"),
    followersCount: integer("followers_count").notNull().default(0),
    followingCount: integer("following_count").notNull().default(0),
    postsCount: integer("posts_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("profiles_user_id_idx").on(t.userId),
    index("profiles_username_idx").on(t.username),
  ],
);

export const profilesRelations = relations(profiles, ({ one, many }) => ({
  user: one(users, { fields: [profiles.userId], references: [users.id] }),
  posts: many(posts),
  followers: many(follows, { relationName: "followingProfile" }),
  following: many(follows, { relationName: "followerProfile" }),
  notifications: many(notifications, { relationName: "profileNotifications" }),
  actorNotifications: many(notifications, { relationName: "actorNotifications" }),
}));

// ─── Posts ────────────────────────────────────────────────────────────────────

export const posts = pgTable(
  "posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    imageUrl: text("image_url"),
    likesCount: integer("likes_count").notNull().default(0),
    commentsCount: integer("comments_count").notNull().default(0),
    repostsCount: integer("reposts_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("posts_author_id_idx").on(t.authorId),
    index("posts_created_at_idx").on(t.createdAt),
  ],
);

export const postsRelations = relations(posts, ({ one, many }) => ({
  author: one(users, { fields: [posts.authorId], references: [users.id] }),
  likes: many(likes),
  comments: many(postComments),
  notifications: many(notifications),
}));

// ─── Follows ──────────────────────────────────────────────────────────────────

export const follows = pgTable(
  "follows",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    followerId: uuid("follower_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    followingId: uuid("following_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("follows_follower_following_idx").on(t.followerId, t.followingId),
    index("follows_follower_id_idx").on(t.followerId),
    index("follows_following_id_idx").on(t.followingId),
  ],
);

export const followsRelations = relations(follows, ({ one }) => ({
  follower: one(users, {
    fields: [follows.followerId],
    references: [users.id],
    relationName: "userFollowing",
  }),
  following: one(users, {
    fields: [follows.followingId],
    references: [users.id],
    relationName: "userFollowers",
  }),
  followerProfile: one(profiles, {
    fields: [follows.followerId],
    references: [profiles.userId],
    relationName: "followerProfile",
  }),
  followingProfile: one(profiles, {
    fields: [follows.followingId],
    references: [profiles.userId],
    relationName: "followingProfile",
  }),
}));

// ─── Likes ────────────────────────────────────────────────────────────────────

export const likes = pgTable(
  "likes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("likes_post_user_idx").on(t.postId, t.userId)],
);

export const likesRelations = relations(likes, ({ one }) => ({
  post: one(posts, { fields: [likes.postId], references: [posts.id] }),
  user: one(users, { fields: [likes.userId], references: [users.id] }),
}));

// ─── Post Comments ────────────────────────────────────────────────────────────

export const postComments = pgTable(
  "post_comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("post_comments_post_id_idx").on(t.postId)],
);

export const postCommentsRelations = relations(postComments, ({ one }) => ({
  post: one(posts, { fields: [postComments.postId], references: [posts.id] }),
  author: one(users, { fields: [postComments.authorId], references: [users.id] }),
}));

// ─── Notifications ────────────────────────────────────────────────────────────

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: notificationTypeEnum("type").notNull(),
    actorId: uuid("actor_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    postId: uuid("post_id").references(() => posts.id, { onDelete: "cascade" }),
    read: boolean("read").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("notifications_user_read_idx").on(t.userId, t.read)],
);

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
    relationName: "profileNotifications",
  }),
  actor: one(users, {
    fields: [notifications.actorId],
    references: [users.id],
    relationName: "actorNotifications",
  }),
  post: one(posts, { fields: [notifications.postId], references: [posts.id] }),
}));

// ─── Types ────────────────────────────────────────────────────────────────────

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
export type Follow = typeof follows.$inferSelect;
export type NewFollow = typeof follows.$inferInsert;
export type Like = typeof likes.$inferSelect;
export type NewLike = typeof likes.$inferInsert;
export type PostComment = typeof postComments.$inferSelect;
export type NewPostComment = typeof postComments.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
export type NotificationType = (typeof notificationTypeEnum.enumValues)[number];
