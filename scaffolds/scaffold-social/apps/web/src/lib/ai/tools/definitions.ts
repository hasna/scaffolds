import { z } from "zod";

// Data Extraction Tools
export const scrapeUrlTool = {
  name: "scrape_url",
  description:
    "Extract profile/resume information from any URL (LinkedIn, GitHub, portfolio sites, or any webpage). Returns structured data that can be used to populate resume sections.",
  inputSchema: z.object({
    url: z.string().url().describe("The URL to scrape for profile information"),
    extractType: z
      .enum(["profile", "job_posting", "general"])
      .optional()
      .describe("Type of content to extract. Default is 'profile'."),
  }),
};

// Resume CRUD Tools
export const getResumeTool = {
  name: "get_resume",
  description: "Retrieve a resume by ID. Returns the full resume content including all sections.",
  inputSchema: z.object({
    resumeId: z.string().uuid().describe("The ID of the resume to retrieve"),
  }),
};

export const createResumeTool = {
  name: "create_resume",
  description:
    "Create a new resume with initial content. Use this when the user wants to start a new resume from scratch or from imported data.",
  inputSchema: z.object({
    title: z.string().describe("The title/name for the resume"),
    template: z
      .enum(["modern", "classic", "minimal", "professional", "creative"])
      .optional()
      .describe("Template style for the resume"),
    contact: z
      .object({
        fullName: z.string().describe("Full name"),
        email: z.string().email().describe("Email address"),
        phone: z.string().optional().describe("Phone number"),
        location: z.string().optional().describe("Location/city"),
        linkedin: z.string().optional().describe("LinkedIn profile URL"),
        github: z.string().optional().describe("GitHub profile URL"),
        website: z.string().optional().describe("Personal website URL"),
      })
      .optional()
      .describe("Contact information for the resume"),
    isMaster: z
      .boolean()
      .optional()
      .describe("Whether this is the master resume (source of truth)"),
  }),
};

export const updateResumeTool = {
  name: "update_resume",
  description: "Update resume metadata like title, template, or theme settings.",
  inputSchema: z.object({
    resumeId: z.string().uuid().describe("The ID of the resume to update"),
    title: z.string().optional().describe("New title for the resume"),
    template: z.enum(["modern", "classic", "minimal", "professional", "creative"]).optional(),
    theme: z
      .object({
        primaryColor: z.string().optional(),
        secondaryColor: z.string().optional(),
        fontFamily: z.string().optional(),
        fontSize: z.enum(["small", "medium", "large"]).optional(),
        spacing: z.enum(["compact", "normal", "relaxed"]).optional(),
      })
      .optional()
      .describe("Theme customization options"),
    targetJobTitle: z.string().optional().describe("Target job title for tailoring"),
    targetJobUrl: z.string().optional().describe("URL of the target job posting"),
  }),
};

export const listResumesTool = {
  name: "list_resumes",
  description: "List all resumes for the current user. Useful to see what resumes already exist.",
  inputSchema: z.object({
    includeDeleted: z.boolean().optional().describe("Include soft-deleted resumes"),
    limit: z.number().optional().describe("Maximum number of resumes to return"),
  }),
};

// Section Tools
export const addSectionTool = {
  name: "add_section",
  description:
    "Add a new section to the resume. Common section types: summary, experience, education, skills, projects, certifications, languages, awards, publications, volunteer, custom.",
  inputSchema: z.object({
    resumeId: z.string().uuid().describe("The ID of the resume"),
    type: z
      .enum([
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
      ])
      .describe("Type of section to add"),
    title: z.string().optional().describe("Custom title for the section"),
    content: z.any().describe("Initial content for the section"),
    order: z.number().optional().describe("Position in the section list"),
  }),
};

export const updateSectionTool = {
  name: "update_section",
  description: "Update an existing section's content, title, or visibility.",
  inputSchema: z.object({
    resumeId: z.string().uuid().describe("The ID of the resume"),
    sectionId: z.string().uuid().describe("The ID of the section to update"),
    title: z.string().optional().describe("New title for the section"),
    content: z.any().optional().describe("New content for the section"),
    visible: z.boolean().optional().describe("Whether the section is visible"),
  }),
};

