import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@scaffold-landing-pages/database/client";
import * as schema from "@scaffold-landing-pages/database/schema";
import { desc, isNotNull } from "drizzle-orm";
import { requireRole } from "@/lib/auth-utils";

const createEntrySchema = z.object({
  version: z.string().min(1).max(50),
  title: z.string().min(1).max(255),
  content: z.string().min(1),
  type: z.enum(["feature", "improvement", "fix", "breaking"]).optional(),
  publishedAt: z.string().datetime().optional(),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const isPublic = searchParams.get("public") === "true";
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");

    if (!isPublic) {
      await requireRole("admin");
    }

    const entries = await db.query.changelogEntries.findMany({
      where: isPublic ? isNotNull(schema.changelogEntries.publishedAt) : undefined,
      orderBy: [desc(schema.changelogEntries.publishedAt), desc(schema.changelogEntries.createdAt)],
      limit,
      offset,
    });

    return NextResponse.json({ entries });
  } catch (error) {
    console.error("Get changelog error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await requireRole("admin");
    const body = await request.json();
    const parsed = createEntrySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const [entry] = await db
      .insert(schema.changelogEntries)
      .values({
        ...parsed.data,
        publishedAt: parsed.data.publishedAt ? new Date(parsed.data.publishedAt) : null,
      })
      .returning();

    return NextResponse.json({ entry }, { status: 201 });
  } catch (error) {
    console.error("Create changelog entry error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
