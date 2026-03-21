import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@scaffold-social/database/client";
import * as schema from "@scaffold-social/database/schema";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";

const followSchema = z.object({
  followingId: z.string().uuid("Invalid user ID"),
});

/**
 * POST /api/v1/follows
 * Toggle follow/unfollow for a user.
 * Body: { followingId: string }
 * Returns: { following: boolean }
 */
export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const followerId = session.user.id;

  try {
    const body = await request.json();
    const parsed = followSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 422 },
      );
    }

    const { followingId } = parsed.data;

    if (followingId === followerId) {
      return NextResponse.json({ error: "You cannot follow yourself" }, { status: 400 });
    }

    // Check target user exists
    const targetUser = await db.query.users.findFirst({
      where: eq(schema.users.id, followingId),
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check existing follow
    const existing = await db.query.follows.findFirst({
      where: and(
        eq(schema.follows.followerId, followerId),
        eq(schema.follows.followingId, followingId),
      ),
    });

    if (existing) {
      // Unfollow
      await db
        .delete(schema.follows)
        .where(
          and(
            eq(schema.follows.followerId, followerId),
            eq(schema.follows.followingId, followingId),
          ),
        );

      // Decrement counters
      await db
        .update(schema.profiles)
        .set({ followingCount: sql`${schema.profiles.followingCount} - 1`, updatedAt: new Date() })
        .where(eq(schema.profiles.userId, followerId));

      await db
        .update(schema.profiles)
        .set({ followersCount: sql`${schema.profiles.followersCount} - 1`, updatedAt: new Date() })
        .where(eq(schema.profiles.userId, followingId));

      return NextResponse.json({ following: false });
    } else {
      // Follow
      await db.insert(schema.follows).values({ followerId, followingId });

      // Increment counters
      await db
        .update(schema.profiles)
        .set({ followingCount: sql`${schema.profiles.followingCount} + 1`, updatedAt: new Date() })
        .where(eq(schema.profiles.userId, followerId));

      await db
        .update(schema.profiles)
        .set({ followersCount: sql`${schema.profiles.followersCount} + 1`, updatedAt: new Date() })
        .where(eq(schema.profiles.userId, followingId));

      // Notify the followed user
      await db.insert(schema.notifications).values({
        userId: followingId,
        type: "follow",
        actorId: followerId,
      });

      return NextResponse.json({ following: true });
    }
  } catch (error) {
    console.error("POST /api/v1/follows error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
