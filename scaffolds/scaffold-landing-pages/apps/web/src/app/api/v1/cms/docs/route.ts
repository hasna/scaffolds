import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@scaffold-landing-pages/database/client";
import * as schema from "@scaffold-landing-pages/database/schema";
import { eq, isNull, asc } from "drizzle-orm";
import { requireRole } from "@/lib/auth-utils";

const createDocSchema = z.object({
  slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/),
  title: z.string().min(1).max(255),
  content: z.string().min(1),
  parentId: z.string().uuid().optional().nullable(),
  order: z.number().int().min(0).optional(),
  seoTitle: z.string().max(255).optional(),
  seoDescription: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const isPublic = searchParams.get("public") === "true";
    const parentId = searchParams.get("parentId");

    if (!isPublic) {
      await requireRole("admin");
    }

    let whereCondition;
    if (parentId === "null" || parentId === "") {
      whereCondition = isNull(schema.docsPages.parentId);
    } else if (parentId) {
      whereCondition = eq(schema.docsPages.parentId, parentId);
    }

    const docs = await db.query.docsPages.findMany({
      where: whereCondition,
      orderBy: [asc(schema.docsPages.order), asc(schema.docsPages.title)],
      with: {
        children: {
          orderBy: [asc(schema.docsPages.order), asc(schema.docsPages.title)],
        },
      },
    });

    return NextResponse.json({ docs });
  } catch (error) {
    console.error("Get docs error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await requireRole("admin");
    const body = await request.json();
    const parsed = createDocSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const existing = await db.query.docsPages.findFirst({
      where: eq(schema.docsPages.slug, parsed.data.slug),
    });

    if (existing) {
      return NextResponse.json(
        { error: "Doc with this slug already exists" },
        { status: 409 }
      );
    }

    if (parsed.data.parentId) {
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
      .insert(schema.docsPages)
      .values({
        ...parsed.data,
        order: parsed.data.order ?? 0,
      })
      .returning();

    return NextResponse.json({ doc }, { status: 201 });
  } catch (error) {
    console.error("Create doc error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
