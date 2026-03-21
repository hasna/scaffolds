import { db } from "@scaffold-competition/database/client";
import * as schema from "@scaffold-competition/database/schema";
import { eq, and, isNull, desc } from "drizzle-orm";
import type { ToolExecutor } from "../types";
import type {
  GetResumeInput,
  CreateResumeInput,
  UpdateResumeInput,
  ListResumesInput,
} from "../definitions";
import type { ResumeContent, ResumeTheme } from "@scaffold-competition/database/schema/resumes";

// Get Resume
export const getResumeExecutor: ToolExecutor<
  GetResumeInput,
  typeof schema.resumes.$inferSelect
> = async (input, context) => {
  const { resumeId } = input;
  const { userId, tenantId } = context;

  const resume = await db.query.resumes.findFirst({
    where: and(
      eq(schema.resumes.id, resumeId),
      eq(schema.resumes.tenantId, tenantId),
      eq(schema.resumes.userId, userId),
      isNull(schema.resumes.deletedAt)
    ),
  });

  if (!resume) {
    return {
      success: false,
      error: "Resume not found or access denied",
    };
  }

  return {
    success: true,
    data: resume,
    streamContent: `Found resume: "${resume.title}"`,
  };
};

// Create Resume
export const createResumeExecutor: ToolExecutor<
  CreateResumeInput,
  typeof schema.resumes.$inferSelect
> = async (input, context) => {
  const { title, template = "modern", contact, isMaster = false } = input;
  const { userId, tenantId } = context;

  const content: ResumeContent = {
    personalInfo: contact
      ? {
          fullName: contact.fullName,
          email: contact.email,
          phone: contact.phone,
          location: contact.location,
          linkedinUrl: contact.linkedin,
          githubUrl: contact.github,
          websiteUrl: contact.website,
        }
      : undefined,
    sections: [],
  };

  const [resume] = await db
    .insert(schema.resumes)
    .values({
      tenantId,
      userId,
      title,
      template,
      isMaster,
      content,
      isPublic: false,
    })
    .returning();

  return {
    success: true,
    data: resume,
    streamContent: `Created new resume: "${title}"`,
  };
};

// Update Resume
export const updateResumeExecutor: ToolExecutor<
  UpdateResumeInput,
  typeof schema.resumes.$inferSelect
> = async (input, context) => {
  const { resumeId, title, template, theme, targetJobTitle, targetJobUrl } = input;
  const { userId, tenantId } = context;

  // Verify ownership
  const existing = await db.query.resumes.findFirst({
    where: and(
      eq(schema.resumes.id, resumeId),
      eq(schema.resumes.tenantId, tenantId),
      eq(schema.resumes.userId, userId),
      isNull(schema.resumes.deletedAt)
    ),
  });

  if (!existing) {
    return {
      success: false,
      error: "Resume not found or access denied",
    };
  }

  const updateData: Partial<typeof schema.resumes.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (title !== undefined) updateData.title = title;
  if (template !== undefined) updateData.template = template;
  if (targetJobTitle !== undefined) updateData.targetJobTitle = targetJobTitle;
  if (targetJobUrl !== undefined) updateData.targetJobUrl = targetJobUrl;
  if (theme !== undefined) {
    updateData.theme = {
      ...existing.theme,
      ...theme,
    } as ResumeTheme;
  }

  const [updated] = await db
    .update(schema.resumes)
    .set(updateData)
    .where(eq(schema.resumes.id, resumeId))
    .returning();

  const changes: string[] = [];
  if (title) changes.push(`title to "${title}"`);
  if (template) changes.push(`template to "${template}"`);
  if (theme) changes.push("theme settings");
  if (targetJobTitle) changes.push(`target job to "${targetJobTitle}"`);

  return {
    success: true,
    data: updated,
    streamContent: `Updated resume: ${changes.join(", ")}`,
  };
};

// List Resumes
export const listResumesExecutor: ToolExecutor<
  ListResumesInput,
  Array<typeof schema.resumes.$inferSelect>
> = async (input, context) => {
  const { includeDeleted = false, limit = 50 } = input;
  const { userId, tenantId } = context;

  const conditions = [eq(schema.resumes.tenantId, tenantId), eq(schema.resumes.userId, userId)];

  if (!includeDeleted) {
    conditions.push(isNull(schema.resumes.deletedAt));
  }

  const resumes = await db.query.resumes.findMany({
    where: and(...conditions),
    orderBy: [desc(schema.resumes.updatedAt)],
    limit,
  });

  return {
    success: true,
    data: resumes,
    streamContent: `Found ${resumes.length} resume(s)`,
  };
};

// Export all resume executors
export const resumeExecutors = {
  get_resume: getResumeExecutor,
  create_resume: createResumeExecutor,
  update_resume: updateResumeExecutor,
  list_resumes: listResumesExecutor,
};
