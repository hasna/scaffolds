import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@scaffold-social/database/client";
import * as schema from "@scaffold-social/database/schema";
import { and, eq, sql } from "drizzle-orm";

/**
 * POST /api/v1/posts/[id]/like
 * Toggle like on a post. Returns { liked: boolean, likesCount: number }.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: postId } = await params;
  const userId = session.user.id;

  try {
    // Check if post exists
    const post = await db.query.posts.findFirst({
      where: eq(schema.posts.id, postId),
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Check existing like
    const existingLike = await db.query.likes.findFirst({
      where: and(eq(schema.likes.postId, postId), eq(schema.likes.userId, userId)),
    });

    if (existingLike) {
      // Unlike
      await db
        .delete(schema.likes)
        .where(and(eq(schema.likes.postId, postId), eq(schema.likes.userId, userId)));

      const [updated] = await db
        .update(schema.posts)
        .set({ likesCount: sql`${schema.posts.likesCount} - 1` })
        .where(eq(schema.posts.id, postId))
        .returning({ likesCount: schema.posts.likesCount });

      return NextResponse.json({ liked: false, likesCount: updated.likesCount });
    } else {
      // Like
      await db.insert(schema.likes).values({ postId, userId });

      const [updated] = await db
        .update(schema.posts)
        .set({ likesCount: sql`${schema.posts.likesCount} + 1` })
        .where(eq(schema.posts.id, postId))
        .returning({ likesCount: schema.posts.likesCount });

      // Create notification (ignore if it's the author liking their own post)
      if (post.authorId !== userId) {
        await db.insert(schema.notifications).values({
          userId: post.authorId,
          type: "like",
          actorId: userId,
          postId,
        });
      }

      return NextResponse.json({ liked: true, likesCount: updated.likesCount });
    }
  } catch (error) {
    console.error("POST /api/v1/posts/[id]/like error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
