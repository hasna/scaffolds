import { db } from "@scaffold-news/database/client";
import * as schema from "@scaffold-news/database/schema";
import { eq, and, isNull } from "drizzle-orm";
import Anthropic from "@anthropic-ai/sdk";
import type { ToolExecutor } from "../types";
import type {
  GenerateSummaryInput,
  GenerateBulletsInput,
  ImproveContentInput,
  TailorForJobInput,
} from "../definitions";
import type { ResumeContent } from "@scaffold-news/database/schema/resumes";

// Initialize Anthropic client
const anthropic = new Anthropic();

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

function getMessageText(message: Anthropic.Messages.Message): string {
  return message.content
    .map((block) => (block.type === "text" ? block.text : ""))
    .join("")
    .trim();
}

// Helper to get resume context for AI
function getResumeContext(content: ResumeContent): string {
  const parts: string[] = [];

  if (content.personalInfo?.fullName) {
    parts.push(`Name: ${content.personalInfo.fullName}`);
  }

  for (const section of content.sections || []) {
    if (!section.visible) continue;

    switch (section.type) {
      case "experience":
        parts.push("\nExperience:");
        (section.content as any[]).forEach((item) => {
          parts.push(`- ${item.position} at ${item.company}`);
          if (item.description) parts.push(`  ${item.description}`);
          if (item.highlights?.length) {
            item.highlights.forEach((h: string) => parts.push(`  • ${h}`));
          }
        });
        break;

      case "education":
        parts.push("\nEducation:");
        (section.content as any[]).forEach((item) => {
          parts.push(`- ${item.degree} ${item.field || ""} from ${item.institution}`);
        });
        break;

      case "skills":
        parts.push("\nSkills:");
        (section.content as any[]).forEach((item) => {
          const skills = item.skills?.join(", ") || "";
          parts.push(`- ${item.category || "General"}: ${skills}`);
        });
        break;

      case "projects":
        parts.push("\nProjects:");
        (section.content as any[]).forEach((item) => {
          parts.push(`- ${item.name}: ${item.description || ""}`);
        });
        break;
    }
  }

  return parts.join("\n");
}

// Generate Summary Executor
export const generateSummaryExecutor: ToolExecutor<
  GenerateSummaryInput,
  { summary: string }
> = async (input, context) => {
  const { resumeId, style = "professional", targetJob, maxLength = 100 } = input;
  const { userId, tenantId } = context;

  const resume = await getResumeWithAuth(resumeId, userId, tenantId);
  if (!resume) {
    return {
      success: false,
      error: "Resume not found or access denied",
    };
  }

  const content = resume.content as ResumeContent;
  const resumeContext = getResumeContext(content);

  const systemPrompt = `You are an expert resume writer. Generate a ${style} professional summary/objective statement.
Guidelines:
- Be concise (max ${maxLength} words)
- Use strong action verbs
- Highlight key achievements and skills
- ${targetJob ? `Tailor for the target role: ${targetJob}` : "Keep it versatile"}
- Write in first person without using "I"
- Focus on value proposition to employers`;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 500,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: `Generate a professional summary for this resume:\n\n${resumeContext}`,
      },
    ],
  });

  const summary = getMessageText(message);

  // Update the resume with the new summary
  await db
    .update(schema.resumes)
    .set({
      content: {
        ...content,
        summary,
      },
      updatedAt: new Date(),
    })
    .where(eq(schema.resumes.id, resumeId));

  return {
    success: true,
    data: { summary },
    streamContent: summary,
  };
};

// Generate Bullets Executor
export const generateBulletsExecutor: ToolExecutor<
  GenerateBulletsInput,
  { bullets: string[] }
> = async (input, context) => {
  const { resumeId, sectionId, entryId, context: additionalContext, count = 4 } = input;
  const { userId, tenantId } = context;

  const resume = await getResumeWithAuth(resumeId, userId, tenantId);
  if (!resume) {
    return {
      success: false,
      error: "Resume not found or access denied",
    };
  }

  const content = resume.content as ResumeContent;
  const section = content.sections?.find((s) => s.id === sectionId);

  if (!section) {
    return {
      success: false,
      error: "Section not found",
    };
  }

  const entry = (section.content as any[]).find((item: any) => item.id === entryId);
  if (!entry) {
    return {
      success: false,
      error: "Entry not found",
    };
  }

  const entryContext =
    section.type === "experience"
      ? `Position: ${entry.position}\nCompany: ${entry.company}\nDescription: ${entry.description || "Not provided"}`
      : `Project: ${entry.name}\nDescription: ${entry.description || "Not provided"}`;

  const systemPrompt = `You are an expert resume writer. Generate ${count} achievement-focused bullet points.
Guidelines:
- Use the STAR method (Situation, Task, Action, Result)
- Start each bullet with a strong action verb
- Quantify achievements where possible (%, $, numbers)
- Be specific and avoid vague statements
- Each bullet should be 1-2 lines max
- Focus on impact and results, not just responsibilities`;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1000,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: `Generate bullet points for:\n\n${entryContext}${additionalContext ? `\n\nAdditional context: ${additionalContext}` : ""}\n\nReturn only the bullet points, one per line, starting with "•"`,
      },
    ],
  });

  const responseText = getMessageText(message);
  const bullets = responseText
    .split("\n")
    .filter((line: string) => line.trim().startsWith("•"))
    .map((line: string) => line.replace(/^•\s*/, "").trim());

  return {
    success: true,
    data: { bullets },
    streamContent: bullets.map((b) => `• ${b}`).join("\n"),
  };
};

