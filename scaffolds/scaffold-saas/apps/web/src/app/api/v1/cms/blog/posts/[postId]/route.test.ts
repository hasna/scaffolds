// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock auth-utils
vi.mock("@/lib/auth-utils", () => ({
  requireRole: vi.fn(),
}));

// Mock database
vi.mock("@scaffold-saas/database/client", () => ({
  db: {
    query: {
      blogPosts: { findFirst: vi.fn() },
    },
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(),
        })),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => ({
        returning: vi.fn(),
      })),
    })),
  },
}));

// Mock schema
vi.mock("@scaffold-saas/database/schema", () => ({
  blogPosts: {
    id: "id",
    status: "status",
    publishedAt: "published_at",
    updatedAt: "updated_at",
  },
}));

import { GET, PATCH, DELETE } from "./route";
import { requireRole } from "@/lib/auth-utils";
import { db } from "@scaffold-saas/database/client";

function createRequest(
  method: string,
  body?: unknown,
  searchParams?: Record<string, string>
): Request {
  const url = new URL("http://localhost:3000/api/v1/cms/blog/posts/post-1");
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }
  return new Request(url.toString(), {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { "Content-Type": "application/json" } : undefined,
  });
}

const mockPost = {
  id: "post-1",
  slug: "test-post",
  title: "Test Post",
  excerpt: "A test excerpt",
  content: "Test content",
  status: "published",
  publishedAt: new Date("2024-01-01"),
  author: {
    id: "user-1",
    name: "Author Name",
    avatarUrl: null,
  },
  category: {
    id: "cat-1",
    name: "Technology",
    slug: "technology",
  },
};

