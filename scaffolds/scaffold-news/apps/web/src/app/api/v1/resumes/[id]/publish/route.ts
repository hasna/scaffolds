import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { db } from "@scaffold-news/database/client";
import * as schema from "@scaffold-news/database/schema";
import { eq, and, isNull } from "drizzle-orm";
import { nanoid } from "nanoid";

const publishSchema = z.object({
  isPublic: z.boolean(),
  slug: z
    .string()
    .min(3)
    .max(100)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = session.user.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant" }, { status: 400 });
    }

    const { id } = await params;

    // Verify ownership
    const resume = await db.query.resumes.findFirst({
      where: and(
        eq(schema.resumes.id, id),
        eq(schema.resumes.tenantId, tenantId),
        eq(schema.resumes.userId, session.user.id),
        isNull(schema.resumes.deletedAt)
      ),
    });

    if (!resume) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = publishSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { isPublic, slug } = parsed.data;

    // Generate slug if publishing and no slug provided
    let finalSlug = slug;
    if (isPublic && !finalSlug && !resume.slug) {
      finalSlug = nanoid(10);
    }

    // Check if slug is already taken
    if (finalSlug) {
      const existingSlug = await db.query.resumes.findFirst({
        where: and(eq(schema.resumes.slug, finalSlug), isNull(schema.resumes.deletedAt)),
      });

      if (existingSlug && existingSlug.id !== id) {
        return NextResponse.json({ error: "Slug already taken" }, { status: 409 });
      }
    }

    const [updatedResume] = await db
      .update(schema.resumes)
      .set({
        isPublic,
        slug: isPublic ? finalSlug || resume.slug : resume.slug,
        updatedAt: new Date(),
      })
      .where(eq(schema.resumes.id, id))
      .returning();

    if (!updatedResume) {
      return NextResponse.json({ error: "Failed to update resume" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: updatedResume,
      publicUrl: updatedResume.isPublic && updatedResume.slug ? `/r/${updatedResume.slug}` : null,
    });
  } catch (error) {
    console.error("Publish resume error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
