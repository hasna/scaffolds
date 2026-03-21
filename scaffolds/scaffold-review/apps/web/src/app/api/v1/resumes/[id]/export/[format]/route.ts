import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@scaffold-review/database/client";
import * as schema from "@scaffold-review/database/schema";
import { eq, and, isNull } from "drizzle-orm";
import type { ResumeContent } from "@scaffold-review/database/schema/resumes";
import { renderToBuffer } from "@react-pdf/renderer";
import {
  ModernPdfTemplate,
  ClassicPdfTemplate,
  MinimalPdfTemplate,
} from "@/components/resume/templates/pdf";

// Types for section content items
interface ExperienceContentItem {
  position?: string;
  company?: string;
  startDate?: string;
  endDate?: string;
  isCurrent?: boolean;
  description?: string;
  highlights?: string[];
}

interface EducationContentItem {
  degree?: string;
  field?: string;
  institution?: string;
  startDate?: string;
  endDate?: string;
  gpa?: string;
}

interface SkillContentItem {
  category?: string;
  skills?: string[];
  level?: string;
}

interface GenericContentItem {
  title?: string;
  name?: string;
  description?: string;
}

type SectionItem =
  | ExperienceContentItem
  | EducationContentItem
  | SkillContentItem
  | GenericContentItem;

interface RouteParams {
  params: Promise<{ id: string; format: string }>;
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

    const { id: resumeId, format } = await params;

    // Validate format
    if (!["pdf", "docx", "json"].includes(format)) {
      return NextResponse.json(
        { error: "Invalid format. Supported: pdf, docx, json" },
        { status: 400 }
      );
    }

    // Verify resume ownership
    const resume = await db.query.resumes.findFirst({
      where: and(
        eq(schema.resumes.id, resumeId),
        eq(schema.resumes.tenantId, tenantId),
        eq(schema.resumes.userId, session.user.id),
        isNull(schema.resumes.deletedAt)
      ),
    });

    if (!resume) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 });
    }

    const content = resume.content as ResumeContent;
    const searchParams = _request.nextUrl.searchParams;
    const template = searchParams.get("template") ?? resume.template;

    switch (format) {
      case "pdf":
        return await exportPdf(resume, content, template);
      case "docx":
        return await exportDocx(resume, content);
      case "json":
        return exportJson(resume, content, searchParams.get("format") ?? "internal");
      default:
        return NextResponse.json({ error: "Invalid format" }, { status: 400 });
    }
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

