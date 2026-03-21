import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { db } from "@scaffold-competition/database/client";
import * as schema from "@scaffold-competition/database/schema";
import { eq, and, isNull } from "drizzle-orm";
import type { ResumeContent, ResumeSection } from "@scaffold-competition/types";
import { nanoid } from "nanoid";

const addSectionSchema = z.object({
  type: z.enum([
    "summary",
    "experience",
    "education",
    "skills",
    "projects",
    "certifications",
    "languages",
    "awards",
    "publications",
    "volunteer",
    "custom",
  ]),
  title: z.string().min(1).max(255).optional(),
  content: z.any().optional(),
  order: z.number().optional(),
});

const defaultSectionTitles: Record<string, string> = {
  summary: "Professional Summary",
  experience: "Work Experience",
  education: "Education",
  skills: "Skills",
  projects: "Projects",
  certifications: "Certifications",
  languages: "Languages",
  awards: "Awards & Achievements",
  publications: "Publications",
  volunteer: "Volunteer Experience",
  custom: "Custom Section",
};

const defaultSectionContent: Record<string, unknown> = {
  summary: { text: "" },
  experience: [],
  education: [],
  skills: { categories: [] },
  projects: [],
  certifications: [],
  languages: [],
  awards: [],
  publications: [],
  volunteer: [],
  custom: [],
};

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

    // Get sections from content
    const content = resume.content as ResumeContent;
    const sections = content.sections || [];

    return NextResponse.json({
      success: true,
      data: sections,
    });
  } catch (error) {
    console.error("Get sections error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
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
    const parsed = addSectionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { type, title, content, order } = parsed.data;

    const currentContent = resume.content as ResumeContent;
    const sections = currentContent.sections || [];

    // Create new section
    const newSection: ResumeSection = {
      id: nanoid(),
      type,
      title: title || defaultSectionTitles[type] || "New Section",
      visible: true,
      order: order ?? sections.length,
      content: content || defaultSectionContent[type],
    } as ResumeSection;

    // Add section and re-order if needed
    const updatedSections = [...sections, newSection].sort((a, b) => a.order - b.order);

    // Update resume content
    await db
      .update(schema.resumes)
      .set({
        content: {
          ...currentContent,
          sections: updatedSections,
        },
        updatedAt: new Date(),
      })
      .where(eq(schema.resumes.id, id));

    return NextResponse.json(
      {
        success: true,
        data: newSection,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Add section error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
