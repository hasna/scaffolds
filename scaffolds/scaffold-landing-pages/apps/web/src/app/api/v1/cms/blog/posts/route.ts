import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@scaffold-landing-pages/database/client";
import * as schema from "@scaffold-landing-pages/database/schema";
import { eq, desc, and } from "drizzle-orm";
import { requireRole } from "@/lib/auth-utils";

const createPostSchema = z.object({
  slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/),
  title: z.string().min(1).max(255),
  excerpt: z.string().optional(),
  content: z.string().min(1),
  categoryId: z.string().uuid().optional().nullable(),
  featuredImage: z.string().url().optional(),
  seoTitle: z.string().max(255).optional(),
  seoDescription: z.string().optional(),
  status: z.enum(["draft", "published", "archived"]).optional(),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const isPublic = searchParams.get("public") === "true";
    const categoryId = searchParams.get("categoryId");
    const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 50);
    const offset = parseInt(searchParams.get("offset") || "0");

    let whereConditions = [];
    
    if (isPublic) {
      whereConditions.push(eq(schema.blogPosts.status, "published"));
    } else {
      await requireRole("admin");
    }

    if (categoryId) {
      whereConditions.push(eq(schema.blogPosts.categoryId, categoryId));
    }

    const posts = await db.query.blogPosts.findMany({
      where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
      orderBy: [desc(schema.blogPosts.publishedAt), desc(schema.blogPosts.createdAt)],
      limit,
      offset,
      with: {
        author: {
          columns: { id: true, name: true, avatarUrl: true },
        },
        category: true,
      },
    });

    return NextResponse.json({ posts });
  } catch (error) {
    console.error("Get blog posts error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireRole("admin");
    const body = await request.json();
    const parsed = createPostSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const existing = await db.query.blogPosts.findFirst({
      where: eq(schema.blogPosts.slug, parsed.data.slug),
    });

    if (existing) {
      return NextResponse.json(
        { error: "Post with this slug already exists" },
        { status: 409 }
      );
    }

    const [post] = await db
      .insert(schema.blogPosts)
      .values({
        ...parsed.data,
        authorId: session.user.id,
        publishedAt: parsed.data.status === "published" ? new Date() : null,
      })
      .returning();

    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    console.error("Create blog post error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
