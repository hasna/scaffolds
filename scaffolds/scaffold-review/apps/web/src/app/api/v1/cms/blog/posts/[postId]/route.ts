import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@scaffold-review/database/client";
import * as schema from "@scaffold-review/database/schema";
import { eq, and } from "drizzle-orm";
import { requireRole } from "@/lib/auth-utils";

const updatePostSchema = z.object({
  slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/).optional(),
  title: z.string().min(1).max(255).optional(),
  excerpt: z.string().optional().nullable(),
  content: z.string().min(1).optional(),
  categoryId: z.string().uuid().optional().nullable(),
  featuredImage: z.string().url().optional().nullable(),
  seoTitle: z.string().max(255).optional().nullable(),
  seoDescription: z.string().optional().nullable(),
  status: z.enum(["draft", "published", "archived"]).optional(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await params;
    const { searchParams } = new URL(request.url);
    const isPublic = searchParams.get("public") === "true";

    let whereCondition;
    if (isPublic) {
      whereCondition = and(
        eq(schema.blogPosts.id, postId),
        eq(schema.blogPosts.status, "published")
      );
    } else {
      await requireRole("admin");
      whereCondition = eq(schema.blogPosts.id, postId);
    }

    const post = await db.query.blogPosts.findFirst({
      where: whereCondition,
      with: {
        author: {
          columns: { id: true, name: true, avatarUrl: true },
        },
        category: true,
      },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    return NextResponse.json({ post });
  } catch (error) {
    console.error("Get blog post error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    await requireRole("admin");
    const { postId } = await params;
    const body = await request.json();
    const parsed = updatePostSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {
      ...parsed.data,
      updatedAt: new Date(),
    };

    if (parsed.data.status === "published") {
      const existing = await db.query.blogPosts.findFirst({
        where: eq(schema.blogPosts.id, postId),
        columns: { publishedAt: true },
      });
      if (!existing?.publishedAt) {
        updateData.publishedAt = new Date();
      }
    }

    const [post] = await db
      .update(schema.blogPosts)
      .set(updateData)
      .where(eq(schema.blogPosts.id, postId))
      .returning();

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    return NextResponse.json({ post });
  } catch (error) {
    console.error("Update blog post error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    await requireRole("admin");
    const { postId } = await params;

    const [deleted] = await db
      .delete(schema.blogPosts)
      .where(eq(schema.blogPosts.id, postId))
      .returning({ id: schema.blogPosts.id });

    if (!deleted) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete blog post error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
