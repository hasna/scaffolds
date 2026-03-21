import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@scaffold-social/database/client";
import * as schema from "@scaffold-social/database/schema";
import { and, desc, eq } from "drizzle-orm";

/**
 * GET /api/v1/profiles/[username]
 * Returns a user profile with their recent posts and whether the current user follows them.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ username: string }> },
) {
  const session = await auth();
  const { username } = await params;

  try {
    const profile = await db.query.profiles.findFirst({
      where: eq(schema.profiles.username, username),
    });

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Check if current user follows this profile
    let isFollowing = false;
    if (session?.user?.id && session.user.id !== profile.userId) {
      const follow = await db.query.follows.findFirst({
        where: and(
          eq(schema.follows.followerId, session.user.id),
          eq(schema.follows.followingId, profile.userId),
        ),
      });
      isFollowing = !!follow;
    }

    // Fetch recent posts
    const posts = await db
      .select({
        id: schema.posts.id,
        content: schema.posts.content,
        imageUrl: schema.posts.imageUrl,
        likesCount: schema.posts.likesCount,
        commentsCount: schema.posts.commentsCount,
        repostsCount: schema.posts.repostsCount,
        createdAt: schema.posts.createdAt,
      })
      .from(schema.posts)
      .where(eq(schema.posts.authorId, profile.userId))
      .orderBy(desc(schema.posts.createdAt))
      .limit(20);

    return NextResponse.json({
      profile: {
        ...profile,
        isFollowing,
      },
      posts,
    });
  } catch (error) {
    console.error("GET /api/v1/profiles/[username] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
