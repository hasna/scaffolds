// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock auth-utils
vi.mock("@/lib/auth-utils", () => ({
  requireRole: vi.fn(),
}));

// Mock database
vi.mock("@scaffold-news/database/client", () => ({
  db: {
    query: {
      blogCategories: { findMany: vi.fn(), findFirst: vi.fn() },
    },
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(),
      })),
    })),
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
vi.mock("@scaffold-news/database/schema", () => ({
  blogCategories: {
    id: "id",
    slug: "slug",
    name: "name",
    updatedAt: "updated_at",
  },
}));

import { GET, POST, PATCH, DELETE } from "./route";
import { requireRole } from "@/lib/auth-utils";
import { db } from "@scaffold-news/database/client";

function createRequest(
  method: string,
  body?: unknown,
  searchParams?: Record<string, string>
): Request {
  const url = new URL("http://localhost:3000/api/v1/cms/blog/categories");
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

const mockCategories = [
  {
    id: "cat-1",
    slug: "technology",
    name: "Technology",
    description: "Tech articles",
    posts: [{ id: "post-1" }, { id: "post-2" }],
  },
  {
    id: "cat-2",
    slug: "business",
    name: "Business",
    description: "Business articles",
    posts: [{ id: "post-3" }],
  },
];

describe("Blog Categories route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/v1/cms/blog/categories", () => {
    it("should return list of categories with post counts", async () => {
      vi.mocked(db.query.blogCategories.findMany).mockResolvedValue(mockCategories);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.categories).toHaveLength(2);
      expect(data.categories[0].postCount).toBe(2);
      expect(data.categories[1].postCount).toBe(1);
      // Posts should be removed from response
      expect(data.categories[0].posts).toBeUndefined();
    });

    it("should return empty array when no categories exist", async () => {
      vi.mocked(db.query.blogCategories.findMany).mockResolvedValue([]);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.categories).toHaveLength(0);
    });

    it("should return 500 on internal error", async () => {
      vi.mocked(db.query.blogCategories.findMany).mockRejectedValue(
        new Error("Database error")
      );

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal error");
    });
  });

  describe("POST /api/v1/cms/blog/categories - Authorization", () => {
    it("should check for admin role", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);
      vi.mocked(db.query.blogCategories.findFirst).mockResolvedValue(null);

      const mockReturning = vi.fn().mockResolvedValue([mockCategories[0]]);
      const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
      vi.mocked(db.insert).mockReturnValue({ values: mockValues } as never);

      const request = createRequest("POST", {
        slug: "technology",
        name: "Technology",
      });
      await POST(request);

      expect(requireRole).toHaveBeenCalledWith("admin");
    });

    it("should return error when not admin", async () => {
      vi.mocked(requireRole).mockRejectedValue(new Error("Forbidden"));

      const request = createRequest("POST", {
        slug: "technology",
        name: "Technology",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal error");
    });
  });

  describe("POST /api/v1/cms/blog/categories - Validation", () => {
    it("should return 400 for missing slug", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const request = createRequest("POST", { name: "Technology" });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid input");
    });

    it("should return 400 for missing name", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const request = createRequest("POST", { slug: "technology" });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid input");
    });

    it("should return 400 for invalid slug format", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const request = createRequest("POST", {
        slug: "Invalid Slug!",
        name: "Technology",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid input");
    });

    it("should return 409 for duplicate slug", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);
      vi.mocked(db.query.blogCategories.findFirst).mockResolvedValue(
        mockCategories[0]
      );

      const request = createRequest("POST", {
        slug: "technology",
        name: "Technology",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toBe("Category with this slug already exists");
    });
  });

  describe("POST /api/v1/cms/blog/categories - Happy paths", () => {
    it("should create category successfully", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);
      vi.mocked(db.query.blogCategories.findFirst).mockResolvedValue(null);

      const newCategory = {
        id: "cat-new",
        slug: "new-category",
        name: "New Category",
        description: "A new category",
      };

      const mockReturning = vi.fn().mockResolvedValue([newCategory]);
      const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
      vi.mocked(db.insert).mockReturnValue({ values: mockValues } as never);

      const request = createRequest("POST", {
        slug: "new-category",
        name: "New Category",
        description: "A new category",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.category.id).toBe("cat-new");
      expect(data.category.slug).toBe("new-category");
    });
  });

  describe("PATCH /api/v1/cms/blog/categories - Authorization", () => {
    it("should check for admin role", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const mockReturning = vi.fn().mockResolvedValue([mockCategories[0]]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      vi.mocked(db.update).mockReturnValue({ set: mockSet } as never);

      const request = createRequest("PATCH", {
        categoryId: "cat-1",
        name: "Updated Technology",
      });
      await PATCH(request);

      expect(requireRole).toHaveBeenCalledWith("admin");
    });
  });

  describe("PATCH /api/v1/cms/blog/categories - Validation", () => {
    it("should return 400 when categoryId is missing", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const request = createRequest("PATCH", { name: "Updated" });
      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("categoryId required");
    });

    it("should return 400 for invalid slug format in update", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const request = createRequest("PATCH", {
        categoryId: "cat-1",
        slug: "Invalid Slug!",
      });
      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid input");
    });

    it("should return 404 when category not found", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const mockReturning = vi.fn().mockResolvedValue([]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      vi.mocked(db.update).mockReturnValue({ set: mockSet } as never);

      const request = createRequest("PATCH", {
        categoryId: "non-existent",
        name: "Updated",
      });
      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Category not found");
    });
  });

  describe("PATCH /api/v1/cms/blog/categories - Happy paths", () => {
    it("should update category successfully", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const updatedCategory = {
        ...mockCategories[0],
        name: "Updated Technology",
      };

      const mockReturning = vi.fn().mockResolvedValue([updatedCategory]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      vi.mocked(db.update).mockReturnValue({ set: mockSet } as never);

      const request = createRequest("PATCH", {
        categoryId: "cat-1",
        name: "Updated Technology",
      });
      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.category.name).toBe("Updated Technology");
    });
  });

  describe("DELETE /api/v1/cms/blog/categories - Authorization", () => {
    it("should check for admin role", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const mockReturning = vi.fn().mockResolvedValue([{ id: "cat-1" }]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      vi.mocked(db.delete).mockReturnValue({ where: mockWhere } as never);

      const request = createRequest("DELETE", undefined, { categoryId: "cat-1" });
      await DELETE(request);

      expect(requireRole).toHaveBeenCalledWith("admin");
    });
  });

  describe("DELETE /api/v1/cms/blog/categories - Validation", () => {
    it("should return 400 when categoryId is missing", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const request = createRequest("DELETE");
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("categoryId required");
    });

    it("should return 404 when category not found", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const mockReturning = vi.fn().mockResolvedValue([]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      vi.mocked(db.delete).mockReturnValue({ where: mockWhere } as never);

      const request = createRequest("DELETE", undefined, {
        categoryId: "non-existent",
      });
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Category not found");
    });
  });

  describe("DELETE /api/v1/cms/blog/categories - Happy paths", () => {
    it("should delete category successfully", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const mockReturning = vi.fn().mockResolvedValue([{ id: "cat-1" }]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      vi.mocked(db.delete).mockReturnValue({ where: mockWhere } as never);

      const request = createRequest("DELETE", undefined, { categoryId: "cat-1" });
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });
});