export const removeSectionTool = {
  name: "remove_section",
  description: "Remove a section from the resume.",
  inputSchema: z.object({
    resumeId: z.string().uuid().describe("The ID of the resume"),
    sectionId: z.string().uuid().describe("The ID of the section to remove"),
  }),
};

export const reorderSectionsTool = {
  name: "reorder_sections",
  description: "Change the order of sections in the resume.",
  inputSchema: z.object({
    resumeId: z.string().uuid().describe("The ID of the resume"),
    sectionOrder: z.array(z.string().uuid()).describe("Array of section IDs in the desired order"),
  }),
};

// Content Generation Tools
export const generateSummaryTool = {
  name: "generate_summary",
  description:
    "Generate a professional summary/objective statement based on the resume content and optionally a target job.",
  inputSchema: z.object({
    resumeId: z.string().uuid().describe("The ID of the resume to generate summary for"),
    style: z
      .enum(["professional", "creative", "technical", "executive"])
      .optional()
      .describe("Writing style for the summary"),
    targetJob: z
      .string()
      .optional()
      .describe("Target job title or description to tailor the summary"),
    maxLength: z.number().optional().describe("Maximum length in words"),
  }),
};

export const generateBulletsTool = {
  name: "generate_bullets",
  description:
    "Generate achievement-focused bullet points for work experience or projects. Uses the STAR method and quantifies results where possible.",
  inputSchema: z.object({
    resumeId: z.string().uuid().describe("The ID of the resume"),
    sectionId: z.string().uuid().describe("The ID of the experience/project section"),
    entryId: z.string().describe("The ID of the specific entry to generate bullets for"),
    context: z.string().optional().describe("Additional context about the role/project"),
    count: z.number().optional().describe("Number of bullets to generate (default 3-5)"),
  }),
};

export const improveContentTool = {
  name: "improve_content",
  description:
    "Improve existing content by making it more impactful, concise, or professional. Can fix grammar, strengthen action verbs, and add quantifiable achievements.",
  inputSchema: z.object({
    resumeId: z.string().uuid().describe("The ID of the resume"),
    sectionId: z.string().uuid().describe("The ID of the section"),
    entryId: z.string().optional().describe("The ID of the specific entry (if applicable)"),
    improvements: z
      .array(
        z.enum(["grammar", "action_verbs", "quantify", "concise", "professional", "ats_friendly"])
      )
      .optional()
      .describe("Types of improvements to make"),
  }),
};

export const tailorForJobTool = {
  name: "tailor_for_job",
  description:
    "Tailor the entire resume or specific sections for a target job posting. Adjusts keywords, emphasizes relevant experience, and reorders content.",
  inputSchema: z.object({
    resumeId: z.string().uuid().describe("The ID of the resume to tailor"),
    jobUrl: z.string().url().optional().describe("URL of the job posting"),
    jobDescription: z.string().optional().describe("Job description text if URL not available"),
    sections: z
      .array(z.string().uuid())
      .optional()
      .describe("Specific section IDs to tailor (default: all)"),
  }),
};

// Job Matching Tools
export const analyzeJobPostingTool = {
  name: "analyze_job_posting",
  description:
    "Analyze a job posting to extract requirements, keywords, and skills. Returns structured data about what the employer is looking for.",
  inputSchema: z.object({
    jobUrl: z.string().url().optional().describe("URL of the job posting"),
    jobDescription: z.string().optional().describe("Job description text if URL not available"),
  }),
};

export const createVariantTool = {
  name: "create_variant",
  description:
    "Create a tailored variant of a master resume for a specific job application. Preserves the original resume while creating a customized copy.",
  inputSchema: z.object({
    masterResumeId: z
      .string()
      .uuid()
      .describe("The ID of the master resume to base the variant on"),
    targetJobTitle: z.string().describe("Target job title"),
    targetJobUrl: z.string().url().optional().describe("URL of the target job posting"),
    variantName: z.string().optional().describe("Name for the variant"),
  }),
};

