// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock api-context
vi.mock("@/lib/api-context", () => ({
  getApiContext: vi.fn(),
}));

// Mock database
vi.mock("@scaffold-review/database/client", () => ({
  db: {
    query: {
      assistantConfig: { findFirst: vi.fn() },
    },
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(),
    })),
  },
}));

// Mock schema
vi.mock("@scaffold-review/database/schema", () => ({
  assistantConfig: {
    tenantId: "tenant_id",
    systemPrompt: "system_prompt",
    model: "model",
    temperature: "temperature",
    maxTokens: "max_tokens",
    updatedAt: "updated_at",
  },
}));

import { GET, PUT } from "./route";
import { getApiContext } from "@/lib/api-context";
import { db } from "@scaffold-review/database/client";

function createRequest(method: string, body?: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/v1/assistant/config", {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { "Content-Type": "application/json" } : undefined,
  });
}

const mockConfig = {
  id: "config-1",
  tenantId: "tenant-1",
  systemPrompt: "You are a helpful assistant.",
  model: "gpt-4o",
  temperature: 70,
  maxTokens: 4096,
  dailyMessageLimit: 100,
  dailyTokenLimit: 10000,
  injectUserContext: { name: true, email: false, plan: true },
  injectTenantContext: { name: true, settings: false },
};

