// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock api-context
vi.mock("@/lib/api-context", () => ({
  getApiContext: vi.fn(),
}));

// Mock AI functions
vi.mock("@/lib/ai", () => ({
  getUserThreads: vi.fn(),
  createThread: vi.fn(),
}));

import { GET, POST } from "./route";
import { getApiContext } from "@/lib/api-context";
import { getUserThreads, createThread } from "@/lib/ai";

function createRequest(method: string): NextRequest {
  return new NextRequest("http://localhost:3000/api/v1/assistant/threads", {
    method,
  });
}

const mockThreads = [
  {
    id: "thread-1",
    tenantId: "tenant-1",
    userId: "user-1",
    title: "First Conversation",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "thread-2",
    tenantId: "tenant-1",
    userId: "user-1",
    title: "Second Conversation",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const mockNewThread = {
  id: "thread-new",
  tenantId: "tenant-1",
  userId: "user-1",
  title: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("Assistant Threads route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/v1/assistant/threads - Authorization", () => {
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

  describe("GET /api/v1/assistant/threads - Happy paths", () => {
    it("should return list of threads", async () => {
      vi.mocked(getApiContext).mockResolvedValue({
        success: true,
        context: { userId: "user-1", tenantId: "tenant-1" },
      });
      vi.mocked(getUserThreads).mockResolvedValue(mockThreads);

      const request = createRequest("GET");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(2);
      expect(data.data[0].id).toBe("thread-1");
      expect(data.data[1].id).toBe("thread-2");
    });

    it("should return empty array when no threads exist", async () => {
      vi.mocked(getApiContext).mockResolvedValue({
        success: true,
        context: { userId: "user-1", tenantId: "tenant-1" },
      });
      vi.mocked(getUserThreads).mockResolvedValue([]);

      const request = createRequest("GET");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(0);
    });

    it("should call getUserThreads with correct userId and tenantId", async () => {
      vi.mocked(getApiContext).mockResolvedValue({
        success: true,
        context: { userId: "user-123", tenantId: "tenant-456" },
      });
      vi.mocked(getUserThreads).mockResolvedValue([]);

      const request = createRequest("GET");
      await GET(request);

      expect(getUserThreads).toHaveBeenCalledWith("user-123", "tenant-456");
    });
  });

  describe("POST /api/v1/assistant/threads - Authorization", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getApiContext).mockResolvedValue({
        success: false,
        error: "Unauthorized",
        status: 401,
      });

      const request = createRequest("POST");
      const response = await POST(request);
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

      const request = createRequest("POST");
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("No tenant");
    });
  });

  describe("POST /api/v1/assistant/threads - Happy paths", () => {
    it("should create new thread and return 201", async () => {
      vi.mocked(getApiContext).mockResolvedValue({
        success: true,
        context: { userId: "user-1", tenantId: "tenant-1" },
      });
      vi.mocked(createThread).mockResolvedValue(mockNewThread);

      const request = createRequest("POST");
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data.id).toBe("thread-new");
      expect(data.data.tenantId).toBe("tenant-1");
      expect(data.data.userId).toBe("user-1");
    });

    it("should call createThread with correct tenantId and userId", async () => {
      vi.mocked(getApiContext).mockResolvedValue({
        success: true,
        context: { userId: "user-123", tenantId: "tenant-456" },
      });
      vi.mocked(createThread).mockResolvedValue(mockNewThread);

      const request = createRequest("POST");
      await POST(request);

      expect(createThread).toHaveBeenCalledWith("tenant-456", "user-123");
    });
  });

  describe("Error handling", () => {
    it("GET should return 500 on internal error", async () => {
      vi.mocked(getApiContext).mockResolvedValue({
        success: true,
        context: { userId: "user-1", tenantId: "tenant-1" },
      });
      vi.mocked(getUserThreads).mockRejectedValue(new Error("Database error"));

      const request = createRequest("GET");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal error");
    });

    it("POST should return 500 on internal error", async () => {
      vi.mocked(getApiContext).mockResolvedValue({
        success: true,
        context: { userId: "user-1", tenantId: "tenant-1" },
      });
      vi.mocked(createThread).mockRejectedValue(new Error("Database error"));

      const request = createRequest("POST");
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal error");
    });
  });
});
