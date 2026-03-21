import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { db } from "@scaffold-news/database/client";
import * as schema from "@scaffold-news/database/schema";
import { eq, and, isNull } from "drizzle-orm";
import type { ResumeTheme, ResumeContent } from "@scaffold-news/types";

const updateResumeSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  template: z.enum(["modern", "classic", "minimal", "professional", "creative"]).optional(),
  theme: z
    .object({
      primaryColor: z.string().optional(),
      secondaryColor: z.string().optional(),
      fontFamily: z.string().optional(),
      fontSize: z.enum(["small", "medium", "large"]).optional(),
      spacing: z.enum(["compact", "normal", "relaxed"]).optional(),
      headerStyle: z.enum(["classic", "modern", "minimal"]).optional(),
    })
    .optional(),
  targetJobTitle: z.string().max(255).optional().nullable(),
  targetJobUrl: z.string().url().optional().nullable(),
  content: z.any().optional(),
  isPublic: z.boolean().optional(),
  slug: z.string().max(255).optional().nullable(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
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

    return NextResponse.json({
      success: true,
      data: resume,
    });
  } catch (error) {
    console.error("Get resume error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PUT(_request: NextRequest, { params }: RouteParams) {
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
    const existingResume = await db.query.resumes.findFirst({
      where: and(
        eq(schema.resumes.id, id),
        eq(schema.resumes.tenantId, tenantId),
        eq(schema.resumes.userId, session.user.id),
        isNull(schema.resumes.deletedAt)
      ),
    });

    if (!existingResume) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 });
    }

    const body = await _request.json();
    const parsed = updateResumeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (parsed.data.title !== undefined) updateData.title = parsed.data.title;
    if (parsed.data.template !== undefined) updateData.template = parsed.data.template;
    if (parsed.data.theme !== undefined) updateData.theme = parsed.data.theme as ResumeTheme;
    if (parsed.data.targetJobTitle !== undefined)
      updateData.targetJobTitle = parsed.data.targetJobTitle;
    if (parsed.data.targetJobUrl !== undefined) updateData.targetJobUrl = parsed.data.targetJobUrl;
    if (parsed.data.content !== undefined)
      updateData.content = parsed.data.content as ResumeContent;
    if (parsed.data.isPublic !== undefined) updateData.isPublic = parsed.data.isPublic;
    if (parsed.data.slug !== undefined) updateData.slug = parsed.data.slug;

    const [updatedResume] = await db
      .update(schema.resumes)
      .set(updateData)
      .where(eq(schema.resumes.id, id))
      .returning();

    return NextResponse.json({
      success: true,
      data: updatedResume,
    });
  } catch (error) {
    console.error("Update resume error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
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
    const existingResume = await db.query.resumes.findFirst({
      where: and(
        eq(schema.resumes.id, id),
        eq(schema.resumes.tenantId, tenantId),
        eq(schema.resumes.userId, session.user.id),
        isNull(schema.resumes.deletedAt)
      ),
    });

    if (!existingResume) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 });
    }

    const now = new Date();

    // Soft delete the resume
    await db
      .update(schema.resumes)
      .set({ deletedAt: now, updatedAt: now })
      .where(eq(schema.resumes.id, id));

    // Also soft delete all variants if this is a master resume
    if (existingResume.isMaster) {
      await db
        .update(schema.resumes)
        .set({ deletedAt: now, updatedAt: now })
        .where(and(eq(schema.resumes.parentResumeId, id), isNull(schema.resumes.deletedAt)));
    }

    return NextResponse.json({
      success: true,
      message: "Resume deleted",
    });
  } catch (error) {
    console.error("Delete resume error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
