import { db } from "@scaffold-review/database/client";
import * as schema from "@scaffold-review/database/schema";
import { eq, and, isNull } from "drizzle-orm";
import Anthropic from "@anthropic-ai/sdk";
import type { ToolExecutor, ToolContext } from "../types";
import type { AnalyzeJobPostingInput, CreateVariantInput, CompareToJobInput } from "../definitions";
import type { ResumeContent } from "@scaffold-review/database/schema/resumes";
import { scrapingExecutors } from "./scraping";

// Initialize Anthropic client
const anthropic = new Anthropic();

// Job analysis result type
interface JobAnalysis {
  title: string;
  company?: string;
  location?: string;
  requiredSkills: string[];
  preferredSkills: string[];
  requirements: string[];
  responsibilities: string[];
  keywords: string[];
  experienceLevel: string;
  salaryRange?: string;
}

// Comparison result type
interface ComparisonResult {
  matchScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  recommendations: string[];
  keywordMatches: string[];
  gaps: string[];
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

function getMessageText(message: Anthropic.Messages.Message): string {
  return message.content
    .map((block) => (block.type === "text" ? block.text : ""))
    .join("")
    .trim();
}

// Helper to get job description text
async function getJobDescription(
  jobUrl: string | undefined,
  jobDescription: string | undefined,
  context: ToolContext
): Promise<string> {
  if (jobDescription) {
    return jobDescription;
  }

  if (jobUrl) {
    const scrapeResult = await scrapingExecutors.scrape_url(
      { url: jobUrl, extractType: "job_posting" },
      context
    );

    if (scrapeResult.success && scrapeResult.data?.jobPosting) {
      const jp = scrapeResult.data.jobPosting;
      return [
        `Title: ${jp.title}`,
        jp.company ? `Company: ${jp.company}` : "",
        jp.location ? `Location: ${jp.location}` : "",
        `Description: ${jp.description}`,
        jp.requirements?.length ? `Requirements:\n${jp.requirements.join("\n")}` : "",
        jp.responsibilities?.length ? `Responsibilities:\n${jp.responsibilities.join("\n")}` : "",
        jp.skills?.length ? `Skills: ${jp.skills.join(", ")}` : "",
      ]
        .filter(Boolean)
        .join("\n\n");
    }
  }

  return "";
}

// Analyze Job Posting Executor
export const analyzeJobPostingExecutor: ToolExecutor<AnalyzeJobPostingInput, JobAnalysis> = async (
  input,
  context
) => {
  const { jobUrl, jobDescription } = input;

  if (!jobUrl && !jobDescription) {
    return {
      success: false,
      error: "Either jobUrl or jobDescription is required",
    };
  }

  const jobText = await getJobDescription(jobUrl, jobDescription, context);

  if (!jobText) {
    return {
      success: false,
      error: "Unable to retrieve job posting content",
    };
  }

  const systemPrompt = `You are an expert job posting analyzer. Extract structured information from job postings.

Return your analysis in this exact format:
TITLE: [job title]
COMPANY: [company name or "Not specified"]
LOCATION: [location or "Not specified"]
EXPERIENCE_LEVEL: [entry/mid/senior/executive]
SALARY: [salary range or "Not specified"]
REQUIRED_SKILLS: [comma-separated list]
PREFERRED_SKILLS: [comma-separated list]
REQUIREMENTS: [numbered list]
RESPONSIBILITIES: [numbered list]
KEYWORDS: [comma-separated list of important ATS keywords]`;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: `Analyze this job posting:\n\n${jobText}`,
      },
    ],
  });

  const responseText = getMessageText(message);

  // Parse the structured response
  const parseField = (field: string): string =>
    responseText.match(new RegExp(`${field}:\\s*([^\\n]+)`, "i"))?.[1]?.trim() || "";

  const parseList = (field: string): string[] => {
    const match = responseText.match(new RegExp(`${field}:\\s*([^\\n]+)`, "i"))?.[1];
    return match
      ? match
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean)
      : [];
  };

  const parseNumberedList = (field: string): string[] => {
    const section = responseText.match(
      new RegExp(`${field}:([\\s\\S]*?)(?=\\n[A-Z_]+:|$)`, "i")
    )?.[1];
    if (!section) return [];
    return section
      .split("\n")
      .filter((line: string) => /^\d+\./.test(line.trim()))
      .map((line: string) => line.replace(/^\d+\.\s*/, "").trim());
  };

  const analysis: JobAnalysis = {
    title: parseField("TITLE"),
    company: parseField("COMPANY") !== "Not specified" ? parseField("COMPANY") : undefined,
    location: parseField("LOCATION") !== "Not specified" ? parseField("LOCATION") : undefined,
    experienceLevel: parseField("EXPERIENCE_LEVEL") || "mid",
    salaryRange: parseField("SALARY") !== "Not specified" ? parseField("SALARY") : undefined,
    requiredSkills: parseList("REQUIRED_SKILLS"),
    preferredSkills: parseList("PREFERRED_SKILLS"),
    requirements: parseNumberedList("REQUIREMENTS"),
    responsibilities: parseNumberedList("RESPONSIBILITIES"),
    keywords: parseList("KEYWORDS"),
  };

  // Store in job_postings table if URL provided
  if (jobUrl) {
    await db
      .insert(schema.jobPostings)
      .values({
        tenantId: context.tenantId,
        url: jobUrl,
        title: analysis.title,
        company: analysis.company,
        location: analysis.location,
        description: jobText,
        requirements: analysis.requirements,
        keywords: analysis.keywords,
        salary: analysis.salaryRange,
        experienceLevel: analysis.experienceLevel,
      })
      .onConflictDoUpdate({
        target: [schema.jobPostings.url],
        set: {
          title: analysis.title,
          company: analysis.company,
        },
      });
  }

  return {
    success: true,
    data: analysis,
    streamContent: `Analyzed job: ${analysis.title}${analysis.company ? ` at ${analysis.company}` : ""}\n\nRequired Skills: ${analysis.requiredSkills.join(", ")}\nKeywords: ${analysis.keywords.join(", ")}`,
  };
};

