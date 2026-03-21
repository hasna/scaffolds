import { NextResponse } from "next/server";
import { db } from "@scaffold-landing-pages/database/client";
import * as schema from "@scaffold-landing-pages/database/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const LeadSchema = z.object({
  pageId: z.string().uuid(),
  email: z.string().email(),
  name: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as unknown;
    const parsed = LeadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", issues: parsed.error.issues }, { status: 422 });
    }

    const { pageId, email, name } = parsed.data;

    // Verify page exists and is published
    const page = await db.query.pages.findFirst({
      where: eq(schema.pages.id, pageId),
    });

    if (!page || page.status !== "published") {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    // Insert lead (upsert-style: just insert, duplicates are allowed as it tracks intent)
    const [lead] = await db
      .insert(schema.leads)
      .values({
        pageId,
        email,
        name: name ?? null,
        metadata: {},
      })
      .returning();

    // Redirect to thanks page if request is a form submission (non-JSON)
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("application/x-www-form-urlencoded")) {
      return NextResponse.redirect(new URL(`/${page.slug}/thanks`, request.url), 303);
    }

    return NextResponse.json({ success: true, id: lead.id }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
