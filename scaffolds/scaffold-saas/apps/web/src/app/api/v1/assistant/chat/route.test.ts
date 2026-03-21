// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock api-context
vi.mock("@/lib/api-context", () => ({
  getApiContext: vi.fn(),
}));

// Mock tenant functions
vi.mock("@/lib/tenant", () => ({
  checkAssistantMessageLimit: vi.fn(),
}));

// Mock AI functions
vi.mock("@/lib/ai", () => ({
  getAssistantConfig: vi.fn(),
  addMessageToThread: vi.fn(),
  trackUsage: vi.fn(),
  estimateTokens: vi.fn(() => 100),
}));

// Mock AI SDK
vi.mock("ai", () => ({
  streamText: vi.fn(),
}));

// Mock OpenAI
vi.mock("@ai-sdk/openai", () => ({
  openai: vi.fn(() => "mocked-model"),
}));

// Mock database
vi.mock("@scaffold-saas/database/client", () => ({
  db: {
    query: {
      assistantThreads: { findFirst: vi.fn() },
      assistantMessages: { findMany: vi.fn() },
    },
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(),
      })),
    })),
  },
}));

// Mock schema
vi.mock("@scaffold-saas/database/schema", () => ({
  assistantThreads: {
    id: "id",
    tenantId: "tenant_id",
    userId: "user_id",
    title: "title",
    updatedAt: "updated_at",
  },
  assistantMessages: { threadId: "thread_id" },
}));

import { POST } from "./route";
import { getApiContext } from "@/lib/api-context";
import { checkAssistantMessageLimit } from "@/lib/tenant";
import { getAssistantConfig, addMessageToThread } from "@/lib/ai";
import { streamText } from "ai";
import { db } from "@scaffold-saas/database/client";

function createRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/v1/assistant/chat", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("Assistant Chat route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/v1/assistant/chat - Authorization", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getApiContext).mockResolvedValue({
        success: false,
        error: "Unauthorized",
        status: 401,
      });

      const request = createRequest({
        threadId: "thread-1",
        messages: [{ role: "user", content: "Hello" }],
      });
      const response = await POST(request);

      expect(response.status).toBe(401);
      expect(await response.text()).toBe("Unauthorized");
    });

    it("should return 400 when no tenant", async () => {
      vi.mocked(getApiContext).mockResolvedValue({
        success: false,
        error: "No tenant",
        status: 400,
      });

      const request = createRequest({
        threadId: "thread-1",
        messages: [{ role: "user", content: "Hello" }],
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      expect(await response.text()).toBe("No tenant");
    });
  });

  describe("POST /api/v1/assistant/chat - Validation", () => {
    it("should return 400 when threadId is missing", async () => {
      vi.mocked(getApiContext).mockResolvedValue({
        success: true,
        context: { userId: "user-1", tenantId: "tenant-1" },
      });

      const request = createRequest({
        messages: [{ role: "user", content: "Hello" }],
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      expect(await response.text()).toBe("Thread ID required");
    });

    it("should return 404 when thread not found", async () => {
      vi.mocked(getApiContext).mockResolvedValue({
        success: true,
        context: { userId: "user-1", tenantId: "tenant-1" },
      });
      vi.mocked(db.query.assistantThreads.findFirst).mockResolvedValue(null);

      const request = createRequest({
        threadId: "non-existent",
        messages: [{ role: "user", content: "Hello" }],
      });
      const response = await POST(request);

      expect(response.status).toBe(404);
      expect(await response.text()).toBe("Thread not found");
    });

    it("should return 400 when last message is not from user", async () => {
      vi.mocked(getApiContext).mockResolvedValue({
        success: true,
        context: { userId: "user-1", tenantId: "tenant-1" },
      });
      vi.mocked(db.query.assistantThreads.findFirst).mockResolvedValue({
        id: "thread-1",
        tenantId: "tenant-1",
        userId: "user-1",
      });
      vi.mocked(checkAssistantMessageLimit).mockResolvedValue({
        allowed: true,
        current: 5,
        limit: 100,
      });
      vi.mocked(getAssistantConfig).mockResolvedValue({
        model: "gpt-4o",
        systemPrompt: "You are a helpful assistant.",
      });

      const request = createRequest({
        threadId: "thread-1",
        messages: [{ role: "assistant", content: "Hello" }],
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      expect(await response.text()).toBe("Invalid message");
    });

    it("should return 400 when messages array is empty", async () => {
      vi.mocked(getApiContext).mockResolvedValue({
        success: true,
        context: { userId: "user-1", tenantId: "tenant-1" },
      });
      vi.mocked(db.query.assistantThreads.findFirst).mockResolvedValue({
        id: "thread-1",
        tenantId: "tenant-1",
        userId: "user-1",
      });
      vi.mocked(checkAssistantMessageLimit).mockResolvedValue({
        allowed: true,
        current: 5,
        limit: 100,
      });
      vi.mocked(getAssistantConfig).mockResolvedValue({
        model: "gpt-4o",
        systemPrompt: "You are a helpful assistant.",
      });

      const request = createRequest({
        threadId: "thread-1",
        messages: [],
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      expect(await response.text()).toBe("Invalid message");
    });
  });

  describe("POST /api/v1/assistant/chat - Tenant isolation", () => {
    it("should verify thread belongs to the tenant", async () => {
      vi.mocked(getApiContext).mockResolvedValue({
        success: true,
        context: { userId: "user-1", tenantId: "tenant-1" },
      });
      vi.mocked(db.query.assistantThreads.findFirst).mockResolvedValue(null);

      const request = createRequest({
        threadId: "thread-from-other-tenant",
        messages: [{ role: "user", content: "Hello" }],
      });
      const response = await POST(request);

      expect(response.status).toBe(404);
      expect(await response.text()).toBe("Thread not found");
      expect(db.query.assistantThreads.findFirst).toHaveBeenCalled();
    });

    it("should verify thread belongs to the user", async () => {
      vi.mocked(getApiContext).mockResolvedValue({
        success: true,
        context: { userId: "user-1", tenantId: "tenant-1" },
      });
      vi.mocked(db.query.assistantThreads.findFirst).mockResolvedValue(null);

      const request = createRequest({
        threadId: "thread-from-other-user",
        messages: [{ role: "user", content: "Hello" }],
      });
      const response = await POST(request);

      expect(response.status).toBe(404);
    });
  });

  describe("POST /api/v1/assistant/chat - Rate limiting", () => {
    it("should return 429 when daily message limit exceeded", async () => {
      vi.mocked(getApiContext).mockResolvedValue({
        success: true,
        context: { userId: "user-1", tenantId: "tenant-1" },
      });
      vi.mocked(db.query.assistantThreads.findFirst).mockResolvedValue({
        id: "thread-1",
        tenantId: "tenant-1",
        userId: "user-1",
      });
      vi.mocked(checkAssistantMessageLimit).mockResolvedValue({
        allowed: false,
        current: 100,
        limit: 100,
      });

      const request = createRequest({
        threadId: "thread-1",
        messages: [{ role: "user", content: "Hello" }],
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toBe("Daily message limit reached");
      expect(data.code).toBe("LIMIT_EXCEEDED");
      expect(data.details.current).toBe(100);
      expect(data.details.limit).toBe(100);
    });
  });

  describe("POST /api/v1/assistant/chat - Happy paths", () => {
    it("should stream response successfully", async () => {
      vi.mocked(getApiContext).mockResolvedValue({
        success: true,
        context: { userId: "user-1", tenantId: "tenant-1" },
      });
      vi.mocked(db.query.assistantThreads.findFirst).mockResolvedValue({
        id: "thread-1",
        tenantId: "tenant-1",
        userId: "user-1",
      });
      vi.mocked(checkAssistantMessageLimit).mockResolvedValue({
        allowed: true,
        current: 5,
        limit: 100,
      });
      vi.mocked(getAssistantConfig).mockResolvedValue({
        model: "gpt-4o",
        systemPrompt: "You are a helpful assistant.",
      });
      vi.mocked(addMessageToThread).mockResolvedValue(undefined);

      const mockResponse = new Response("Mocked stream");
      vi.mocked(streamText).mockReturnValue({
        toTextStreamResponse: () => mockResponse,
      } as never);

      const request = createRequest({
        threadId: "thread-1",
        messages: [{ role: "user", content: "Hello, how are you?" }],
      });
      const response = await POST(request);

      expect(response).toBe(mockResponse);
      expect(streamText).toHaveBeenCalled();
      expect(addMessageToThread).toHaveBeenCalledWith(
        "thread-1",
        "user",
        "Hello, how are you?",
        100
      );
    });

    it("should work without system prompt", async () => {
      vi.mocked(getApiContext).mockResolvedValue({
        success: true,
        context: { userId: "user-1", tenantId: "tenant-1" },
      });
      vi.mocked(db.query.assistantThreads.findFirst).mockResolvedValue({
        id: "thread-1",
        tenantId: "tenant-1",
        userId: "user-1",
      });
      vi.mocked(checkAssistantMessageLimit).mockResolvedValue({
        allowed: true,
        current: 0,
        limit: 100,
      });
      vi.mocked(getAssistantConfig).mockResolvedValue({
        model: "gpt-4o",
        systemPrompt: null,
      });
      vi.mocked(addMessageToThread).mockResolvedValue(undefined);

      const mockResponse = new Response("Mocked stream");
      vi.mocked(streamText).mockReturnValue({
        toTextStreamResponse: () => mockResponse,
      } as never);

      const request = createRequest({
        threadId: "thread-1",
        messages: [{ role: "user", content: "Test message" }],
      });
      const response = await POST(request);

      expect(response).toBe(mockResponse);
      expect(streamText).toHaveBeenCalled();
    });

    it("should use configured model", async () => {
      vi.mocked(getApiContext).mockResolvedValue({
        success: true,
        context: { userId: "user-1", tenantId: "tenant-1" },
      });
      vi.mocked(db.query.assistantThreads.findFirst).mockResolvedValue({
        id: "thread-1",
        tenantId: "tenant-1",
        userId: "user-1",
      });
      vi.mocked(checkAssistantMessageLimit).mockResolvedValue({
        allowed: true,
        current: 0,
        limit: 100,
      });
      vi.mocked(getAssistantConfig).mockResolvedValue({
        model: "gpt-4o-mini",
        systemPrompt: "Custom prompt",
      });
      vi.mocked(addMessageToThread).mockResolvedValue(undefined);

      const mockResponse = new Response("Mocked stream");
      vi.mocked(streamText).mockReturnValue({
        toTextStreamResponse: () => mockResponse,
      } as never);

      const request = createRequest({
        threadId: "thread-1",
        messages: [{ role: "user", content: "Test" }],
      });

      await POST(request);

      expect(streamText).toHaveBeenCalled();
    });

    it("should handle conversation history", async () => {
      vi.mocked(getApiContext).mockResolvedValue({
        success: true,
        context: { userId: "user-1", tenantId: "tenant-1" },
      });
      vi.mocked(db.query.assistantThreads.findFirst).mockResolvedValue({
        id: "thread-1",
        tenantId: "tenant-1",
        userId: "user-1",
      });
      vi.mocked(checkAssistantMessageLimit).mockResolvedValue({
        allowed: true,
        current: 0,
        limit: 100,
      });
      vi.mocked(getAssistantConfig).mockResolvedValue({
        model: "gpt-4o",
        systemPrompt: "You are helpful.",
      });
      vi.mocked(addMessageToThread).mockResolvedValue(undefined);

      const mockResponse = new Response("Mocked stream");
      vi.mocked(streamText).mockReturnValue({
        toTextStreamResponse: () => mockResponse,
      } as never);

      const request = createRequest({
        threadId: "thread-1",
        messages: [
          { role: "user", content: "Hi" },
          { role: "assistant", content: "Hello! How can I help you?" },
          { role: "user", content: "What is 2+2?" },
        ],
      });

      await POST(request);

      // Should save only the latest user message
      expect(addMessageToThread).toHaveBeenCalledWith(
        "thread-1",
        "user",
        "What is 2+2?",
        100
      );
    });
  });

  describe("POST /api/v1/assistant/chat - Error handling", () => {
    it("should return 500 on internal error", async () => {
      vi.mocked(getApiContext).mockRejectedValue(new Error("Internal error"));

      const request = createRequest({
        threadId: "thread-1",
        messages: [{ role: "user", content: "Hello" }],
      });
      const response = await POST(request);

      expect(response.status).toBe(500);
      expect(await response.text()).toBe("Internal error");
    });

    it("should return 500 when database query fails", async () => {
      vi.mocked(getApiContext).mockResolvedValue({
        success: true,
        context: { userId: "user-1", tenantId: "tenant-1" },
      });
      vi.mocked(db.query.assistantThreads.findFirst).mockRejectedValue(
        new Error("Database error")
      );

      const request = createRequest({
        threadId: "thread-1",
        messages: [{ role: "user", content: "Hello" }],
      });
      const response = await POST(request);

      expect(response.status).toBe(500);
      expect(await response.text()).toBe("Internal error");
    });
  });
});
