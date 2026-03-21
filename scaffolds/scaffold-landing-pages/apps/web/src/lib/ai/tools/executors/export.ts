import { db } from "@scaffold-landing-pages/database/client";
import * as schema from "@scaffold-landing-pages/database/schema";
import { eq, and, isNull } from "drizzle-orm";
import type { ToolExecutor } from "../types";
import type { ExportPdfInput, ExportDocxInput, ExportJsonInput } from "../definitions";
import type { ResumeContent } from "@scaffold-landing-pages/database/schema/resumes";

// JSON Resume Schema format
interface JsonResumeSchema {
  basics?: {
    name?: string;
    label?: string;
    email?: string;
    phone?: string;
    url?: string;
    summary?: string;
    location?: {
      address?: string;
      postalCode?: string;
      city?: string;
      countryCode?: string;
      region?: string;
    };
    profiles?: Array<{
      network: string;
      username?: string;
      url: string;
    }>;
  };
  work?: Array<{
    name: string;
    position: string;
    url?: string;
    startDate?: string;
    endDate?: string;
    summary?: string;
    highlights?: string[];
  }>;
  education?: Array<{
    institution: string;
    area?: string;
    studyType?: string;
    startDate?: string;
    endDate?: string;
    score?: string;
    courses?: string[];
  }>;
  skills?: Array<{
    name: string;
    level?: string;
    keywords?: string[];
  }>;
  languages?: Array<{
    language: string;
    fluency: string;
  }>;
  projects?: Array<{
    name: string;
    description?: string;
    highlights?: string[];
    keywords?: string[];
    startDate?: string;
    endDate?: string;
    url?: string;
  }>;
  certificates?: Array<{
    name: string;
    date?: string;
    issuer?: string;
    url?: string;
  }>;
  awards?: Array<{
    title: string;
    date?: string;
    awarder?: string;
    summary?: string;
  }>;
  publications?: Array<{
    name: string;
    publisher?: string;
    releaseDate?: string;
    url?: string;
    summary?: string;
  }>;
  volunteer?: Array<{
    organization: string;
    position: string;
    url?: string;
    startDate?: string;
    endDate?: string;
    summary?: string;
    highlights?: string[];
  }>;
}