describe("Blog Post route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/v1/cms/blog/posts/[postId]", () => {
    it("should return published post for public request", async () => {
      vi.mocked(db.query.blogPosts.findFirst).mockResolvedValue(mockPost);

      const request = createRequest("GET", undefined, { public: "true" });
      const response = await GET(request, {
        params: Promise.resolve({ postId: "post-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.post.id).toBe("post-1");
      expect(requireRole).not.toHaveBeenCalled();
    });

    it("should require admin for non-public request", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);
      vi.mocked(db.query.blogPosts.findFirst).mockResolvedValue(mockPost);

      const request = createRequest("GET");
      await GET(request, { params: Promise.resolve({ postId: "post-1" }) });

      expect(requireRole).toHaveBeenCalledWith("admin");
    });

    it("should return 404 when post not found", async () => {
      vi.mocked(db.query.blogPosts.findFirst).mockResolvedValue(null);

      const request = createRequest("GET", undefined, { public: "true" });
      const response = await GET(request, {
        params: Promise.resolve({ postId: "non-existent" }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Post not found");
    });

    it("should include author and category in response", async () => {
      vi.mocked(db.query.blogPosts.findFirst).mockResolvedValue(mockPost);

      const request = createRequest("GET", undefined, { public: "true" });
      const response = await GET(request, {
        params: Promise.resolve({ postId: "post-1" }),
      });
      const data = await response.json();

      expect(data.post.author.name).toBe("Author Name");
      expect(data.post.category.name).toBe("Technology");
    });

    it("should return 500 on internal error", async () => {
      vi.mocked(db.query.blogPosts.findFirst).mockRejectedValue(
        new Error("Database error")
      );

      const request = createRequest("GET", undefined, { public: "true" });
      const response = await GET(request, {
        params: Promise.resolve({ postId: "post-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal error");
    });
  });

  describe("PATCH /api/v1/cms/blog/posts/[postId] - Authorization", () => {
    it("should check for admin role", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const mockReturning = vi.fn().mockResolvedValue([mockPost]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      vi.mocked(db.update).mockReturnValue({ set: mockSet } as never);

      const request = createRequest("PATCH", { title: "Updated Title" });
      await PATCH(request, { params: Promise.resolve({ postId: "post-1" }) });

      expect(requireRole).toHaveBeenCalledWith("admin");
    });
  });

  describe("PATCH /api/v1/cms/blog/posts/[postId] - Validation", () => {
    it("should return 400 for invalid slug format", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const request = createRequest("PATCH", { slug: "Invalid Slug!" });
      const response = await PATCH(request, {
        params: Promise.resolve({ postId: "post-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid input");
    });

    it("should return 400 for invalid status", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const request = createRequest("PATCH", { status: "invalid-status" });
      const response = await PATCH(request, {
        params: Promise.resolve({ postId: "post-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid input");
    });

    it("should return 404 when post not found", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const mockReturning = vi.fn().mockResolvedValue([]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      vi.mocked(db.update).mockReturnValue({ set: mockSet } as never);

      const request = createRequest("PATCH", { title: "Updated" });
      const response = await PATCH(request, {
        params: Promise.resolve({ postId: "non-existent" }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Post not found");
    });
  });

  describe("PATCH /api/v1/cms/blog/posts/[postId] - Happy paths", () => {
    it("should update post successfully", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const updatedPost = { ...mockPost, title: "Updated Title" };

      const mockReturning = vi.fn().mockResolvedValue([updatedPost]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      vi.mocked(db.update).mockReturnValue({ set: mockSet } as never);

      const request = createRequest("PATCH", { title: "Updated Title" });
      const response = await PATCH(request, {
        params: Promise.resolve({ postId: "post-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.post.title).toBe("Updated Title");
    });

    it("should set publishedAt when publishing draft", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);
      vi.mocked(db.query.blogPosts.findFirst).mockResolvedValue({
        publishedAt: null,
      });

      const updatedPost = { ...mockPost, status: "published" };

      const mockReturning = vi.fn().mockResolvedValue([updatedPost]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      vi.mocked(db.update).mockReturnValue({ set: mockSet } as never);

      const request = createRequest("PATCH", { status: "published" });
      const response = await PATCH(request, {
        params: Promise.resolve({ postId: "post-1" }),
      });

      expect(response.status).toBe(200);
    });

    it("should accept valid status values", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const updatedPost = { ...mockPost, status: "draft" };

      const mockReturning = vi.fn().mockResolvedValue([updatedPost]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      vi.mocked(db.update).mockReturnValue({ set: mockSet } as never);

      const statuses = ["draft", "published", "archived"];
      for (const status of statuses) {
        const request = createRequest("PATCH", { status });
        const response = await PATCH(request, {
          params: Promise.resolve({ postId: "post-1" }),
        });

        expect(response.status).toBe(200);
      }
    });
  });

  describe("DELETE /api/v1/cms/blog/posts/[postId] - Authorization", () => {
    it("should check for admin role", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const mockReturning = vi.fn().mockResolvedValue([{ id: "post-1" }]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      vi.mocked(db.delete).mockReturnValue({ where: mockWhere } as never);

      const request = createRequest("DELETE");
      await DELETE(request, { params: Promise.resolve({ postId: "post-1" }) });

      expect(requireRole).toHaveBeenCalledWith("admin");
    });
  });

  describe("DELETE /api/v1/cms/blog/posts/[postId] - Validation", () => {
    it("should return 404 when post not found", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const mockReturning = vi.fn().mockResolvedValue([]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      vi.mocked(db.delete).mockReturnValue({ where: mockWhere } as never);

      const request = createRequest("DELETE");
      const response = await DELETE(request, {
        params: Promise.resolve({ postId: "non-existent" }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Post not found");
    });
  });

  describe("DELETE /api/v1/cms/blog/posts/[postId] - Happy paths", () => {
    it("should delete post successfully", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const mockReturning = vi.fn().mockResolvedValue([{ id: "post-1" }]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      vi.mocked(db.delete).mockReturnValue({ where: mockWhere } as never);

      const request = createRequest("DELETE");
      const response = await DELETE(request, {
        params: Promise.resolve({ postId: "post-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });
});
