import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@scaffold-competition/database/client";
import * as schema from "@scaffold-competition/database/schema";
import { eq, desc } from "drizzle-orm";
import { requireRole } from "@/lib/auth-utils";

const createPageSchema = z.object({
  slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/),
  title: z.string().min(1).max(255),
  seoTitle: z.string().max(255).optional(),
  seoDescription: z.string().optional(),
  ogImage: z.string().url().optional(),
  status: z.enum(["draft", "published", "archived"]).optional(),
});

export async function GET() {
  try {
    await requireRole("admin");

    const pages = await db.query.cmsPages.findMany({
      orderBy: [desc(schema.cmsPages.updatedAt)],
      with: {
        sections: {
          orderBy: [schema.cmsSections.order],
        },
      },
    });

    return NextResponse.json({ pages });
  } catch (error) {
    console.error("Get CMS pages error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await requireRole("admin");
    const body = await request.json();
    const parsed = createPageSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const existing = await db.query.cmsPages.findFirst({
      where: eq(schema.cmsPages.slug, parsed.data.slug),
    });

    if (existing) {
      return NextResponse.json(
        { error: "Page with this slug already exists" },
        { status: 409 }
      );
    }

    const [page] = await db
      .insert(schema.cmsPages)
      .values({
        ...parsed.data,
        publishedAt: parsed.data.status === "published" ? new Date() : null,
      })
      .returning();

    return NextResponse.json({ page }, { status: 201 });
  } catch (error) {
    console.error("Create CMS page error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
