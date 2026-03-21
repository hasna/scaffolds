import { NextResponse } from "next/server";
import { db } from "@scaffold-landing-pages/database/client";
import * as schema from "@scaffold-landing-pages/database/schema";
import { eq, count } from "drizzle-orm";
import { z } from "zod";
import { requireAuth } from "@/lib/auth-utils";

const AddSectionSchema = z.object({
  type: z.enum(["hero", "features", "cta", "pricing", "footer"]),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    // Verify page ownership
    const page = await db.query.pages.findFirst({
      where: eq(schema.pages.id, id),
    });

    if (!page || page.ownerId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Parse body (support both JSON and form submissions)
    const contentType = request.headers.get("content-type") ?? "";
    let type: string;

    if (contentType.includes("application/json")) {
      const body = (await request.json()) as unknown;
      const parsed = AddSectionSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: "Invalid section type" }, { status: 422 });
      }
      type = parsed.data.type;
    } else {
      // Form submission
      const form = await request.formData();
      type = form.get("type") as string;
      const parsed = AddSectionSchema.safeParse({ type });
      if (!parsed.success) {
        return NextResponse.json({ error: "Invalid section type" }, { status: 422 });
      }
    }

    // Get next order
    const [{ count: sectionCount }] = await db
      .select({ count: count() })
      .from(schema.sections)
      .where(eq(schema.sections.pageId, id));

    const [section] = await db
      .insert(schema.sections)
      .values({
        pageId: id,
        type: type as schema.SectionType,
        order: Number(sectionCount),
        content: {},
        visible: true,
      })
      .returning();

    // Redirect back if form submission
    if (!contentType.includes("application/json")) {
      return NextResponse.redirect(
        new URL(`/dashboard/pages/${id}/edit`, request.url),
        303,
      );
    }

    return NextResponse.json(section, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
