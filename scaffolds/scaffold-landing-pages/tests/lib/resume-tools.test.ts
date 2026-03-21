import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ToolContext, ToolResult } from "@/lib/ai/tools/types";

// Mock the database
vi.mock("@scaffold-landing-pages/database/client", () => ({
  db: {
    query: {
      resumes: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
    },
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: "test-resume-id" }]),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: "test-resume-id" }]),
        }),
      }),
    }),
  },
}));

describe("Resume Tool Executors", () => {
  const _mockContext: ToolContext = {
    userId: "test-user-id",
    tenantId: "test-tenant-id",
    resumeId: "test-resume-id",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Tool Definitions", () => {
    it("should have all required tool definitions", async () => {
      const { allResumeTools } = await import("@/lib/ai/tools/definitions");

      const toolNames = allResumeTools.map((t) => t.name);

      // Data Extraction
      expect(toolNames).toContain("scrape_url");

      // Resume CRUD
      expect(toolNames).toContain("get_resume");
      expect(toolNames).toContain("create_resume");
      expect(toolNames).toContain("update_resume");
      expect(toolNames).toContain("list_resumes");

      // Section Management
      expect(toolNames).toContain("add_section");
      expect(toolNames).toContain("update_section");
      expect(toolNames).toContain("remove_section");
      expect(toolNames).toContain("reorder_sections");

      // Content Generation
      expect(toolNames).toContain("generate_summary");
      expect(toolNames).toContain("generate_bullets");
      expect(toolNames).toContain("improve_content");
      expect(toolNames).toContain("tailor_for_job");

      // Job Matching
      expect(toolNames).toContain("analyze_job_posting");
      expect(toolNames).toContain("create_variant");
      expect(toolNames).toContain("compare_to_job");

      // Export
      expect(toolNames).toContain("export_pdf");
      expect(toolNames).toContain("export_docx");
      expect(toolNames).toContain("export_json");
    });

    it("should have valid input schemas for all tools", async () => {
      const { allResumeTools } = await import("@/lib/ai/tools/definitions");

      for (const tool of allResumeTools) {
        expect(tool.name).toBeDefined();
        expect(tool.description).toBeDefined();
        expect(tool.inputSchema).toBeDefined();
        expect(typeof tool.description).toBe("string");
        expect(tool.description.length).toBeGreaterThan(0);
      }
    });
  });

  describe("Tool Registry", () => {
    it("should have registered executors for all tools", async () => {
      const { getExecutor } = await import("@/lib/ai/tools/registry");
      const { allResumeTools } = await import("@/lib/ai/tools/definitions");

      for (const tool of allResumeTools) {
        const executor = getExecutor(tool.name);
        expect(executor).toBeDefined();
        expect(typeof executor).toBe("function");
      }
    });

    it("should return undefined for unknown tools", async () => {
      const { getExecutor } = await import("@/lib/ai/tools/registry");

      const executor = getExecutor("unknown_tool");
      expect(executor).toBeUndefined();
    });
  });

  describe("Tool Types", () => {
    it("should have proper ToolContext interface", async () => {
      const context: ToolContext = {
        userId: "user-123",
        tenantId: "tenant-456",
        resumeId: "resume-789",
        threadId: "thread-abc",
      };

      expect(context.userId).toBe("user-123");
      expect(context.tenantId).toBe("tenant-456");
      expect(context.resumeId).toBe("resume-789");
      expect(context.threadId).toBe("thread-abc");
    });

    it("should have proper ToolResult interface", () => {
      const successResult: ToolResult = {
        success: true,
        data: { id: "123" },
        streamContent: "Created successfully",
      };

      expect(successResult.success).toBe(true);
      expect(successResult.data).toEqual({ id: "123" });
      expect(successResult.streamContent).toBe("Created successfully");

      const errorResult: ToolResult = {
        success: false,
        error: "Something went wrong",
      };

      expect(errorResult.success).toBe(false);
      expect(errorResult.error).toBe("Something went wrong");
    });
  });
});