describe("Assistant Config route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/v1/assistant/config - Authorization", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getApiContext).mockResolvedValue({
        success: false,
        error: "Unauthorized",
        status: 401,
      });

      const request = createRequest("GET");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 400 when no tenant", async () => {
      vi.mocked(getApiContext).mockResolvedValue({
        success: false,
        error: "No tenant",
        status: 400,
      });

      const request = createRequest("GET");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("No tenant");
    });
  });

  describe("GET /api/v1/assistant/config - Happy paths", () => {
    it("should return assistant config", async () => {
      vi.mocked(getApiContext).mockResolvedValue({
        success: true,
        context: { userId: "user-1", tenantId: "tenant-1" },
      });
      vi.mocked(db.query.assistantConfig.findFirst).mockResolvedValue(mockConfig);

      const request = createRequest("GET");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toEqual(mockConfig);
    });

    it("should return null when no config exists", async () => {
      vi.mocked(getApiContext).mockResolvedValue({
        success: true,
        context: { userId: "user-1", tenantId: "tenant-1" },
      });
      vi.mocked(db.query.assistantConfig.findFirst).mockResolvedValue(null);

      const request = createRequest("GET");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toBeNull();
    });
  });

  describe("PUT /api/v1/assistant/config - Authorization", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getApiContext).mockResolvedValue({
        success: false,
        error: "Unauthorized",
        status: 401,
      });

      const request = createRequest("PUT", { systemPrompt: "New prompt" });
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 400 when no tenant", async () => {
      vi.mocked(getApiContext).mockResolvedValue({
        success: false,
        error: "No tenant",
        status: 400,
      });

      const request = createRequest("PUT", { systemPrompt: "New prompt" });
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("No tenant");
    });

    it("should return 403 when member tries to update (session auth)", async () => {
      vi.mocked(getApiContext).mockResolvedValue({
        success: true,
        context: {
          userId: "user-1",
          tenantId: "tenant-1",
          tenantRole: "member",
          authSource: "session",
        },
      });

      const request = createRequest("PUT", { systemPrompt: "New prompt" });
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });

    it("should allow manager to update config", async () => {
      vi.mocked(getApiContext).mockResolvedValue({
        success: true,
        context: {
          userId: "user-1",
          tenantId: "tenant-1",
          tenantRole: "manager",
          authSource: "session",
        },
      });
      vi.mocked(db.query.assistantConfig.findFirst).mockResolvedValue(mockConfig);

      const mockWhere = vi.fn().mockResolvedValue(undefined);
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      vi.mocked(db.update).mockReturnValue({ set: mockSet } as never);

      const request = createRequest("PUT", { systemPrompt: "Manager prompt" });
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("should allow owner to update config", async () => {
      vi.mocked(getApiContext).mockResolvedValue({
        success: true,
        context: {
          userId: "user-1",
          tenantId: "tenant-1",
          tenantRole: "owner",
          authSource: "session",
        },
      });
      vi.mocked(db.query.assistantConfig.findFirst).mockResolvedValue(mockConfig);

      const mockWhere = vi.fn().mockResolvedValue(undefined);
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      vi.mocked(db.update).mockReturnValue({ set: mockSet } as never);

      const request = createRequest("PUT", { systemPrompt: "Owner prompt" });
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("should allow API key auth without role check", async () => {
      vi.mocked(getApiContext).mockResolvedValue({
        success: true,
        context: {
          userId: "user-1",
          tenantId: "tenant-1",
          authSource: "api-key",
        },
      });
      vi.mocked(db.query.assistantConfig.findFirst).mockResolvedValue(null);

      const mockValues = vi.fn().mockResolvedValue(undefined);
      vi.mocked(db.insert).mockReturnValue({ values: mockValues } as never);

      const request = createRequest("PUT", { systemPrompt: "API key update" });
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe("PUT /api/v1/assistant/config - Validation", () => {
    it("should return 400 for invalid systemPrompt (too long)", async () => {
      vi.mocked(getApiContext).mockResolvedValue({
        success: true,
        context: {
          userId: "user-1",
          tenantId: "tenant-1",
          tenantRole: "owner",
          authSource: "session",
        },
      });

      const longPrompt = "a".repeat(2001);
      const request = createRequest("PUT", { systemPrompt: longPrompt });
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid input");
    });

    it("should return 400 for invalid temperature (out of range)", async () => {
      vi.mocked(getApiContext).mockResolvedValue({
        success: true,
        context: {
          userId: "user-1",
          tenantId: "tenant-1",
          tenantRole: "owner",
          authSource: "session",
        },
      });

      const request = createRequest("PUT", { temperature: 150 });
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid input");
    });

    it("should return 400 for invalid maxTokens (too low)", async () => {
      vi.mocked(getApiContext).mockResolvedValue({
        success: true,
        context: {
          userId: "user-1",
          tenantId: "tenant-1",
          tenantRole: "owner",
          authSource: "session",
        },
      });

      const request = createRequest("PUT", { maxTokens: 50 });
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid input");
    });

    it("should return 400 for invalid maxTokens (too high)", async () => {
      vi.mocked(getApiContext).mockResolvedValue({
        success: true,
        context: {
          userId: "user-1",
          tenantId: "tenant-1",
          tenantRole: "owner",
          authSource: "session",
        },
      });

      const request = createRequest("PUT", { maxTokens: 10000 });
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid input");
    });
  });

  describe("PUT /api/v1/assistant/config - Create/Update", () => {
    it("should create config when none exists", async () => {
      vi.mocked(getApiContext).mockResolvedValue({
        success: true,
        context: {
          userId: "user-1",
          tenantId: "tenant-1",
          tenantRole: "owner",
          authSource: "session",
        },
      });
      vi.mocked(db.query.assistantConfig.findFirst).mockResolvedValue(null);

      const mockValues = vi.fn().mockResolvedValue(undefined);
      vi.mocked(db.insert).mockReturnValue({ values: mockValues } as never);

      const request = createRequest("PUT", {
        systemPrompt: "New system prompt",
        model: "gpt-4o",
        temperature: 70,
      });
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(db.insert).toHaveBeenCalled();
      expect(mockValues).toHaveBeenCalled();
    });

    it("should update config when it exists", async () => {
      vi.mocked(getApiContext).mockResolvedValue({
        success: true,
        context: {
          userId: "user-1",
          tenantId: "tenant-1",
          tenantRole: "owner",
          authSource: "session",
        },
      });
      vi.mocked(db.query.assistantConfig.findFirst).mockResolvedValue(mockConfig);

      const mockWhere = vi.fn().mockResolvedValue(undefined);
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      vi.mocked(db.update).mockReturnValue({ set: mockSet } as never);

      const request = createRequest("PUT", {
        systemPrompt: "Updated prompt",
        temperature: 50,
      });
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(db.update).toHaveBeenCalled();
    });

    it("should accept null for limit fields", async () => {
      vi.mocked(getApiContext).mockResolvedValue({
        success: true,
        context: {
          userId: "user-1",
          tenantId: "tenant-1",
          tenantRole: "owner",
          authSource: "session",
        },
      });
      vi.mocked(db.query.assistantConfig.findFirst).mockResolvedValue(mockConfig);

      const mockWhere = vi.fn().mockResolvedValue(undefined);
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      vi.mocked(db.update).mockReturnValue({ set: mockSet } as never);

      const request = createRequest("PUT", {
        dailyMessageLimit: null,
        dailyTokenLimit: null,
      });
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("should accept injectUserContext settings", async () => {
      vi.mocked(getApiContext).mockResolvedValue({
        success: true,
        context: {
          userId: "user-1",
          tenantId: "tenant-1",
          tenantRole: "owner",
          authSource: "session",
        },
      });
      vi.mocked(db.query.assistantConfig.findFirst).mockResolvedValue(null);

      const mockValues = vi.fn().mockResolvedValue(undefined);
      vi.mocked(db.insert).mockReturnValue({ values: mockValues } as never);

      const request = createRequest("PUT", {
        injectUserContext: { name: true, email: true, plan: false },
        injectTenantContext: { name: false, settings: true },
      });
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe("Error handling", () => {
    it("GET should return 500 on internal error", async () => {
      vi.mocked(getApiContext).mockResolvedValue({
        success: true,
        context: { userId: "user-1", tenantId: "tenant-1" },
      });
      vi.mocked(db.query.assistantConfig.findFirst).mockRejectedValue(
        new Error("Database error")
      );

      const request = createRequest("GET");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal error");
    });

    it("PUT should return 500 on internal error", async () => {
      vi.mocked(getApiContext).mockResolvedValue({
        success: true,
        context: {
          userId: "user-1",
          tenantId: "tenant-1",
          tenantRole: "owner",
          authSource: "session",
        },
      });
      vi.mocked(db.query.assistantConfig.findFirst).mockRejectedValue(
        new Error("Database error")
      );

      const request = createRequest("PUT", { systemPrompt: "Test" });
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal error");
    });
  });
});
