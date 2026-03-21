// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock auth-utils
vi.mock("@/lib/auth-utils", () => ({
  requireRole: vi.fn(),
}));

// Mock database
vi.mock("@scaffold-landing-pages/database/client", () => ({
  db: {
    query: {
      cmsPages: { findFirst: vi.fn() },
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
vi.mock("@scaffold-landing-pages/database/schema", () => ({
  cmsPages: {
    id: "id",
    slug: "slug",
    publishedAt: "published_at",
    updatedAt: "updated_at",
  },
  cmsSections: {
    order: "order",
  },
}));

import { GET, PATCH, DELETE } from "./route";
import { requireRole } from "@/lib/auth-utils";
import { db } from "@scaffold-landing-pages/database/client";

function createRequest(method: string, body?: unknown): Request {
  const url = new URL("http://localhost:3000/api/v1/cms/pages/page-1");
  return new Request(url.toString(), {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { "Content-Type": "application/json" } : undefined,
  });
}

const mockPage = {
  id: "page-1",
  slug: "about",
  title: "About Us",
  seoTitle: "About Us | Company",
  seoDescription: "Learn more about our company",
  ogImage: "https://example.com/og.png",
  status: "published",
  publishedAt: new Date("2024-01-15"),
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-15"),
  sections: [
    {
      id: "section-1",
      type: "hero",
      content: { title: "Welcome" },
      order: 0,
    },
  ],
};

describe("CMS Pages [pageId] route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/v1/cms/pages/[pageId] - Authorization", () => {
    it("should require admin role", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);
      vi.mocked(db.query.cmsPages.findFirst).mockResolvedValue(mockPage);

      const request = createRequest("GET");
      await GET(request, { params: Promise.resolve({ pageId: "page-1" }) });

      expect(requireRole).toHaveBeenCalledWith("admin");
    });
  });

  describe("GET /api/v1/cms/pages/[pageId] - Happy paths", () => {
    it("should return page with sections", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);
      vi.mocked(db.query.cmsPages.findFirst).mockResolvedValue(mockPage);

      const request = createRequest("GET");
      const response = await GET(request, {
        params: Promise.resolve({ pageId: "page-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.page.id).toBe("page-1");
      expect(data.page.sections).toHaveLength(1);
    });

    it("should return 404 when page not found", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);
      vi.mocked(db.query.cmsPages.findFirst).mockResolvedValue(null);

      const request = createRequest("GET");
      const response = await GET(request, {
        params: Promise.resolve({ pageId: "non-existent" }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Page not found");
    });

    it("should return 500 on internal error", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);
      vi.mocked(db.query.cmsPages.findFirst).mockRejectedValue(
        new Error("Database error")
      );

      const request = createRequest("GET");
      const response = await GET(request, {
        params: Promise.resolve({ pageId: "page-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal error");
    });
  });

  describe("PATCH /api/v1/cms/pages/[pageId] - Authorization", () => {
    it("should require admin role", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const mockReturning = vi.fn().mockResolvedValue([mockPage]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      vi.mocked(db.update).mockReturnValue({ set: mockSet } as never);

      const request = createRequest("PATCH", { title: "Updated Title" });
      await PATCH(request, { params: Promise.resolve({ pageId: "page-1" }) });

      expect(requireRole).toHaveBeenCalledWith("admin");
    });
  });

  describe("PATCH /api/v1/cms/pages/[pageId] - Validation", () => {
    it("should return 400 for invalid slug format", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const request = createRequest("PATCH", { slug: "Invalid Slug!" });
      const response = await PATCH(request, {
        params: Promise.resolve({ pageId: "page-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid input");
    });

    it("should return 400 for invalid status", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const request = createRequest("PATCH", { status: "invalid" });
      const response = await PATCH(request, {
        params: Promise.resolve({ pageId: "page-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid input");
    });

    it("should return 400 for invalid ogImage URL", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const request = createRequest("PATCH", { ogImage: "not-a-url" });
      const response = await PATCH(request, {
        params: Promise.resolve({ pageId: "page-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid input");
    });

    it("should return 404 when page not found", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const mockReturning = vi.fn().mockResolvedValue([]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      vi.mocked(db.update).mockReturnValue({ set: mockSet } as never);

      const request = createRequest("PATCH", { title: "Updated" });
      const response = await PATCH(request, {
        params: Promise.resolve({ pageId: "non-existent" }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Page not found");
    });
  });

  describe("PATCH /api/v1/cms/pages/[pageId] - Happy paths", () => {
    it("should update page title", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const updatedPage = { ...mockPage, title: "Updated Title" };

      const mockReturning = vi.fn().mockResolvedValue([updatedPage]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      vi.mocked(db.update).mockReturnValue({ set: mockSet } as never);

      const request = createRequest("PATCH", { title: "Updated Title" });
      const response = await PATCH(request, {
        params: Promise.resolve({ pageId: "page-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.page.title).toBe("Updated Title");
    });

    it("should update page slug", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const updatedPage = { ...mockPage, slug: "new-slug" };

      const mockReturning = vi.fn().mockResolvedValue([updatedPage]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      vi.mocked(db.update).mockReturnValue({ set: mockSet } as never);

      const request = createRequest("PATCH", { slug: "new-slug" });
      const response = await PATCH(request, {
        params: Promise.resolve({ pageId: "page-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.page.slug).toBe("new-slug");
    });

    it("should update page status", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const updatedPage = { ...mockPage, status: "draft" };

      const mockReturning = vi.fn().mockResolvedValue([updatedPage]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      vi.mocked(db.update).mockReturnValue({ set: mockSet } as never);

      const request = createRequest("PATCH", { status: "draft" });
      const response = await PATCH(request, {
        params: Promise.resolve({ pageId: "page-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.page.status).toBe("draft");
    });

    it("should accept all valid status values", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const statuses = ["draft", "published", "archived"];
      for (const status of statuses) {
        // Mock the findFirst call that happens when status is "published"
        vi.mocked(db.query.cmsPages.findFirst).mockResolvedValue({
          publishedAt: new Date(),
        });

        const updatedPage = { ...mockPage, status };

        const mockReturning = vi.fn().mockResolvedValue([updatedPage]);
        const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
        const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
        vi.mocked(db.update).mockReturnValue({ set: mockSet } as never);

        const request = createRequest("PATCH", { status });
        const response = await PATCH(request, {
          params: Promise.resolve({ pageId: "page-1" }),
        });

        expect(response.status).toBe(200);
      }
    });

    it("should update SEO fields", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const updatedPage = {
        ...mockPage,
        seoTitle: "New SEO Title",
        seoDescription: "New description",
      };

      const mockReturning = vi.fn().mockResolvedValue([updatedPage]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      vi.mocked(db.update).mockReturnValue({ set: mockSet } as never);

      const request = createRequest("PATCH", {
        seoTitle: "New SEO Title",
        seoDescription: "New description",
      });
      const response = await PATCH(request, {
        params: Promise.resolve({ pageId: "page-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.page.seoTitle).toBe("New SEO Title");
    });

    it("should allow clearing nullable fields", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const updatedPage = {
        ...mockPage,
        seoTitle: null,
        ogImage: null,
      };

      const mockReturning = vi.fn().mockResolvedValue([updatedPage]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      vi.mocked(db.update).mockReturnValue({ set: mockSet } as never);

      const request = createRequest("PATCH", {
        seoTitle: null,
        ogImage: null,
      });
      const response = await PATCH(request, {
        params: Promise.resolve({ pageId: "page-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.page.seoTitle).toBeNull();
    });
  });

  describe("DELETE /api/v1/cms/pages/[pageId] - Authorization", () => {
    it("should require admin role", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const mockReturning = vi.fn().mockResolvedValue([{ id: "page-1" }]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      vi.mocked(db.delete).mockReturnValue({ where: mockWhere } as never);

      const request = createRequest("DELETE");
      await DELETE(request, { params: Promise.resolve({ pageId: "page-1" }) });

      expect(requireRole).toHaveBeenCalledWith("admin");
    });
  });

  describe("DELETE /api/v1/cms/pages/[pageId] - Validation", () => {
    it("should return 404 when page not found", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const mockReturning = vi.fn().mockResolvedValue([]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      vi.mocked(db.delete).mockReturnValue({ where: mockWhere } as never);

      const request = createRequest("DELETE");
      const response = await DELETE(request, {
        params: Promise.resolve({ pageId: "non-existent" }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Page not found");
    });
  });

  describe("DELETE /api/v1/cms/pages/[pageId] - Happy paths", () => {
    it("should delete page successfully", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const mockReturning = vi.fn().mockResolvedValue([{ id: "page-1" }]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      vi.mocked(db.delete).mockReturnValue({ where: mockWhere } as never);

      const request = createRequest("DELETE");
      const response = await DELETE(request, {
        params: Promise.resolve({ pageId: "page-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe("Error handling", () => {
    it("PATCH should return 500 on internal error", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const mockSet = vi.fn().mockImplementation(() => {
        throw new Error("Database error");
      });
      vi.mocked(db.update).mockReturnValue({ set: mockSet } as never);

      const request = createRequest("PATCH", { title: "Updated" });
      const response = await PATCH(request, {
        params: Promise.resolve({ pageId: "page-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal error");
    });

    it("DELETE should return 500 on internal error", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const mockWhere = vi.fn().mockImplementation(() => {
        throw new Error("Database error");
      });
      vi.mocked(db.delete).mockReturnValue({ where: mockWhere } as never);

      const request = createRequest("DELETE");
      const response = await DELETE(request, {
        params: Promise.resolve({ pageId: "page-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal error");
    });
  });
});
