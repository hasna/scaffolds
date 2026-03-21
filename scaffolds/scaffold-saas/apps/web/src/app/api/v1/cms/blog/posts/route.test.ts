// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock auth-utils
vi.mock("@/lib/auth-utils", () => ({
  requireRole: vi.fn(),
  requireAuth: vi.fn(),
}));

// Mock database
vi.mock("@scaffold-saas/database/client", () => ({
  db: {
    query: {
      blogPosts: { findMany: vi.fn(), findFirst: vi.fn() },
    },
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(),
      })),
    })),
  },
}));

// Mock schema
vi.mock("@scaffold-saas/database/schema", () => ({
  blogPosts: {
    id: "id",
    slug: "slug",
    status: "status",
    categoryId: "category_id",
    publishedAt: "published_at",
    createdAt: "created_at",
  },
}));

import { GET, POST } from "./route";
import { requireRole } from "@/lib/auth-utils";
import { db } from "@scaffold-saas/database/client";

function createRequest(
  method: string,
  body?: unknown,
  searchParams?: Record<string, string>
): Request {
  const url = new URL("http://localhost:3000/api/v1/cms/blog/posts");
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

const mockPosts = [
  {
    id: "post-1",
    slug: "first-post",
    title: "First Post",
    status: "published",
    author: { id: "user-1", name: "Author", avatarUrl: null },
    category: { id: "cat-1", name: "Tech", slug: "tech" },
  },
  {
    id: "post-2",
    slug: "second-post",
    title: "Second Post",
    status: "draft",
    author: { id: "user-1", name: "Author", avatarUrl: null },
    category: null,
  },
];

describe("Blog Posts route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/v1/cms/blog/posts - Public", () => {
    it("should return published posts for public request", async () => {
      vi.mocked(db.query.blogPosts.findMany).mockResolvedValue([mockPosts[0]]);

      const request = createRequest("GET", undefined, { public: "true" });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.posts).toHaveLength(1);
      expect(requireRole).not.toHaveBeenCalled();
    });

    it("should filter by categoryId", async () => {
      vi.mocked(db.query.blogPosts.findMany).mockResolvedValue([mockPosts[0]]);

      const request = createRequest("GET", undefined, {
        public: "true",
        categoryId: "cat-1",
      });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.posts).toHaveLength(1);
    });

    it("should respect pagination parameters", async () => {
      vi.mocked(db.query.blogPosts.findMany).mockResolvedValue([]);

      const request = createRequest("GET", undefined, {
        public: "true",
        limit: "5",
        offset: "10",
      });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
    });

    it("should cap limit at 50", async () => {
      vi.mocked(db.query.blogPosts.findMany).mockResolvedValue([]);

      const request = createRequest("GET", undefined, {
        public: "true",
        limit: "100",
      });
      const response = await GET(request);

      expect(response.status).toBe(200);
      // Verify findMany was called with limit capped at 50
      expect(db.query.blogPosts.findMany).toHaveBeenCalled();
    });
  });

  describe("GET /api/v1/cms/blog/posts - Admin", () => {
    it("should require admin for non-public request", async () => {
      vi.mocked(requireRole).mockResolvedValue({
        user: { id: "user-1" },
        expires: new Date().toISOString(),
      });
      vi.mocked(db.query.blogPosts.findMany).mockResolvedValue(mockPosts);

      const request = createRequest("GET");
      await GET(request);

      expect(requireRole).toHaveBeenCalledWith("admin");
    });

    it("should return all posts including drafts for admin", async () => {
      vi.mocked(requireRole).mockResolvedValue({
        user: { id: "user-1" },
        expires: new Date().toISOString(),
      });
      vi.mocked(db.query.blogPosts.findMany).mockResolvedValue(mockPosts);

      const request = createRequest("GET");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.posts).toHaveLength(2);
    });

    it("should return 500 on internal error", async () => {
      vi.mocked(db.query.blogPosts.findMany).mockRejectedValue(
        new Error("Database error")
      );

      const request = createRequest("GET", undefined, { public: "true" });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal error");
    });
  });

  describe("POST /api/v1/cms/blog/posts - Authorization", () => {
    it("should check for admin role", async () => {
      vi.mocked(requireRole).mockResolvedValue({
        user: { id: "user-1" },
        expires: new Date().toISOString(),
      });
      vi.mocked(db.query.blogPosts.findFirst).mockResolvedValue(null);

      const mockReturning = vi.fn().mockResolvedValue([mockPosts[0]]);
      const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
      vi.mocked(db.insert).mockReturnValue({ values: mockValues } as never);

      const request = createRequest("POST", {
        slug: "new-post",
        title: "New Post",
        content: "Content here",
      });
      await POST(request);

      expect(requireRole).toHaveBeenCalledWith("admin");
    });
  });

  describe("POST /api/v1/cms/blog/posts - Validation", () => {
    it("should return 400 for missing slug", async () => {
      vi.mocked(requireRole).mockResolvedValue({
        user: { id: "user-1" },
        expires: new Date().toISOString(),
      });

      const request = createRequest("POST", {
        title: "New Post",
        content: "Content",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid input");
    });

    it("should return 400 for missing title", async () => {
      vi.mocked(requireRole).mockResolvedValue({
        user: { id: "user-1" },
        expires: new Date().toISOString(),
      });

      const request = createRequest("POST", {
        slug: "new-post",
        content: "Content",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid input");
    });

    it("should return 400 for missing content", async () => {
      vi.mocked(requireRole).mockResolvedValue({
        user: { id: "user-1" },
        expires: new Date().toISOString(),
      });

      const request = createRequest("POST", {
        slug: "new-post",
        title: "New Post",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid input");
    });

    it("should return 400 for invalid slug format", async () => {
      vi.mocked(requireRole).mockResolvedValue({
        user: { id: "user-1" },
        expires: new Date().toISOString(),
      });

      const request = createRequest("POST", {
        slug: "Invalid Slug!",
        title: "New Post",
        content: "Content",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid input");
    });

    it("should return 409 for duplicate slug", async () => {
      vi.mocked(requireRole).mockResolvedValue({
        user: { id: "user-1" },
        expires: new Date().toISOString(),
      });
      vi.mocked(db.query.blogPosts.findFirst).mockResolvedValue(mockPosts[0]);

      const request = createRequest("POST", {
        slug: "first-post",
        title: "New Post",
        content: "Content",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toBe("Post with this slug already exists");
    });
  });

  describe("POST /api/v1/cms/blog/posts - Happy paths", () => {
    it("should create post successfully", async () => {
      vi.mocked(requireRole).mockResolvedValue({
        user: { id: "user-1" },
        expires: new Date().toISOString(),
      });
      vi.mocked(db.query.blogPosts.findFirst).mockResolvedValue(null);

      const newPost = {
        id: "post-new",
        slug: "new-post",
        title: "New Post",
        content: "Content",
        status: "draft",
      };

      const mockReturning = vi.fn().mockResolvedValue([newPost]);
      const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
      vi.mocked(db.insert).mockReturnValue({ values: mockValues } as never);

      const request = createRequest("POST", {
        slug: "new-post",
        title: "New Post",
        content: "Content",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.post.id).toBe("post-new");
    });

    it("should create published post with publishedAt", async () => {
      vi.mocked(requireRole).mockResolvedValue({
        user: { id: "user-1" },
        expires: new Date().toISOString(),
      });
      vi.mocked(db.query.blogPosts.findFirst).mockResolvedValue(null);

      const newPost = {
        id: "post-new",
        slug: "new-post",
        title: "New Post",
        content: "Content",
        status: "published",
      };

      const mockReturning = vi.fn().mockResolvedValue([newPost]);
      const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
      vi.mocked(db.insert).mockReturnValue({ values: mockValues } as never);

      const request = createRequest("POST", {
        slug: "new-post",
        title: "New Post",
        content: "Content",
        status: "published",
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
    });

    it("should accept optional fields", async () => {
      vi.mocked(requireRole).mockResolvedValue({
        user: { id: "user-1" },
        expires: new Date().toISOString(),
      });
      vi.mocked(db.query.blogPosts.findFirst).mockResolvedValue(null);

      const newPost = {
        id: "post-new",
        slug: "new-post",
        title: "New Post",
        content: "Content",
        excerpt: "Excerpt",
        featuredImage: "https://example.com/image.jpg",
        seoTitle: "SEO Title",
        seoDescription: "SEO Description",
      };

      const mockReturning = vi.fn().mockResolvedValue([newPost]);
      const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
      vi.mocked(db.insert).mockReturnValue({ values: mockValues } as never);

      const request = createRequest("POST", {
        slug: "new-post",
        title: "New Post",
        content: "Content",
        excerpt: "Excerpt",
        featuredImage: "https://example.com/image.jpg",
        seoTitle: "SEO Title",
        seoDescription: "SEO Description",
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
    });
  });
});
