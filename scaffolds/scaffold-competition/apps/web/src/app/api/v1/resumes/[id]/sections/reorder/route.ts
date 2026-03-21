import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { db } from "@scaffold-competition/database/client";
import * as schema from "@scaffold-competition/database/schema";
import { eq, and, isNull } from "drizzle-orm";
import type { ResumeContent, ResumeSection } from "@scaffold-competition/types";

const reorderSchema = z.object({
  sectionIds: z.array(z.string()),
});

interface RouteParams {
  params: Promise<{ id: string }>;
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
    const parsed = reorderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { sectionIds } = parsed.data;
    const content = resume.content as ResumeContent;
    const sections = content.sections || [];

    // Validate that all section IDs exist
    const existingIds = new Set(sections.map((s) => s.id));
    const invalidIds = sectionIds.filter((id) => !existingIds.has(id));

    if (invalidIds.length > 0) {
      return NextResponse.json(
        { error: "Invalid section IDs", details: { invalidIds } },
        { status: 400 }
      );
    }

    // Create a map for quick lookup
    const sectionMap = new Map(sections.map((s) => [s.id, s]));

    // Reorder based on provided order
    const reorderedSections = sectionIds
      .map((sectionId, index) => {
        const section = sectionMap.get(sectionId);
        if (section) {
          return { ...section, order: index } as ResumeSection;
        }
        return null;
      })
      .filter((s): s is ResumeSection => s !== null);

    // Add any sections not in the provided order at the end
    const providedIdsSet = new Set(sectionIds);
    const missingSections = sections
      .filter((s) => !providedIdsSet.has(s.id))
      .map((s, idx) => ({ ...s, order: reorderedSections.length + idx }) as ResumeSection);

    const finalSections = [...reorderedSections, ...missingSections];

    await db
      .update(schema.resumes)
      .set({
        content: {
          ...content,
          sections: finalSections,
        },
        updatedAt: new Date(),
      })
      .where(eq(schema.resumes.id, id));

    return NextResponse.json({
      success: true,
      data: finalSections,
    });
  } catch (error) {
    console.error("Reorder sections error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
