import { NextResponse } from "next/server";
import { db } from "@scaffold-landing-pages/database/client";
import * as schema from "@scaffold-landing-pages/database/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireAuth } from "@/lib/auth-utils";

const CreatePageSchema = z.object({
  title: z.string().min(1).max(255),
  slug: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens only"),
  description: z.string().optional(),
});

export async function GET() {
  try {
    const session = await requireAuth();

    const pages = await db.query.pages.findMany({
      where: eq(schema.pages.ownerId, session.user.id),
    });

    return NextResponse.json(pages);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAuth();

    const body = (await request.json()) as unknown;
    const parsed = CreatePageSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", issues: parsed.error.issues }, { status: 422 });
    }

    const { title, slug, description } = parsed.data;

    const [page] = await db
      .insert(schema.pages)
      .values({
        title,
        slug,
        description: description ?? null,
        ownerId: session.user.id,
        status: "draft",
        viewCount: 0,
      })
      .returning();

    return NextResponse.json(page, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    if (message.includes("unique")) {
      return NextResponse.json({ error: "Slug already taken" }, { status: 409 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
