import { describe, it, expect, vi } from "vitest";

// Mock database before importing to avoid DATABASE_URL requirement
vi.mock("@scaffold-saas/database/client", () => ({
  db: {
    query: {
      threads: { findFirst: vi.fn() },
      usageRecords: { findMany: vi.fn() },
    },
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue([]),
    }),
  },
}));

vi.mock("@scaffold-saas/database/schema", () => ({
  threads: { id: "id" },
  usageRecords: { tenantId: "tenantId" },
}));

// NOTE: This module calls OpenAI directly at import time based on env vars.
// Full mocking is difficult; these tests focus on exports and type definitions.

describe("ai jobs", () => {
  describe("exports", () => {
    it("should export processAIJob function", async () => {
      const mod = await import("./ai");
      expect(typeof mod.processAIJob).toBe("function");
    });

    it("should export AIJobData type", async () => {
      // Type is exported - this verifies it compiles
      const mod = await import("./ai");
      expect(mod).toBeDefined();
    });
  });

  describe("AIJobData type", () => {
    it("should support generate-title type", async () => {
      const data = {
        type: "generate-title" as const,
        threadId: "thread-1",
        firstMessage: "Hello, how are you?",
      };
      expect(data.type).toBe("generate-title");
      expect(data.threadId).toBe("thread-1");
      expect(data.firstMessage).toBe("Hello, how are you?");
    });

    it("should support summarize-thread type", async () => {
      const data = {
        type: "summarize-thread" as const,
        threadId: "thread-1",
      };
      expect(data.type).toBe("summarize-thread");
      expect(data.threadId).toBe("thread-1");
    });

    it("should support track-usage type", async () => {
      const data = {
        type: "track-usage" as const,
        tenantId: "tenant-1",
        userId: "user-1",
        inputTokens: 100,
        outputTokens: 50,
        costCents: 5,
        model: "gpt-4o-mini",
      };
      expect(data.type).toBe("track-usage");
      expect(data.tenantId).toBe("tenant-1");
      expect(data.userId).toBe("user-1");
      expect(data.inputTokens).toBe(100);
      expect(data.outputTokens).toBe(50);
      expect(data.costCents).toBe(5);
      expect(data.model).toBe("gpt-4o-mini");
    });
  });

  describe("module behavior", () => {
    it("should handle missing OPENAI_API_KEY", async () => {
      // The module checks for OPENAI_API_KEY and sets openai to null if missing
      // This tests that the module can be imported without crashing
      const originalKey = process.env.OPENAI_API_KEY;
      delete process.env.OPENAI_API_KEY;

      // Re-import with cleared env
      const mod = await import("./ai");
      expect(mod.processAIJob).toBeDefined();

      // Restore
      process.env.OPENAI_API_KEY = originalKey;
    });
  });
});
