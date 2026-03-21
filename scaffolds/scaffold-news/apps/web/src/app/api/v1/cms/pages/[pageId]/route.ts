import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@scaffold-news/database/client";
import * as schema from "@scaffold-news/database/schema";
import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/auth-utils";

const updatePageSchema = z.object({
  slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/).optional(),
  title: z.string().min(1).max(255).optional(),
  seoTitle: z.string().max(255).optional().nullable(),
  seoDescription: z.string().optional().nullable(),
  ogImage: z.string().url().optional().nullable(),
  status: z.enum(["draft", "published", "archived"]).optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ pageId: string }> }
) {
  try {
    await requireRole("admin");
    const { pageId } = await params;

    const page = await db.query.cmsPages.findFirst({
      where: eq(schema.cmsPages.id, pageId),
      with: {
        sections: {
          orderBy: [schema.cmsSections.order],
        },
      },
    });

    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    return NextResponse.json({ page });
  } catch (error) {
    console.error("Get CMS page error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ pageId: string }> }
) {
  try {
    await requireRole("admin");
    const { pageId } = await params;
    const body = await request.json();
    const parsed = updatePageSchema.safeParse(body);

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
      const existing = await db.query.cmsPages.findFirst({
        where: eq(schema.cmsPages.id, pageId),
        columns: { publishedAt: true },
      });
      if (!existing?.publishedAt) {
        updateData.publishedAt = new Date();
      }
    }

    const [page] = await db
      .update(schema.cmsPages)
      .set(updateData)
      .where(eq(schema.cmsPages.id, pageId))
      .returning();

    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    return NextResponse.json({ page });
  } catch (error) {
    console.error("Update CMS page error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ pageId: string }> }
) {
  try {
    await requireRole("admin");
    const { pageId } = await params;

    const [deleted] = await db
      .delete(schema.cmsPages)
      .where(eq(schema.cmsPages.id, pageId))
      .returning({ id: schema.cmsPages.id });

    if (!deleted) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete CMS page error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
