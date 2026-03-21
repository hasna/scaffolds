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
      assistantThreads: { findFirst: vi.fn() },
    },
    delete: vi.fn(() => ({
      where: vi.fn(),
    })),
  },
}));

// Mock schema
vi.mock("@scaffold-review/database/schema", () => ({
  assistantThreads: {
    id: "id",
    tenantId: "tenant_id",
    userId: "user_id",
  },
}));

import { GET, DELETE } from "./route";
import { getApiContext } from "@/lib/api-context";
import { db } from "@scaffold-review/database/client";

function createRequest(method: string): NextRequest {
  return new NextRequest(
    "http://localhost:3000/api/v1/assistant/threads/thread-1",
    { method }
  );
}

const mockThread = {
  id: "thread-1",
  tenantId: "tenant-1",
  userId: "user-1",
  title: "Test Conversation",
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("Assistant Thread route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/v1/assistant/threads/[threadId] - Authorization", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getApiContext).mockResolvedValue({
        success: false,
        error: "Unauthorized",
        status: 401,
      });

      const request = createRequest("GET");
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

      const request = createRequest("GET");
      const response = await GET(request, {
        params: Promise.resolve({ threadId: "thread-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("No tenant");
    });
  });

  describe("GET /api/v1/assistant/threads/[threadId] - Tenant isolation", () => {
    it("should return 404 when thread not found", async () => {
      vi.mocked(getApiContext).mockResolvedValue({
        success: true,
        context: { userId: "user-1", tenantId: "tenant-1" },
      });
      vi.mocked(db.query.assistantThreads.findFirst).mockResolvedValue(null);

      const request = createRequest("GET");
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

      const request = createRequest("GET");
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

      const request = createRequest("GET");
      const response = await GET(request, {
        params: Promise.resolve({ threadId: "thread-from-other-user" }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Thread not found");
    });
  });

  describe("GET /api/v1/assistant/threads/[threadId] - Happy paths", () => {
    it("should return thread details", async () => {
      vi.mocked(getApiContext).mockResolvedValue({
        success: true,
        context: { userId: "user-1", tenantId: "tenant-1" },
      });
      vi.mocked(db.query.assistantThreads.findFirst).mockResolvedValue(mockThread);

      const request = createRequest("GET");
      const response = await GET(request, {
        params: Promise.resolve({ threadId: "thread-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.id).toBe("thread-1");
      expect(data.data.title).toBe("Test Conversation");
    });
  });

  describe("DELETE /api/v1/assistant/threads/[threadId] - Authorization", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getApiContext).mockResolvedValue({
        success: false,
        error: "Unauthorized",
        status: 401,
      });

      const request = createRequest("DELETE");
      const response = await DELETE(request, {
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

      const request = createRequest("DELETE");
      const response = await DELETE(request, {
        params: Promise.resolve({ threadId: "thread-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("No tenant");
    });
  });

  describe("DELETE /api/v1/assistant/threads/[threadId] - Tenant isolation", () => {
    it("should return 404 when thread not found", async () => {
      vi.mocked(getApiContext).mockResolvedValue({
        success: true,
        context: { userId: "user-1", tenantId: "tenant-1" },
      });
      vi.mocked(db.query.assistantThreads.findFirst).mockResolvedValue(null);

      const request = createRequest("DELETE");
      const response = await DELETE(request, {
        params: Promise.resolve({ threadId: "non-existent" }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Thread not found");
    });

    it("should return 404 when trying to delete another users thread", async () => {
      vi.mocked(getApiContext).mockResolvedValue({
        success: true,
        context: { userId: "user-1", tenantId: "tenant-1" },
      });
      vi.mocked(db.query.assistantThreads.findFirst).mockResolvedValue(null);

      const request = createRequest("DELETE");
      const response = await DELETE(request, {
        params: Promise.resolve({ threadId: "other-users-thread" }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Thread not found");
    });
  });

  describe("DELETE /api/v1/assistant/threads/[threadId] - Happy paths", () => {
    it("should delete thread successfully", async () => {
      vi.mocked(getApiContext).mockResolvedValue({
        success: true,
        context: { userId: "user-1", tenantId: "tenant-1" },
      });
      vi.mocked(db.query.assistantThreads.findFirst).mockResolvedValue(mockThread);

      const mockWhere = vi.fn().mockResolvedValue(undefined);
      vi.mocked(db.delete).mockReturnValue({ where: mockWhere } as never);

      const request = createRequest("DELETE");
      const response = await DELETE(request, {
        params: Promise.resolve({ threadId: "thread-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(db.delete).toHaveBeenCalled();
    });
  });

  describe("Error handling", () => {
    it("GET should return 500 on internal error", async () => {
      vi.mocked(getApiContext).mockResolvedValue({
        success: true,
        context: { userId: "user-1", tenantId: "tenant-1" },
      });
      vi.mocked(db.query.assistantThreads.findFirst).mockRejectedValue(
        new Error("Database error")
      );

      const request = createRequest("GET");
      const response = await GET(request, {
        params: Promise.resolve({ threadId: "thread-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal error");
    });

    it("DELETE should return 500 on internal error", async () => {
      vi.mocked(getApiContext).mockResolvedValue({
        success: true,
        context: { userId: "user-1", tenantId: "tenant-1" },
      });
      vi.mocked(db.query.assistantThreads.findFirst).mockResolvedValue(mockThread);
      vi.mocked(db.delete).mockImplementation(() => {
        throw new Error("Database error");
      });

      const request = createRequest("DELETE");
      const response = await DELETE(request, {
        params: Promise.resolve({ threadId: "thread-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal error");
    });
  });
});
