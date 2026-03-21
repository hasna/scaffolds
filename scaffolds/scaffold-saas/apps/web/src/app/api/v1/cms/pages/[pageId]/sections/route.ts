import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@scaffold-saas/database/client";
import * as schema from "@scaffold-saas/database/schema";
import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/auth-utils";

const createSectionSchema = z.object({
  type: z.string().min(1).max(100),
  order: z.number().int().min(0).optional(),
  content: z.record(z.string(), z.unknown()).optional(),
  enabled: z.boolean().optional(),
});

const updateSectionSchema = z.object({
  type: z.string().min(1).max(100).optional(),
  order: z.number().int().min(0).optional(),
  content: z.record(z.string(), z.unknown()).optional(),
  enabled: z.boolean().optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ pageId: string }> }
) {
  try {
    await requireRole("admin");
    const { pageId } = await params;

    const sections = await db.query.cmsSections.findMany({
      where: eq(schema.cmsSections.pageId, pageId),
      orderBy: [schema.cmsSections.order],
    });

    return NextResponse.json({ sections });
  } catch (error) {
    console.error("Get sections error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ pageId: string }> }
) {
  try {
    await requireRole("admin");
    const { pageId } = await params;
    const body = await request.json();
    const parsed = createSectionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const page = await db.query.cmsPages.findFirst({
      where: eq(schema.cmsPages.id, pageId),
      columns: { id: true },
    });

    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    const [section] = await db
      .insert(schema.cmsSections)
      .values({
        pageId,
        ...parsed.data,
      })
      .returning();

    return NextResponse.json({ section }, { status: 201 });
  } catch (error) {
    console.error("Create section error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    await requireRole("admin");
    const body = await request.json();
    const { sectionId, ...data } = body;

    if (!sectionId) {
      return NextResponse.json({ error: "sectionId required" }, { status: 400 });
    }

    const parsed = updateSectionSchema.safeParse(data);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const [section] = await db
      .update(schema.cmsSections)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(schema.cmsSections.id, sectionId))
      .returning();

    if (!section) {
      return NextResponse.json({ error: "Section not found" }, { status: 404 });
    }

    return NextResponse.json({ section });
  } catch (error) {
    console.error("Update section error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    await requireRole("admin");
    const { searchParams } = new URL(request.url);
    const sectionId = searchParams.get("sectionId");

    if (!sectionId) {
      return NextResponse.json({ error: "sectionId required" }, { status: 400 });
    }

    const [deleted] = await db
      .delete(schema.cmsSections)
      .where(eq(schema.cmsSections.id, sectionId))
      .returning({ id: schema.cmsSections.id });

    if (!deleted) {
      return NextResponse.json({ error: "Section not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete section error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
