import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@scaffold-competition/database/client";
import * as schema from "@scaffold-competition/database/schema";
import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/auth-utils";

const updateDocSchema = z.object({
  slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/).optional(),
  title: z.string().min(1).max(255).optional(),
  content: z.string().min(1).optional(),
  parentId: z.string().uuid().optional().nullable(),
  order: z.number().int().min(0).optional(),
  seoTitle: z.string().max(255).optional().nullable(),
  seoDescription: z.string().optional().nullable(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ docId: string }> }
) {
  try {
    const { docId } = await params;
    const { searchParams } = new URL(request.url);
    const isPublic = searchParams.get("public") === "true";

    if (!isPublic) {
      await requireRole("admin");
    }

    const doc = await db.query.docsPages.findFirst({
      where: eq(schema.docsPages.id, docId),
      with: {
        parent: true,
        children: {
          orderBy: [schema.docsPages.order, schema.docsPages.title],
        },
      },
    });

    if (!doc) {
      return NextResponse.json({ error: "Doc not found" }, { status: 404 });
    }

    return NextResponse.json({ doc });
  } catch (error) {
    console.error("Get doc error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ docId: string }> }
) {
  try {
    await requireRole("admin");
    const { docId } = await params;
    const body = await request.json();
    const parsed = updateDocSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    if (parsed.data.slug) {
      const existing = await db.query.docsPages.findFirst({
        where: eq(schema.docsPages.slug, parsed.data.slug),
      });
      if (existing && existing.id !== docId) {
        return NextResponse.json(
          { error: "Doc with this slug already exists" },
          { status: 409 }
        );
      }
    }

    if (parsed.data.parentId) {
      if (parsed.data.parentId === docId) {
        return NextResponse.json(
          { error: "Doc cannot be its own parent" },
          { status: 400 }
        );
      }
      const parent = await db.query.docsPages.findFirst({
        where: eq(schema.docsPages.id, parsed.data.parentId),
      });
      if (!parent) {
        return NextResponse.json(
          { error: "Parent doc not found" },
          { status: 404 }
        );
      }
    }

    const [doc] = await db
      .update(schema.docsPages)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(schema.docsPages.id, docId))
      .returning();

    if (!doc) {
      return NextResponse.json({ error: "Doc not found" }, { status: 404 });
    }

    return NextResponse.json({ doc });
  } catch (error) {
    console.error("Update doc error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ docId: string }> }
) {
  try {
    await requireRole("admin");
    const { docId } = await params;

    // Check for children
    const children = await db.query.docsPages.findMany({
      where: eq(schema.docsPages.parentId, docId),
      columns: { id: true },
    });

    if (children.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete doc with children. Delete children first." },
        { status: 400 }
      );
    }

    const [deleted] = await db
      .delete(schema.docsPages)
      .where(eq(schema.docsPages.id, docId))
      .returning({ id: schema.docsPages.id });

    if (!deleted) {
      return NextResponse.json({ error: "Doc not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete doc error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
