import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { db } from "@scaffold-news/database/client";
import * as schema from "@scaffold-news/database/schema";
import { eq, and, isNull } from "drizzle-orm";
import type { ResumeContent, ResumeSection } from "@scaffold-news/types";

const updateSectionSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  visible: z.boolean().optional(),
  content: z.any().optional(),
  order: z.number().optional(),
});

interface RouteParams {
  params: Promise<{ id: string; sectionId: string }>;
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

    const { id, sectionId } = await params;

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

    const content = resume.content as ResumeContent;
    const section = content.sections?.find((s) => s.id === sectionId);

    if (!section) {
      return NextResponse.json({ error: "Section not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: section,
    });
  } catch (error) {
    console.error("Get section error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
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

    const { id, sectionId } = await params;

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
    const parsed = updateSectionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const content = resume.content as ResumeContent;
    const sectionIndex = content.sections?.findIndex((s) => s.id === sectionId);

    if (sectionIndex === undefined || sectionIndex === -1) {
      return NextResponse.json({ error: "Section not found" }, { status: 404 });
    }

    const updatedSection = {
      ...content.sections[sectionIndex],
      ...parsed.data,
    } as ResumeSection;

    const updatedSections = [...content.sections];
    updatedSections[sectionIndex] = updatedSection;

    await db
      .update(schema.resumes)
      .set({
        content: {
          ...content,
          sections: updatedSections,
        },
        updatedAt: new Date(),
      })
      .where(eq(schema.resumes.id, id));

    return NextResponse.json({
      success: true,
      data: updatedSection,
    });
  } catch (error) {
    console.error("Update section error:", error);
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

    const { id, sectionId } = await params;

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

    const content = resume.content as ResumeContent;
    const sectionIndex = content.sections?.findIndex((s) => s.id === sectionId);

    if (sectionIndex === undefined || sectionIndex === -1) {
      return NextResponse.json({ error: "Section not found" }, { status: 404 });
    }

    const updatedSections = content.sections.filter((s) => s.id !== sectionId);

    // Re-order remaining sections
    const reorderedSections = updatedSections.map((s, idx) => ({
      ...s,
      order: idx,
    }));

    await db
      .update(schema.resumes)
      .set({
        content: {
          ...content,
          sections: reorderedSections,
        },
        updatedAt: new Date(),
      })
      .where(eq(schema.resumes.id, id));

    return NextResponse.json({
      success: true,
      message: "Section deleted",
    });
  } catch (error) {
    console.error("Delete section error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
