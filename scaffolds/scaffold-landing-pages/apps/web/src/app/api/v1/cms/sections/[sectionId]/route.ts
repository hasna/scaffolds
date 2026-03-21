import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@scaffold-landing-pages/database/client";
import * as schema from "@scaffold-landing-pages/database/schema";
import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/auth-utils";

const updateSectionSchema = z.object({
  type: z.string().min(1).max(100).optional(),
  order: z.number().int().min(0).optional(),
  content: z.record(z.string(), z.unknown()).optional(),
  enabled: z.boolean().optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sectionId: string }> }
) {
  try {
    await requireRole("admin");
    const { sectionId } = await params;

    const section = await db.query.cmsSections.findFirst({
      where: eq(schema.cmsSections.id, sectionId),
      with: { page: true },
    });

    if (!section) {
      return NextResponse.json({ error: "Section not found" }, { status: 404 });
    }

    return NextResponse.json({ section });
  } catch (error) {
    console.error("Get section error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ sectionId: string }> }
) {
  try {
    await requireRole("admin");
    const { sectionId } = await params;
    const body = await request.json();
    const parsed = updateSectionSchema.safeParse(body);

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

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ sectionId: string }> }
) {
  try {
    await requireRole("admin");
    const { sectionId } = await params;

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
