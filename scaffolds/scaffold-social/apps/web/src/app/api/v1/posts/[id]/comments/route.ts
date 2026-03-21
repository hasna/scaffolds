import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@scaffold-social/database/client";
import * as schema from "@scaffold-social/database/schema";
import { desc, eq, sql } from "drizzle-orm";
import { z } from "zod";

const createCommentSchema = z.object({
  content: z.string().min(1, "Comment cannot be empty").max(500, "Comment too long"),
});

/**
 * GET /api/v1/posts/[id]/comments
 * List comments for a post.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: postId } = await params;

  try {
    const post = await db.query.posts.findFirst({
      where: eq(schema.posts.id, postId),
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const comments = await db
      .select({
        id: schema.postComments.id,
        content: schema.postComments.content,
        createdAt: schema.postComments.createdAt,
        authorId: schema.postComments.authorId,
        authorName: schema.users.name,
        authorAvatarUrl: schema.users.avatarUrl,
      })
      .from(schema.postComments)
      .leftJoin(schema.users, eq(schema.postComments.authorId, schema.users.id))
      .where(eq(schema.postComments.postId, postId))
      .orderBy(desc(schema.postComments.createdAt))
      .limit(100);

    return NextResponse.json({ comments });
  } catch (error) {
    console.error("GET /api/v1/posts/[id]/comments error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/v1/posts/[id]/comments
 * Add a comment to a post.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: postId } = await params;
  const userId = session.user.id;

  try {
    const post = await db.query.posts.findFirst({
      where: eq(schema.posts.id, postId),
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = createCommentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 422 },
      );
    }

    const [comment] = await db
      .insert(schema.postComments)
      .values({
        postId,
        authorId: userId,
        content: parsed.data.content,
      })
      .returning();

    // Increment commentsCount on the post
    await db
      .update(schema.posts)
      .set({ commentsCount: sql`${schema.posts.commentsCount} + 1` })
      .where(eq(schema.posts.id, postId));

    // Notify post author (unless they commented on their own post)
    if (post.authorId !== userId) {
      await db.insert(schema.notifications).values({
        userId: post.authorId,
        type: "comment",
        actorId: userId,
        postId,
      });
    }

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    console.error("POST /api/v1/posts/[id]/comments error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
