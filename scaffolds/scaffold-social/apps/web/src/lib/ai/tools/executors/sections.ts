import { db } from "@scaffold-social/database/client";
import * as schema from "@scaffold-social/database/schema";
import { eq, and, isNull } from "drizzle-orm";
import { nanoid } from "nanoid";
import type { ToolExecutor } from "../types";
import type {
  AddSectionInput,
  UpdateSectionInput,
  RemoveSectionInput,
  ReorderSectionsInput,
} from "../definitions";
import type { ResumeContent, ResumeSection } from "@scaffold-social/database/schema/resumes";

// Default section titles
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

// Default section content
const getDefaultContent = (type: string): unknown => {
  switch (type) {
    case "summary":
      return { text: "" };
    case "skills":
      return { categories: [] };
    default:
      return [];
  }
};

// Helper to verify resume ownership
async function verifyResumeOwnership(
  resumeId: string,
  userId: string,
  tenantId: string
): Promise<typeof schema.resumes.$inferSelect | null> {
  const resume = await db.query.resumes.findFirst({
    where: and(
      eq(schema.resumes.id, resumeId),
      eq(schema.resumes.tenantId, tenantId),
      eq(schema.resumes.userId, userId),
      isNull(schema.resumes.deletedAt)
    ),
  });

  return resume ?? null;
}

// Add Section
export const addSectionExecutor: ToolExecutor<AddSectionInput, ResumeSection> = async (
  input,
  context
) => {
  const { resumeId, type, title, content, order } = input;
  const { userId, tenantId } = context;

  const resume = await verifyResumeOwnership(resumeId, userId, tenantId);
  if (!resume) {
    return {
      success: false,
      error: "Resume not found or access denied",
    };
  }

  const currentContent = resume.content as ResumeContent;
  const sections = currentContent.sections || [];

  const newSection: ResumeSection = {
    id: nanoid(),
    type: type as ResumeSection["type"],
    title: title || defaultSectionTitles[type] || "New Section",
    order: order ?? sections.length,
    visible: true,
    content: (content || getDefaultContent(type)) as ResumeSection["content"],
  };

  const updatedSections = [...sections, newSection].sort((a, b) => a.order - b.order);

  await db
    .update(schema.resumes)
    .set({
      content: {
        ...currentContent,
        sections: updatedSections,
      },
      updatedAt: new Date(),
    })
    .where(eq(schema.resumes.id, resumeId));

  return {
    success: true,
    data: newSection,
    streamContent: `Added "${newSection.title}" section to the resume`,
  };
};

// Update Section
export const updateSectionExecutor: ToolExecutor<UpdateSectionInput, ResumeSection> = async (
  input,
  context
) => {
  const { resumeId, sectionId, title, content, visible } = input;
  const { userId, tenantId } = context;

  const resume = await verifyResumeOwnership(resumeId, userId, tenantId);
  if (!resume) {
    return {
      success: false,
      error: "Resume not found or access denied",
    };
  }

  const currentContent = resume.content as ResumeContent;
  const sections = currentContent.sections || [];
  const sectionIndex = sections.findIndex((s) => s.id === sectionId);

  if (sectionIndex === -1) {
    return {
      success: false,
      error: "Section not found",
    };
  }

  const existingSection = sections[sectionIndex];
  if (!existingSection) {
    return {
      success: false,
      error: "Section not found",
    };
  }

  const updatedSection: ResumeSection = {
    ...existingSection,
  };

  if (title !== undefined) updatedSection.title = title;
  if (content !== undefined) updatedSection.content = content as ResumeSection["content"];
  if (visible !== undefined) updatedSection.visible = visible;

  const updatedSections = [...sections];
  updatedSections[sectionIndex] = updatedSection;

  await db
    .update(schema.resumes)
    .set({
      content: {
        ...currentContent,
        sections: updatedSections,
      },
      updatedAt: new Date(),
    })
    .where(eq(schema.resumes.id, resumeId));

  const changes: string[] = [];
  if (title !== undefined) changes.push(`title to "${title}"`);
  if (content !== undefined) changes.push("content");
  if (visible !== undefined) changes.push(`visibility to ${visible ? "visible" : "hidden"}`);

  return {
    success: true,
    data: updatedSection,
    streamContent: `Updated section: ${changes.join(", ")}`,
  };
};

// Remove Section
export const removeSectionExecutor: ToolExecutor<RemoveSectionInput, { deleted: boolean }> = async (
  input,
  context
) => {
  const { resumeId, sectionId } = input;
  const { userId, tenantId } = context;

  const resume = await verifyResumeOwnership(resumeId, userId, tenantId);
  if (!resume) {
    return {
      success: false,
      error: "Resume not found or access denied",
    };
  }

  const currentContent = resume.content as ResumeContent;
  const sections = currentContent.sections || [];
  const sectionToRemove = sections.find((s) => s.id === sectionId);

  if (!sectionToRemove) {
    return {
      success: false,
      error: "Section not found",
    };
  }

  const updatedSections = sections
    .filter((s) => s.id !== sectionId)
    .map((s, idx) => ({ ...s, order: idx }));

  await db
    .update(schema.resumes)
    .set({
      content: {
        ...currentContent,
        sections: updatedSections,
      },
      updatedAt: new Date(),
    })
    .where(eq(schema.resumes.id, resumeId));

  return {
    success: true,
    data: { deleted: true },
    streamContent: `Removed "${sectionToRemove.title}" section from the resume`,
  };
};

// Reorder Sections
export const reorderSectionsExecutor: ToolExecutor<ReorderSectionsInput, ResumeSection[]> = async (
  input,
  context
) => {
  const { resumeId, sectionOrder } = input;
  const { userId, tenantId } = context;

  const resume = await verifyResumeOwnership(resumeId, userId, tenantId);
  if (!resume) {
    return {
      success: false,
      error: "Resume not found or access denied",
    };
  }

  const currentContent = resume.content as ResumeContent;
  const sections = currentContent.sections || [];

  // Validate that all section IDs exist
  const existingIds = new Set(sections.map((s) => s.id));
  const invalidIds = sectionOrder.filter((id) => !existingIds.has(id));

  if (invalidIds.length > 0) {
    return {
      success: false,
      error: `Invalid section IDs: ${invalidIds.join(", ")}`,
    };
  }

  // Create section map for lookup
  const sectionMap = new Map(sections.map((s) => [s.id, s]));

  // Reorder based on provided order
  const reorderedSections = sectionOrder
    .map((sectionId, index) => {
      const section = sectionMap.get(sectionId);
      if (section) {
        return { ...section, order: index };
      }
      return null;
    })
    .filter((s): s is ResumeSection => s !== null);

  // Add any sections not in the provided order at the end
  const providedIdsSet = new Set(sectionOrder);
  const missingSections = sections
    .filter((s) => !providedIdsSet.has(s.id))
    .map((s, idx) => ({ ...s, order: reorderedSections.length + idx }));

  const finalSections = [...reorderedSections, ...missingSections];

  await db
    .update(schema.resumes)
    .set({
      content: {
        ...currentContent,
        sections: finalSections,
      },
      updatedAt: new Date(),
    })
    .where(eq(schema.resumes.id, resumeId));

  return {
    success: true,
    data: finalSections,
    streamContent: `Reordered ${reorderedSections.length} sections`,
  };
};

// Export all section executors
export const sectionExecutors = {
  add_section: addSectionExecutor,
  update_section: updateSectionExecutor,
  remove_section: removeSectionExecutor,
  reorder_sections: reorderSectionsExecutor,
};
