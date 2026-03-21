import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@scaffold-saas/database/client";
import * as schema from "@scaffold-saas/database/schema";
import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/auth-utils";

const categorySchema = z.object({
  slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
});

export async function GET() {
  try {
    const categories = await db.query.blogCategories.findMany({
      orderBy: [schema.blogCategories.name],
      with: {
        posts: {
          columns: { id: true },
        },
      },
    });

    return NextResponse.json({
      categories: categories.map((c) => ({
        ...c,
        postCount: c.posts.length,
        posts: undefined,
      })),
    });
  } catch (error) {
    console.error("Get categories error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await requireRole("admin");
    const body = await request.json();
    const parsed = categorySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const existing = await db.query.blogCategories.findFirst({
      where: eq(schema.blogCategories.slug, parsed.data.slug),
    });

    if (existing) {
      return NextResponse.json(
        { error: "Category with this slug already exists" },
        { status: 409 }
      );
    }

    const [category] = await db
      .insert(schema.blogCategories)
      .values(parsed.data)
      .returning();

    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    console.error("Create category error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    await requireRole("admin");
    const body = await request.json();
    const { categoryId, ...data } = body;

    if (!categoryId) {
      return NextResponse.json({ error: "categoryId required" }, { status: 400 });
    }

    const parsed = categorySchema.partial().safeParse(data);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const [category] = await db
      .update(schema.blogCategories)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(schema.blogCategories.id, categoryId))
      .returning();

    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    return NextResponse.json({ category });
  } catch (error) {
    console.error("Update category error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    await requireRole("admin");
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("categoryId");

    if (!categoryId) {
      return NextResponse.json({ error: "categoryId required" }, { status: 400 });
    }

    const [deleted] = await db
      .delete(schema.blogCategories)
      .where(eq(schema.blogCategories.id, categoryId))
      .returning({ id: schema.blogCategories.id });

    if (!deleted) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete category error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
