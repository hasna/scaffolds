import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@scaffold-social/database/client";
import * as schema from "@scaffold-social/database/schema";
import { eq, desc, inArray, or } from "drizzle-orm";
import { z } from "zod";

const createPostSchema = z.object({
  content: z
    .string()
    .min(1, "Content is required")
    .max(500, "Post must be 500 characters or less"),
  imageUrl: z.string().url("Invalid image URL").nullable().optional(),
});

/**
 * GET /api/v1/posts
 * Returns the chronological feed for the authenticated user:
 * posts from followed users + their own posts.
 */
export async function GET(_request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userId = session.user.id;

    // Get IDs of users the current user follows
    const followedRows = await db
      .select({ followingId: schema.follows.followingId })
      .from(schema.follows)
      .where(eq(schema.follows.followerId, userId));

    const followedIds = followedRows.map((r) => r.followingId);
    const feedUserIds = [...new Set([userId, ...followedIds])];

    const feedPosts =
      feedUserIds.length === 0
        ? []
        : await db
            .select({
              id: schema.posts.id,
              content: schema.posts.content,
              imageUrl: schema.posts.imageUrl,
              likesCount: schema.posts.likesCount,
              commentsCount: schema.posts.commentsCount,
              repostsCount: schema.posts.repostsCount,
              createdAt: schema.posts.createdAt,
              authorId: schema.posts.authorId,
              authorName: schema.users.name,
              authorAvatarUrl: schema.users.avatarUrl,
            })
            .from(schema.posts)
            .leftJoin(schema.users, eq(schema.posts.authorId, schema.users.id))
            .where(
              feedUserIds.length === 1
                ? eq(schema.posts.authorId, feedUserIds[0])
                : inArray(schema.posts.authorId, feedUserIds),
            )
            .orderBy(desc(schema.posts.createdAt))
            .limit(50);

    // Fetch usernames from profiles
    const authorIds = [...new Set(feedPosts.map((p) => p.authorId))];
    const profileRows =
      authorIds.length > 0
        ? await db
            .select({
              userId: schema.profiles.userId,
              username: schema.profiles.username,
            })
            .from(schema.profiles)
            .where(inArray(schema.profiles.userId, authorIds))
        : [];

    const usernameMap = new Map(profileRows.map((p) => [p.userId, p.username]));

    const posts = feedPosts.map((p) => ({
      id: p.id,
      content: p.content,
      imageUrl: p.imageUrl,
      likesCount: p.likesCount,
      commentsCount: p.commentsCount,
      repostsCount: p.repostsCount,
      createdAt: p.createdAt,
      author: {
        id: p.authorId,
        name: p.authorName,
        avatarUrl: p.authorAvatarUrl,
        username: usernameMap.get(p.authorId) ?? null,
      },
    }));

    return NextResponse.json({ posts });
  } catch (error) {
    console.error("GET /api/v1/posts error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/v1/posts
 * Create a new post.
 */
export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = createPostSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 422 },
      );
    }

    const { content, imageUrl } = parsed.data;

    const [post] = await db
      .insert(schema.posts)
      .values({
        authorId: session.user.id,
        content,
        imageUrl: imageUrl ?? null,
      })
      .returning();

    // Increment the author's postsCount on their profile
    await db
      .update(schema.profiles)
      .set({
        postsCount: db.$count(schema.posts, eq(schema.posts.authorId, session.user.id)),
        updatedAt: new Date(),
      })
      .where(eq(schema.profiles.userId, session.user.id));

    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    console.error("POST /api/v1/posts error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
