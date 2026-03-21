import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@scaffold-saas/database/client";
import * as schema from "@scaffold-saas/database/schema";
import { eq, asc } from "drizzle-orm";
import { requireRole } from "@/lib/auth-utils";

const createSectionSchema = z.object({
  pageId: z.string().uuid(),
  type: z.string().min(1).max(100),
  order: z.number().int().min(0).optional(),
  content: z.record(z.string(), z.unknown()).optional(),
  enabled: z.boolean().optional(),
});

const reorderSchema = z.object({
  pageId: z.string().uuid(),
  sectionIds: z.array(z.string().uuid()),
});

export async function GET(request: Request) {
  try {
    await requireRole("admin");
    const { searchParams } = new URL(request.url);
    const pageId = searchParams.get("pageId");

    if (!pageId) {
      return NextResponse.json({ error: "pageId required" }, { status: 400 });
    }

    const sections = await db.query.cmsSections.findMany({
      where: eq(schema.cmsSections.pageId, pageId),
      orderBy: [asc(schema.cmsSections.order)],
    });

    return NextResponse.json({ sections });
  } catch (error) {
    console.error("Get sections error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await requireRole("admin");
    const body = await request.json();
    const parsed = createSectionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Get max order for this page
    const existingSections = await db.query.cmsSections.findMany({
      where: eq(schema.cmsSections.pageId, parsed.data.pageId),
      columns: { order: true },
    });
    const maxOrder = existingSections.length > 0
      ? Math.max(...existingSections.map((s) => s.order))
      : -1;

    const [section] = await db
      .insert(schema.cmsSections)
      .values({
        pageId: parsed.data.pageId,
        type: parsed.data.type,
        order: parsed.data.order ?? maxOrder + 1,
        content: parsed.data.content ?? {},
        enabled: parsed.data.enabled ?? true,
      })
      .returning();

    return NextResponse.json({ section }, { status: 201 });
  } catch (error) {
    console.error("Create section error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    await requireRole("admin");
    const body = await request.json();
    const parsed = reorderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Update order for each section
    for (let i = 0; i < parsed.data.sectionIds.length; i++) {
      const sectionId = parsed.data.sectionIds[i];
      if (!sectionId) continue;
      await db
        .update(schema.cmsSections)
        .set({ order: i, updatedAt: new Date() })
        .where(eq(schema.cmsSections.id, sectionId));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reorder sections error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