async function exportPdf(
  resume: typeof schema.resumes.$inferSelect,
  content: ResumeContent,
  template: string
) {
  // Select template component
  let TemplateComponent;
  switch (template) {
    case "classic":
      TemplateComponent = ClassicPdfTemplate;
      break;
    case "minimal":
      TemplateComponent = MinimalPdfTemplate;
      break;
    case "modern":
    default:
      TemplateComponent = ModernPdfTemplate;
  }

  // Render PDF to buffer
  const pdfBuffer = await renderToBuffer(TemplateComponent({ content, title: resume.title }));

  // Create filename
  const filename = `${resume.title.replace(/[^a-z0-9]/gi, "_")}_resume.pdf`;

  return new Response(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

async function exportDocx(resume: typeof schema.resumes.$inferSelect, content: ResumeContent) {
  // For DOCX, we'll create a simple XML-based document
  // In production, you'd use a library like docx-templates or similar

  const filename = `${resume.title.replace(/[^a-z0-9]/gi, "_")}_resume.docx`;

  // Simple text export for now - in production use proper DOCX generation
  const textContent = generatePlainText(content);

  return new Response(textContent, {
    headers: {
      "Content-Type": "text/plain",
      "Content-Disposition": `attachment; filename="${filename.replace(".docx", ".txt")}"`,
    },
  });
}

function exportJson(
  resume: typeof schema.resumes.$inferSelect,
  content: ResumeContent,
  format: string
) {
  let jsonData;

  if (format === "json_resume") {
    // Convert to JSON Resume format
    jsonData = toJsonResumeFormat(content);
  } else {
    // Internal format
    jsonData = {
      id: resume.id,
      title: resume.title,
      template: resume.template,
      theme: resume.theme,
      content,
      createdAt: resume.createdAt,
      updatedAt: resume.updatedAt,
    };
  }

  const filename = `${resume.title.replace(/[^a-z0-9]/gi, "_")}_resume.json`;

  return new Response(JSON.stringify(jsonData, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

function generatePlainText(content: ResumeContent): string {
  const lines: string[] = [];

  if (content.personalInfo) {
    const info = content.personalInfo;
    if (info.fullName) lines.push(info.fullName.toUpperCase(), "");
    if (info.email) lines.push(`Email: ${info.email}`);
    if (info.phone) lines.push(`Phone: ${info.phone}`);
    if (info.location) lines.push(`Location: ${info.location}`);
    lines.push("");
  }

  if (content.summary) {
    lines.push("PROFESSIONAL SUMMARY", "-".repeat(40), content.summary, "");
  }

  for (const section of content.sections || []) {
    if (!section.visible) continue;

    lines.push(section.title.toUpperCase(), "-".repeat(40));

    const items = (Array.isArray(section.content) ? section.content : []) as SectionItem[];
    for (const item of items) {
      switch (section.type) {
        case "experience": {
          const exp = item as ExperienceContentItem;
          lines.push(`${exp.position ?? ""} at ${exp.company ?? ""}`);
          if (exp.startDate) {
            const dateRange = exp.isCurrent
              ? `${exp.startDate} - Present`
              : `${exp.startDate} - ${exp.endDate ?? ""}`;
            lines.push(dateRange);
          }
          if (exp.description) lines.push(exp.description);
          if (exp.highlights) {
            exp.highlights.forEach((h) => lines.push(`• ${h}`));
          }
          lines.push("");
          break;
        }

        case "education": {
          const edu = item as EducationContentItem;
          lines.push(`${edu.degree ?? ""} ${edu.field ?? ""}`);
          lines.push(edu.institution ?? "");
          if (edu.startDate) {
            lines.push(`${edu.startDate} - ${edu.endDate ?? ""}`);
          }
          lines.push("");
          break;
        }

        case "skills": {
          const skill = item as SkillContentItem;
          if (skill.category) {
            lines.push(`${skill.category}: ${skill.skills?.join(", ") ?? ""}`);
          } else {
            lines.push(skill.skills?.join(", ") ?? "");
          }
          break;
        }

        default: {
          const generic = item as GenericContentItem;
          if (generic.title ?? generic.name) {
            lines.push(generic.title ?? generic.name ?? "");
          }
          if (generic.description) {
            lines.push(generic.description);
          }
          lines.push("");
        }
      }
    }

    lines.push("");
  }

  return lines.join("\n");
}

function toJsonResumeFormat(content: ResumeContent): object {
  const jsonResume: Record<string, unknown> = {};

  if (content.personalInfo) {
    const info = content.personalInfo;
    jsonResume.basics = {
      name: info.fullName,
      email: info.email,
      phone: info.phone,
      location: info.location ? { city: info.location } : undefined,
      profiles: [
        info.linkedinUrl && { network: "LinkedIn", url: info.linkedinUrl },
        info.githubUrl && { network: "GitHub", url: info.githubUrl },
      ].filter(Boolean),
    };

    if (content.summary) {
      (jsonResume.basics as Record<string, unknown>).summary = content.summary;
    }
  }

  for (const section of content.sections || []) {
    if (!section.visible) continue;

    const items = (Array.isArray(section.content) ? section.content : []) as SectionItem[];
    switch (section.type) {
      case "experience":
        jsonResume.work = items.map((item) => {
          const exp = item as ExperienceContentItem;
          return {
            name: exp.company,
            position: exp.position,
            startDate: exp.startDate,
            endDate: exp.isCurrent ? undefined : exp.endDate,
            summary: exp.description,
            highlights: exp.highlights,
          };
        });
        break;

      case "education":
        jsonResume.education = items.map((item) => {
          const edu = item as EducationContentItem;
          return {
            institution: edu.institution,
            studyType: edu.degree,
            area: edu.field,
            startDate: edu.startDate,
            endDate: edu.endDate,
            score: edu.gpa,
          };
        });
        break;

      case "skills":
        jsonResume.skills = items.map((item) => {
          const skill = item as SkillContentItem;
          return {
            name: skill.category ?? "Skills",
            level: skill.level,
            keywords: skill.skills,
          };
        });
        break;
    }
  }

  return jsonResume;
}