describe("Section Types", () => {
  it("should have valid section type enum values", async () => {
    const { addSectionTool } = await import("@/lib/ai/tools/definitions");

    const typeSchema = addSectionTool.inputSchema.shape.type as any;
    const sectionTypes =
      typeSchema.options ??
      (Array.isArray(typeSchema?._def?.values)
        ? typeSchema._def.values
        : Object.values(typeSchema?._def?.entries ?? {}));

    expect(sectionTypes).toContain("summary");
    expect(sectionTypes).toContain("experience");
    expect(sectionTypes).toContain("education");
    expect(sectionTypes).toContain("skills");
    expect(sectionTypes).toContain("projects");
    expect(sectionTypes).toContain("certifications");
    expect(sectionTypes).toContain("languages");
    expect(sectionTypes).toContain("awards");
    expect(sectionTypes).toContain("publications");
    expect(sectionTypes).toContain("volunteer");
    expect(sectionTypes).toContain("custom");
  });
});

describe("Export Formats", () => {
  it("should support PDF export", async () => {
    const { exportPdfTool } = await import("@/lib/ai/tools/definitions");

    const schema = exportPdfTool.inputSchema;
    const result = schema.safeParse({
      resumeId: "123e4567-e89b-12d3-a456-426614174000",
      template: "modern",
      pageSize: "letter",
    });

    expect(result.success).toBe(true);
  });

  it("should support JSON export formats", async () => {
    const { exportJsonTool } = await import("@/lib/ai/tools/definitions");

    const schema = exportJsonTool.inputSchema;

    // Internal format
    const internalResult = schema.safeParse({
      resumeId: "123e4567-e89b-12d3-a456-426614174000",
      format: "internal",
    });
    expect(internalResult.success).toBe(true);

    // JSON Resume format
    const jsonResumeResult = schema.safeParse({
      resumeId: "123e4567-e89b-12d3-a456-426614174000",
      format: "json_resume",
    });
    expect(jsonResumeResult.success).toBe(true);
  });
});

describe("Input Validation", () => {
  it("should validate resume creation input", async () => {
    const { createResumeTool } = await import("@/lib/ai/tools/definitions");

    const schema = createResumeTool.inputSchema;

    // Valid input
    const validResult = schema.safeParse({
      title: "My Resume",
      template: "modern",
      contact: {
        fullName: "John Doe",
        email: "john@example.com",
        phone: "+1 555-1234",
      },
    });
    expect(validResult.success).toBe(true);

    // Invalid email
    const invalidResult = schema.safeParse({
      title: "My Resume",
      contact: {
        fullName: "John Doe",
        email: "invalid-email",
      },
    });
    expect(invalidResult.success).toBe(false);
  });

  it("should validate section addition input", async () => {
    const { addSectionTool } = await import("@/lib/ai/tools/definitions");

    const schema = addSectionTool.inputSchema;

    // Valid input
    const validResult = schema.safeParse({
      resumeId: "123e4567-e89b-12d3-a456-426614174000",
      type: "experience",
      title: "Work Experience",
    });
    expect(validResult.success).toBe(true);

    // Invalid section type
    const invalidResult = schema.safeParse({
      resumeId: "123e4567-e89b-12d3-a456-426614174000",
      type: "invalid_type",
    });
    expect(invalidResult.success).toBe(false);

    // Invalid UUID
    const invalidUuidResult = schema.safeParse({
      resumeId: "not-a-uuid",
      type: "experience",
    });
    expect(invalidUuidResult.success).toBe(false);
  });

  it("should validate job analysis input", async () => {
    const { analyzeJobPostingTool } = await import("@/lib/ai/tools/definitions");

    const schema = analyzeJobPostingTool.inputSchema;

    // Valid with URL
    const urlResult = schema.safeParse({
      jobUrl: "https://example.com/jobs/123",
    });
    expect(urlResult.success).toBe(true);

    // Valid with description
    const descResult = schema.safeParse({
      jobDescription: "We are looking for a software engineer...",
    });
    expect(descResult.success).toBe(true);

    // Invalid URL
    const invalidUrlResult = schema.safeParse({
      jobUrl: "not-a-url",
    });
    expect(invalidUrlResult.success).toBe(false);
  });
});
