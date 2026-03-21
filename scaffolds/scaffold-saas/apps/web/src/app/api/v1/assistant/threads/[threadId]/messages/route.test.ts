// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock api-context
vi.mock("@/lib/api-context", () => ({
  getApiContext: vi.fn(),
}));

// Mock AI functions
vi.mock("@/lib/ai", () => ({
  getThreadMessages: vi.fn(),
}));

// Mock database
vi.mock("@scaffold-saas/database/client", () => ({
  db: {
    query: {
      assistantThreads: { findFirst: vi.fn() },
    },
  },
}));

// Mock schema
vi.mock("@scaffold-saas/database/schema", () => ({
  assistantThreads: {
    id: "id",
    tenantId: "tenant_id",
    userId: "user_id",
  },
}));

import { GET } from "./route";
import { getApiContext } from "@/lib/api-context";
import { getThreadMessages } from "@/lib/ai";
import { db } from "@scaffold-saas/database/client";

function createRequest(): NextRequest {
  return new NextRequest(
    "http://localhost:3000/api/v1/assistant/threads/thread-1/messages",
    { method: "GET" }
  );
}

const mockMessages = [
  {
    id: "msg-1",
    threadId: "thread-1",
    role: "user",
    content: "Hello",
    createdAt: new Date(),
  },
  {
    id: "msg-2",
    threadId: "thread-1",
    role: "assistant",
    content: "Hi there! How can I help you?",
    createdAt: new Date(),
  },
];

describe("Assistant Thread Messages route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/v1/assistant/threads/[threadId]/messages - Authorization", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getApiContext).mockResolvedValue({
        success: false,
        error: "Unauthorized",
        status: 401,
      });

      const request = createRequest();
      const response = await GET(request, {
        params: Promise.resolve({ threadId: "thread-1" }),
      });
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

      const request = createRequest();
      const response = await GET(request, {
        params: Promise.resolve({ threadId: "thread-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("No tenant");
    });
  });

  describe("GET /api/v1/assistant/threads/[threadId]/messages - Tenant isolation", () => {
    it("should return 404 when thread not found", async () => {
      vi.mocked(getApiContext).mockResolvedValue({
        success: true,
        context: { userId: "user-1", tenantId: "tenant-1" },
      });
      vi.mocked(db.query.assistantThreads.findFirst).mockResolvedValue(null);

      const request = createRequest();
      const response = await GET(request, {
        params: Promise.resolve({ threadId: "non-existent" }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Thread not found");
    });

    it("should return 404 when thread belongs to different tenant", async () => {
      vi.mocked(getApiContext).mockResolvedValue({
        success: true,
        context: { userId: "user-1", tenantId: "tenant-1" },
      });
      vi.mocked(db.query.assistantThreads.findFirst).mockResolvedValue(null);

      const request = createRequest();
      const response = await GET(request, {
        params: Promise.resolve({ threadId: "thread-from-other-tenant" }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Thread not found");
    });

    it("should return 404 when thread belongs to different user", async () => {
      vi.mocked(getApiContext).mockResolvedValue({
        success: true,
        context: { userId: "user-1", tenantId: "tenant-1" },
      });
      vi.mocked(db.query.assistantThreads.findFirst).mockResolvedValue(null);

      const request = createRequest();
      const response = await GET(request, {
        params: Promise.resolve({ threadId: "thread-from-other-user" }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Thread not found");
    });
  });

  describe("GET /api/v1/assistant/threads/[threadId]/messages - Happy paths", () => {
    it("should return thread messages", async () => {
      vi.mocked(getApiContext).mockResolvedValue({
        success: true,
        context: { userId: "user-1", tenantId: "tenant-1" },
      });
      vi.mocked(db.query.assistantThreads.findFirst).mockResolvedValue({
        id: "thread-1",
        tenantId: "tenant-1",
        userId: "user-1",
      });
      vi.mocked(getThreadMessages).mockResolvedValue(mockMessages);

      const request = createRequest();
      const response = await GET(request, {
        params: Promise.resolve({ threadId: "thread-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(2);
      expect(data.data[0].role).toBe("user");
      expect(data.data[0].content).toBe("Hello");
      expect(data.data[1].role).toBe("assistant");
    });

    it("should return empty array when no messages", async () => {
      vi.mocked(getApiContext).mockResolvedValue({
        success: true,
        context: { userId: "user-1", tenantId: "tenant-1" },
      });
      vi.mocked(db.query.assistantThreads.findFirst).mockResolvedValue({
        id: "thread-1",
        tenantId: "tenant-1",
        userId: "user-1",
      });
      vi.mocked(getThreadMessages).mockResolvedValue([]);

      const request = createRequest();
      const response = await GET(request, {
        params: Promise.resolve({ threadId: "thread-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(0);
    });

    it("should call getThreadMessages with correct threadId", async () => {
      vi.mocked(getApiContext).mockResolvedValue({
        success: true,
        context: { userId: "user-1", tenantId: "tenant-1" },
      });
      vi.mocked(db.query.assistantThreads.findFirst).mockResolvedValue({
        id: "thread-123",
        tenantId: "tenant-1",
        userId: "user-1",
      });
      vi.mocked(getThreadMessages).mockResolvedValue([]);

      const request = createRequest();
      await GET(request, {
        params: Promise.resolve({ threadId: "thread-123" }),
      });

      expect(getThreadMessages).toHaveBeenCalledWith("thread-123");
    });
  });

  describe("Error handling", () => {
    it("should return 500 on internal error", async () => {
      vi.mocked(getApiContext).mockResolvedValue({
        success: true,
        context: { userId: "user-1", tenantId: "tenant-1" },
      });
      vi.mocked(db.query.assistantThreads.findFirst).mockRejectedValue(
        new Error("Database error")
      );

      const request = createRequest();
      const response = await GET(request, {
        params: Promise.resolve({ threadId: "thread-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal error");
    });

    it("should return 500 when getThreadMessages fails", async () => {
      vi.mocked(getApiContext).mockResolvedValue({
        success: true,
        context: { userId: "user-1", tenantId: "tenant-1" },
      });
      vi.mocked(db.query.assistantThreads.findFirst).mockResolvedValue({
        id: "thread-1",
        tenantId: "tenant-1",
        userId: "user-1",
      });
      vi.mocked(getThreadMessages).mockRejectedValue(new Error("AI error"));

      const request = createRequest();
      const response = await GET(request, {
        params: Promise.resolve({ threadId: "thread-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal error");
    });
  });
});