export const compareToJobTool = {
  name: "compare_to_job",
  description:
    "Compare a resume against a job posting to identify gaps, matches, and suggestions for improvement. Returns a match score and recommendations.",
  inputSchema: z.object({
    resumeId: z.string().uuid().describe("The ID of the resume"),
    jobUrl: z.string().url().optional().describe("URL of the job posting"),
    jobDescription: z.string().optional().describe("Job description text if URL not available"),
  }),
};

// Export Tools
export const exportPdfTool = {
  name: "export_pdf",
  description: "Export the resume as a PDF document. Returns a download URL.",
  inputSchema: z.object({
    resumeId: z.string().uuid().describe("The ID of the resume to export"),
    template: z.enum(["modern", "classic", "minimal", "professional", "creative"]).optional(),
    pageSize: z.enum(["letter", "a4"]).optional().describe("Page size for the PDF"),
  }),
};

export const exportDocxTool = {
  name: "export_docx",
  description: "Export the resume as a Word document (.docx). Returns a download URL.",
  inputSchema: z.object({
    resumeId: z.string().uuid().describe("The ID of the resume to export"),
  }),
};

export const exportJsonTool = {
  name: "export_json",
  description: "Export the resume as JSON data. Useful for data portability or backup.",
  inputSchema: z.object({
    resumeId: z.string().uuid().describe("The ID of the resume to export"),
    format: z
      .enum(["internal", "json_resume"])
      .optional()
      .describe("JSON format (internal or JSON Resume standard)"),
  }),
};

// All tools array for registration
export const allResumeTools = [
  // Data Extraction
  scrapeUrlTool,
  // Resume CRUD
  getResumeTool,
  createResumeTool,
  updateResumeTool,
  listResumesTool,
  // Section Management
  addSectionTool,
  updateSectionTool,
  removeSectionTool,
  reorderSectionsTool,
  // Content Generation
  generateSummaryTool,
  generateBulletsTool,
  improveContentTool,
  tailorForJobTool,
  // Job Matching
  analyzeJobPostingTool,
  createVariantTool,
  compareToJobTool,
  // Export
  exportPdfTool,
  exportDocxTool,
  exportJsonTool,
];

// Type exports
export type ScrapeUrlInput = z.infer<typeof scrapeUrlTool.inputSchema>;
export type GetResumeInput = z.infer<typeof getResumeTool.inputSchema>;
export type CreateResumeInput = z.infer<typeof createResumeTool.inputSchema>;
export type UpdateResumeInput = z.infer<typeof updateResumeTool.inputSchema>;
export type ListResumesInput = z.infer<typeof listResumesTool.inputSchema>;
export type AddSectionInput = z.infer<typeof addSectionTool.inputSchema>;
export type UpdateSectionInput = z.infer<typeof updateSectionTool.inputSchema>;
export type RemoveSectionInput = z.infer<typeof removeSectionTool.inputSchema>;
export type ReorderSectionsInput = z.infer<typeof reorderSectionsTool.inputSchema>;
export type GenerateSummaryInput = z.infer<typeof generateSummaryTool.inputSchema>;
export type GenerateBulletsInput = z.infer<typeof generateBulletsTool.inputSchema>;
export type ImproveContentInput = z.infer<typeof improveContentTool.inputSchema>;
export type TailorForJobInput = z.infer<typeof tailorForJobTool.inputSchema>;
export type AnalyzeJobPostingInput = z.infer<typeof analyzeJobPostingTool.inputSchema>;
export type CreateVariantInput = z.infer<typeof createVariantTool.inputSchema>;
export type CompareToJobInput = z.infer<typeof compareToJobTool.inputSchema>;
export type ExportPdfInput = z.infer<typeof exportPdfTool.inputSchema>;
export type ExportDocxInput = z.infer<typeof exportDocxTool.inputSchema>;
export type ExportJsonInput = z.infer<typeof exportJsonTool.inputSchema>;

export type ResumeToolName = (typeof allResumeTools)[number]["name"];