// Improve Content Executor
export const improveContentExecutor: ToolExecutor<
  ImproveContentInput,
  { improved: string; changes: string[] }
> = async (input, context) => {
  const { resumeId, sectionId, entryId, improvements = ["professional", "action_verbs"] } = input;
  const { userId, tenantId } = context;

  const resume = await getResumeWithAuth(resumeId, userId, tenantId);
  if (!resume) {
    return {
      success: false,
      error: "Resume not found or access denied",
    };
  }

  const content = resume.content as ResumeContent;
  const section = content.sections?.find((s) => s.id === sectionId);

  if (!section) {
    return {
      success: false,
      error: "Section not found",
    };
  }

  let textToImprove = "";

  if (entryId) {
    const entry = (section.content as any[]).find((item: any) => item.id === entryId);
    if (!entry) {
      return {
        success: false,
        error: "Entry not found",
      };
    }
    textToImprove = entry.description || entry.highlights?.join("\n") || "";
  } else {
    textToImprove = (section.content as any[])
      .map((item: any) => item.description || item.highlights?.join("\n") || "")
      .filter(Boolean)
      .join("\n\n");
  }

  if (!textToImprove) {
    return {
      success: false,
      error: "No content to improve",
    };
  }

  const improvementInstructions = improvements
    .map((imp) => {
      switch (imp) {
        case "grammar":
          return "Fix any grammar, spelling, or punctuation errors";
        case "action_verbs":
          return "Replace weak verbs with strong action verbs";
        case "quantify":
          return "Add quantifiable metrics where possible (suggest placeholders like [X%] if needed)";
        case "concise":
          return "Make the content more concise without losing meaning";
        case "professional":
          return "Ensure professional tone and language";
        case "ats_friendly":
          return "Use standard terminology that ATS systems recognize";
        default:
          return "";
      }
    })
    .filter(Boolean);

  const systemPrompt = `You are an expert resume editor. Improve the following content according to these guidelines:
${improvementInstructions.map((i, idx) => `${idx + 1}. ${i}`).join("\n")}

Return the improved content and list the specific changes made.`;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1500,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: `Original content:\n\n${textToImprove}\n\nProvide the improved version followed by "CHANGES:" and a list of changes made.`,
      },
    ],
  });

  const responseText = getMessageText(message);

  const [improved = "", changesSection = ""] = responseText.split("CHANGES:");
  const changes = changesSection
    ? changesSection
        .split("\n")
        .filter((line: string) => line.trim().startsWith("-") || line.trim().startsWith("•"))
        .map((line: string) => line.replace(/^[-•]\s*/, "").trim())
    : [];

  return {
    success: true,
    data: {
      improved: improved.trim(),
      changes,
    },
    streamContent: `Improved content with ${changes.length} changes:\n${improved.trim()}`,
  };
};

// Tailor For Job Executor
export const tailorForJobExecutor: ToolExecutor<
  TailorForJobInput,
  { tailoredSections: string[]; keywords: string[] }
> = async (input, context) => {
  const { resumeId, jobUrl, jobDescription, sections: _sections } = input;
  const { userId, tenantId } = context;

  if (!jobUrl && !jobDescription) {
    return {
      success: false,
      error: "Either jobUrl or jobDescription is required",
    };
  }

  const resume = await getResumeWithAuth(resumeId, userId, tenantId);
  if (!resume) {
    return {
      success: false,
      error: "Resume not found or access denied",
    };
  }

  const content = resume.content as ResumeContent;
  let jobText = jobDescription || "";

  // If URL provided, we would scrape it (simplified for now)
  if (jobUrl && !jobDescription) {
    jobText = `Job posting from: ${jobUrl}`;
  }

  const resumeContext = getResumeContext(content);

  const systemPrompt = `You are an expert resume tailoring specialist. Analyze the job posting and suggest specific improvements to tailor the resume.

Focus on:
1. Identifying key skills and keywords from the job posting
2. Suggesting which resume sections need emphasis
3. Recommending keyword additions for ATS optimization
4. Highlighting transferable skills

Return a structured response with:
- KEYWORDS: comma-separated list of important keywords
- SECTIONS: which sections to emphasize
- SUGGESTIONS: specific tailoring recommendations`;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: `Job Posting:\n${jobText}\n\nCurrent Resume:\n${resumeContext}\n\nProvide tailoring recommendations.`,
      },
    ],
  });

  const responseText = getMessageText(message);

  // Parse response
  const keywordsMatch = responseText.match(/KEYWORDS:\s*([^\n]+)/i)?.[1];
  const keywords = keywordsMatch ? keywordsMatch.split(",").map((k: string) => k.trim()) : [];

  const sectionsMatch = responseText.match(/SECTIONS:\s*([^\n]+)/i)?.[1];
  const tailoredSections = sectionsMatch
    ? sectionsMatch.split(",").map((s: string) => s.trim())
    : [];

  return {
    success: true,
    data: {
      tailoredSections,
      keywords,
    },
    streamContent: `Identified ${keywords.length} key keywords and ${tailoredSections.length} sections to emphasize.\n\nKeywords: ${keywords.join(", ")}`,
  };
};

// Export content generation executors
export const contentGenerationExecutors = {
  generate_summary: generateSummaryExecutor,
  generate_bullets: generateBulletsExecutor,
  improve_content: improveContentExecutor,
  tailor_for_job: tailorForJobExecutor,
};