// Create Variant Executor
export const createVariantExecutor: ToolExecutor<
  CreateVariantInput,
  typeof schema.resumes.$inferSelect
> = async (input, context) => {
  const { masterResumeId, targetJobTitle, targetJobUrl, variantName } = input;
  const { userId, tenantId } = context;

  const master = await getResumeWithAuth(masterResumeId, userId, tenantId);
  if (!master) {
    return {
      success: false,
      error: "Master resume not found or access denied",
    };
  }

  const title = variantName || `${master.title} - ${targetJobTitle}`;

  const [variant] = await db
    .insert(schema.resumes)
    .values({
      tenantId,
      userId,
      title,
      isPublic: false,
      isMaster: false,
      parentResumeId: masterResumeId,
      targetJobTitle,
      targetJobUrl: targetJobUrl || null,
      content: master.content as ResumeContent,
      template: master.template,
      theme: master.theme,
    })
    .returning();

  return {
    success: true,
    data: variant,
    streamContent: `Created variant "${title}" from master resume for ${targetJobTitle} role`,
  };
};

// Compare to Job Executor
export const compareToJobExecutor: ToolExecutor<CompareToJobInput, ComparisonResult> = async (
  input,
  context
) => {
  const { resumeId, jobUrl, jobDescription } = input;
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

  const jobText = await getJobDescription(jobUrl, jobDescription, context);
  if (!jobText) {
    return {
      success: false,
      error: "Unable to retrieve job posting content",
    };
  }

  // Get resume content for comparison
  const content = resume.content as ResumeContent;
  const resumeSkills: string[] = [];

  for (const section of content.sections || []) {
    if (section.type === "skills") {
      (section.content as any[]).forEach((item) => {
        if (item.skills) resumeSkills.push(...item.skills);
      });
    }
  }

  const systemPrompt = `You are an expert resume-to-job matching analyst. Compare the resume against the job posting.

Provide your analysis in this exact format:
MATCH_SCORE: [0-100]
MATCHED_SKILLS: [comma-separated list of skills found in both]
MISSING_SKILLS: [comma-separated list of required skills not in resume]
KEYWORD_MATCHES: [comma-separated list of matching keywords]
GAPS: [numbered list of significant gaps]
RECOMMENDATIONS: [numbered list of specific improvements]`;

  const resumeText = [
    content.personalInfo?.fullName ? `Name: ${content.personalInfo.fullName}` : "",
    content.summary ? `Summary: ${content.summary}` : "",
    resumeSkills.length ? `Skills: ${resumeSkills.join(", ")}` : "",
    ...content.sections
      .filter((s) => s.type === "experience")
      .flatMap((s) =>
        (s.content as any[]).map((item) => `Experience: ${item.position} at ${item.company}`)
      ),
  ]
    .filter(Boolean)
    .join("\n");

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: `Compare this resume to the job posting:\n\nRESUME:\n${resumeText}\n\nJOB POSTING:\n${jobText}`,
      },
    ],
  });

  const responseText = getMessageText(message);

  // Parse response
  const parseField = (field: string): string =>
    responseText.match(new RegExp(`${field}:\\s*([^\\n]+)`, "i"))?.[1]?.trim() || "";

  const parseList = (field: string): string[] => {
    const match = responseText.match(new RegExp(`${field}:\\s*([^\\n]+)`, "i"))?.[1];
    return match
      ? match
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean)
      : [];
  };

  const parseNumberedList = (field: string): string[] => {
    const section = responseText.match(
      new RegExp(`${field}:([\\s\\S]*?)(?=\\n[A-Z_]+:|$)`, "i")
    )?.[1];
    if (!section) return [];
    return section
      .split("\n")
      .filter((line: string) => /^\d+\./.test(line.trim()))
      .map((line: string) => line.replace(/^\d+\.\s*/, "").trim());
  };

  const matchScore = parseInt(parseField("MATCH_SCORE"), 10) || 0;

  const result: ComparisonResult = {
    matchScore,
    matchedSkills: parseList("MATCHED_SKILLS"),
    missingSkills: parseList("MISSING_SKILLS"),
    keywordMatches: parseList("KEYWORD_MATCHES"),
    gaps: parseNumberedList("GAPS"),
    recommendations: parseNumberedList("RECOMMENDATIONS"),
  };

  const scoreEmoji =
    matchScore >= 80 ? "🎯" : matchScore >= 60 ? "👍" : matchScore >= 40 ? "📈" : "⚠️";

  return {
    success: true,
    data: result,
    streamContent: `${scoreEmoji} Match Score: ${matchScore}%\n\nMatched Skills: ${result.matchedSkills.join(", ")}\n\nMissing Skills: ${result.missingSkills.join(", ")}\n\nTop Recommendations:\n${result.recommendations
      .slice(0, 3)
      .map((r, i) => `${i + 1}. ${r}`)
      .join("\n")}`,
  };
};

// Export job matching executors
export const jobMatchingExecutors = {
  analyze_job_posting: analyzeJobPostingExecutor,
  create_variant: createVariantExecutor,
  compare_to_job: compareToJobExecutor,
};
