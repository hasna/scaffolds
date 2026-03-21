import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@scaffold-review/database/client";
import * as schema from "@scaffold-review/database/schema";
import { eq, and, isNotNull } from "drizzle-orm";
import { requireRole } from "@/lib/auth-utils";

const updateEntrySchema = z.object({
  version: z.string().min(1).max(50).optional(),
  title: z.string().min(1).max(255).optional(),
  content: z.string().min(1).optional(),
  type: z.enum(["feature", "improvement", "fix", "breaking"]).optional(),
  publishedAt: z.string().datetime().optional().nullable(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ entryId: string }> }
) {
  try {
    const { entryId } = await params;
    const { searchParams } = new URL(request.url);
    const isPublic = searchParams.get("public") === "true";

    let whereCondition;
    if (isPublic) {
      whereCondition = and(
        eq(schema.changelogEntries.id, entryId),
        isNotNull(schema.changelogEntries.publishedAt)
      );
    } else {
      await requireRole("admin");
      whereCondition = eq(schema.changelogEntries.id, entryId);
    }

    const entry = await db.query.changelogEntries.findFirst({
      where: whereCondition,
    });

    if (!entry) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    return NextResponse.json({ entry });
  } catch (error) {
    console.error("Get changelog entry error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ entryId: string }> }
) {
  try {
    await requireRole("admin");
    const { entryId } = await params;
    const body = await request.json();
    const parsed = updateEntrySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const [entry] = await db
      .update(schema.changelogEntries)
      .set({
        ...parsed.data,
        publishedAt: parsed.data.publishedAt ? new Date(parsed.data.publishedAt) : parsed.data.publishedAt === null ? null : undefined,
        updatedAt: new Date(),
      })
      .where(eq(schema.changelogEntries.id, entryId))
      .returning();

    if (!entry) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    return NextResponse.json({ entry });
  } catch (error) {
    console.error("Update changelog entry error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ entryId: string }> }
) {
  try {
    await requireRole("admin");
    const { entryId } = await params;

    const [deleted] = await db
      .delete(schema.changelogEntries)
      .where(eq(schema.changelogEntries.id, entryId))
      .returning({ id: schema.changelogEntries.id });

    if (!deleted) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete changelog entry error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
