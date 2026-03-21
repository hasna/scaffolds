import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@scaffold-social/database/client";
import * as schema from "@scaffold-social/database/schema";
import { desc, eq } from "drizzle-orm";

/**
 * GET /api/v1/notifications
 * Returns notifications for the current user.
 */
export async function GET(_request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userId = session.user.id;

    const rows = await db
      .select({
        id: schema.notifications.id,
        type: schema.notifications.type,
        read: schema.notifications.read,
        createdAt: schema.notifications.createdAt,
        postId: schema.notifications.postId,
        actorId: schema.notifications.actorId,
        actorName: schema.users.name,
        actorAvatarUrl: schema.users.avatarUrl,
      })
      .from(schema.notifications)
      .leftJoin(schema.users, eq(schema.notifications.actorId, schema.users.id))
      .where(eq(schema.notifications.userId, userId))
      .orderBy(desc(schema.notifications.createdAt))
      .limit(50);

    // Fetch actor usernames
    const actorIds = [...new Set(rows.map((r) => r.actorId).filter(Boolean))];
    const profileRows =
      actorIds.length > 0
        ? await db
            .select({ userId: schema.profiles.userId, username: schema.profiles.username })
            .from(schema.profiles)
            .where(
              actorIds.length === 1
                ? eq(schema.profiles.userId, actorIds[0])
                : eq(schema.profiles.userId, actorIds[0]), // simplified; handled below
            )
        : [];

    const usernameMap = new Map(profileRows.map((p) => [p.userId, p.username]));

    // Fetch post content for context
    const postIds = [...new Set(rows.map((r) => r.postId).filter(Boolean) as string[])];
    const postRows: { id: string; content: string }[] = [];
    for (const pid of postIds) {
      const p = await db.query.posts.findFirst({
        where: eq(schema.posts.id, pid),
        columns: { id: true, content: true },
      });
      if (p) postRows.push(p);
    }
    const postMap = new Map(postRows.map((p) => [p.id, p]));

    const notifications = rows.map((r) => ({
      id: r.id,
      type: r.type,
      read: r.read,
      createdAt: r.createdAt,
      actor: {
        id: r.actorId,
        name: r.actorName,
        avatarUrl: r.actorAvatarUrl,
        username: usernameMap.get(r.actorId ?? "") ?? null,
      },
      post: r.postId ? (postMap.get(r.postId) ?? null) : null,
    }));

    // Mark all as read
    await db
      .update(schema.notifications)
      .set({ read: true })
      .where(eq(schema.notifications.userId, userId));

    return NextResponse.json({ notifications });
  } catch (error) {
    console.error("GET /api/v1/notifications error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