// Helper to verify resume ownership and get resume
async function getResumeWithAuth(
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

// Convert internal format to JSON Resume format
function toJsonResumeFormat(content: ResumeContent): JsonResumeSchema {
  const jsonResume: JsonResumeSchema = {};

  // Convert personal info to basics
  if (content.personalInfo) {
    const info = content.personalInfo;
    jsonResume.basics = {
      name: info.fullName,
      email: info.email,
      phone: info.phone,
      location: info.location ? { city: info.location } : undefined,
      profiles: [],
    };

    if (info.linkedinUrl) {
      jsonResume.basics.profiles?.push({
        network: "LinkedIn",
        url: info.linkedinUrl,
      });
    }
    if (info.githubUrl) {
      jsonResume.basics.profiles?.push({
        network: "GitHub",
        url: info.githubUrl,
      });
    }
    if (info.websiteUrl) {
      jsonResume.basics.url = info.websiteUrl;
    }
  }

  // Convert sections
  for (const section of content.sections || []) {
    if (!section.visible) continue;

    switch (section.type) {
      case "experience":
        jsonResume.work = (section.content as any[]).map((item) => ({
          name: item.company,
          position: item.position,
          startDate: item.startDate,
          endDate: item.isCurrent ? undefined : item.endDate,
          summary: item.description,
          highlights: item.highlights,
        }));
        break;

      case "education":
        jsonResume.education = (section.content as any[]).map((item) => ({
          institution: item.institution,
          studyType: item.degree,
          area: item.field,
          startDate: item.startDate,
          endDate: item.endDate,
          score: item.gpa,
        }));
        break;

      case "skills":
        jsonResume.skills = (section.content as any[]).map((item) => ({
          name: item.category || "Skills",
          level: item.level,
          keywords: item.skills,
        }));
        break;

      case "projects":
        jsonResume.projects = (section.content as any[]).map((item) => ({
          name: item.name,
          description: item.description,
          highlights: item.highlights,
          keywords: item.technologies,
          startDate: item.startDate,
          endDate: item.endDate,
          url: item.url,
        }));
        break;

      case "certifications":
        jsonResume.certificates = (section.content as any[]).map((item) => ({
          name: item.name,
          issuer: item.issuer,
          date: item.issueDate,
          url: item.credentialUrl,
        }));
        break;

      case "languages":
        jsonResume.languages = (section.content as any[]).map((item) => ({
          language: item.language,
          fluency: item.proficiency,
        }));
        break;

      case "awards":
        jsonResume.awards = (section.content as any[]).map((item) => ({
          title: item.title,
          awarder: item.issuer,
          date: item.date,
          summary: item.description,
        }));
        break;

      case "publications":
        jsonResume.publications = (section.content as any[]).map((item) => ({
          name: item.title,
          publisher: item.publisher,
          releaseDate: item.date,
          url: item.url,
          summary: item.description,
        }));
        break;

      case "volunteer":
        jsonResume.volunteer = (section.content as any[]).map((item) => ({
          organization: item.organization,
          position: item.role,
          startDate: item.startDate,
          endDate: item.endDate,
          summary: item.description,
          highlights: item.highlights,
        }));
        break;
    }
  }

  // Add summary if present
  if (content.summary) {
    if (!jsonResume.basics) jsonResume.basics = {};
    jsonResume.basics.summary = content.summary;
  }

  return jsonResume;
}

// Export PDF executor
export const exportPdfExecutor: ToolExecutor<
  ExportPdfInput,
  { exportUrl: string; format: "pdf" }
> = async (input, context) => {
  const { resumeId, template, pageSize = "letter" } = input;
  const { userId, tenantId } = context;

  const resume = await getResumeWithAuth(resumeId, userId, tenantId);
  if (!resume) {
    return {
      success: false,
      error: "Resume not found or access denied",
    };
  }

  // Generate export URL - the actual PDF generation happens via API
  const exportUrl = `/api/v1/resumes/${resumeId}/export/pdf?${new URLSearchParams({
    template: template || resume.template,
    pageSize,
  })}`;

  return {
    success: true,
    data: {
      exportUrl,
      format: "pdf",
    },
    streamContent: `PDF export ready. Download from: ${exportUrl}`,
  };
};

// Export DOCX executor
export const exportDocxExecutor: ToolExecutor<
  ExportDocxInput,
  { exportUrl: string; format: "docx" }
> = async (input, context) => {
  const { resumeId } = input;
  const { userId, tenantId } = context;

  const resume = await getResumeWithAuth(resumeId, userId, tenantId);
  if (!resume) {
    return {
      success: false,
      error: "Resume not found or access denied",
    };
  }

  const exportUrl = `/api/v1/resumes/${resumeId}/export/docx`;

  return {
    success: true,
    data: {
      exportUrl,
      format: "docx",
    },
    streamContent: `Word document export ready. Download from: ${exportUrl}`,
  };
};

// Export JSON executor
export const exportJsonExecutor: ToolExecutor<
  ExportJsonInput,
  { data: object; format: "json" | "json_resume" }
> = async (input, context) => {
  const { resumeId, format = "internal" } = input;
  const { userId, tenantId } = context;

  const resume = await getResumeWithAuth(resumeId, userId, tenantId);
  if (!resume) {
    return {
      success: false,
      error: "Resume not found or access denied",
    };
  }

  const content = resume.content as ResumeContent;

  if (format === "json_resume") {
    const jsonResume = toJsonResumeFormat(content);
    return {
      success: true,
      data: {
        data: jsonResume,
        format: "json_resume",
      },
      streamContent: "Exported resume in JSON Resume format",
    };
  }

  // Internal format - return as-is
  return {
    success: true,
    data: {
      data: {
        id: resume.id,
        title: resume.title,
        template: resume.template,
        theme: resume.theme,
        content,
        createdAt: resume.createdAt,
        updatedAt: resume.updatedAt,
      },
      format: "json",
    },
    streamContent: "Exported resume in internal JSON format",
  };
};

// Export all export executors
export const exportExecutors = {
  export_pdf: exportPdfExecutor,
  export_docx: exportDocxExecutor,
  export_json: exportJsonExecutor,
};
