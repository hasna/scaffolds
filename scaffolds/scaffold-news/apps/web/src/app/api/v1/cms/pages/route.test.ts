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
      cmsPages: { findMany: vi.fn(), findFirst: vi.fn() },
    },
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(),
      })),
    })),
  },
}));

// Mock schema
vi.mock("@scaffold-news/database/schema", () => ({
  cmsPages: {
    id: "id",
    slug: "slug",
    updatedAt: "updated_at",
  },
  cmsSections: {
    order: "order",
  },
}));

import { GET, POST } from "./route";
import { requireRole } from "@/lib/auth-utils";
import { db } from "@scaffold-news/database/client";

function createRequest(method: string, body?: unknown): Request {
  const url = new URL("http://localhost:3000/api/v1/cms/pages");
  return new Request(url.toString(), {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { "Content-Type": "application/json" } : undefined,
  });
}

const mockPages = [
  {
    id: "page-1",
    slug: "about",
    title: "About Us",
    seoTitle: "About Us | Company",
    seoDescription: "Learn about our company",
    ogImage: null,
    status: "published",
    publishedAt: new Date("2024-01-15"),
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-15"),
    sections: [{ id: "section-1", type: "hero", order: 0 }],
  },
  {
    id: "page-2",
    slug: "contact",
    title: "Contact",
    seoTitle: null,
    seoDescription: null,
    ogImage: null,
    status: "draft",
    publishedAt: null,
    createdAt: new Date("2024-01-10"),
    updatedAt: new Date("2024-01-10"),
    sections: [],
  },
];

describe("CMS Pages route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/v1/cms/pages - Authorization", () => {
    it("should require admin role", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);
      vi.mocked(db.query.cmsPages.findMany).mockResolvedValue(mockPages);

      await GET();

      expect(requireRole).toHaveBeenCalledWith("admin");
    });
  });

  describe("GET /api/v1/cms/pages - Happy paths", () => {
    it("should return list of pages with sections", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);
      vi.mocked(db.query.cmsPages.findMany).mockResolvedValue(mockPages);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.pages).toHaveLength(2);
      expect(data.pages[0].sections).toHaveLength(1);
    });

    it("should return empty array when no pages", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);
      vi.mocked(db.query.cmsPages.findMany).mockResolvedValue([]);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.pages).toHaveLength(0);
    });

    it("should return 500 on internal error", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);
      vi.mocked(db.query.cmsPages.findMany).mockRejectedValue(
        new Error("Database error")
      );

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal error");
    });
  });

  describe("POST /api/v1/cms/pages - Authorization", () => {
    it("should require admin role", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);
      vi.mocked(db.query.cmsPages.findFirst).mockResolvedValue(null);

      const newPage = { ...mockPages[0], id: "page-new", slug: "new-page" };
      const mockReturning = vi.fn().mockResolvedValue([newPage]);
      const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
      vi.mocked(db.insert).mockReturnValue({ values: mockValues } as never);

      const request = createRequest("POST", {
        slug: "new-page",
        title: "New Page",
      });
      await POST(request);

      expect(requireRole).toHaveBeenCalledWith("admin");
    });
  });

  describe("POST /api/v1/cms/pages - Validation", () => {
    it("should return 400 for missing slug", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const request = createRequest("POST", { title: "New Page" });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid input");
    });

    it("should return 400 for missing title", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const request = createRequest("POST", { slug: "new-page" });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid input");
    });

    it("should return 400 for invalid slug format", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const request = createRequest("POST", {
        slug: "Invalid Slug!",
        title: "New Page",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid input");
    });

    it("should return 400 for slug with uppercase", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const request = createRequest("POST", {
        slug: "New-Page",
        title: "New Page",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid input");
    });

    it("should return 400 for invalid ogImage URL", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const request = createRequest("POST", {
        slug: "new-page",
        title: "New Page",
        ogImage: "not-a-url",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid input");
    });

    it("should return 400 for invalid status", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const request = createRequest("POST", {
        slug: "new-page",
        title: "New Page",
        status: "invalid",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid input");
    });

    it("should return 409 when slug already exists", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);
      vi.mocked(db.query.cmsPages.findFirst).mockResolvedValue(mockPages[0]);

      const request = createRequest("POST", {
        slug: "about",
        title: "New About Page",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toBe("Page with this slug already exists");
    });
  });

  describe("POST /api/v1/cms/pages - Happy paths", () => {
    it("should create page with required fields only", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);
      vi.mocked(db.query.cmsPages.findFirst).mockResolvedValue(null);

      const newPage = {
        id: "page-new",
        slug: "new-page",
        title: "New Page",
        seoTitle: null,
        seoDescription: null,
        ogImage: null,
        status: "draft",
        publishedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockReturning = vi.fn().mockResolvedValue([newPage]);
      const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
      vi.mocked(db.insert).mockReturnValue({ values: mockValues } as never);

      const request = createRequest("POST", {
        slug: "new-page",
        title: "New Page",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.page.slug).toBe("new-page");
      expect(data.page.title).toBe("New Page");
    });

    it("should create page with all optional fields", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);
      vi.mocked(db.query.cmsPages.findFirst).mockReset().mockResolvedValue(null);

      const newPage = {
        id: "page-full",
        slug: "full-page",
        title: "Full Page",
        seoTitle: "Full Page | SEO Title",
        seoDescription: "SEO Description for the page",
        ogImage: "https://example.com/og.png",
        status: "draft",
        publishedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockReturning = vi.fn().mockResolvedValue([newPage]);
      const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
      vi.mocked(db.insert).mockReturnValue({ values: mockValues } as never);

      const request = createRequest("POST", {
        slug: "full-page",
        title: "Full Page",
        seoTitle: "Full Page | SEO Title",
        seoDescription: "SEO Description for the page",
        ogImage: "https://example.com/og.png",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.page.seoTitle).toBe("Full Page | SEO Title");
      expect(data.page.ogImage).toBe("https://example.com/og.png");
    });

    it("should set publishedAt when status is published", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);
      vi.mocked(db.query.cmsPages.findFirst).mockReset().mockResolvedValue(null);

      const newPage = {
        id: "page-published",
        slug: "published-page",
        title: "Published Page",
        seoTitle: null,
        seoDescription: null,
        ogImage: null,
        status: "published",
        publishedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockReturning = vi.fn().mockResolvedValue([newPage]);
      const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
      vi.mocked(db.insert).mockReturnValue({ values: mockValues } as never);

      const request = createRequest("POST", {
        slug: "published-page",
        title: "Published Page",
        status: "published",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.page.status).toBe("published");
      expect(data.page.publishedAt).not.toBeNull();
    });

    it("should accept all valid status values", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const statuses = ["draft", "published", "archived"];
      for (const status of statuses) {
        vi.mocked(db.query.cmsPages.findFirst).mockReset().mockResolvedValue(null);

        const newPage = {
          id: `page-${status}`,
          slug: `${status}-page`,
          title: `${status} Page`,
          status,
          publishedAt: status === "published" ? new Date() : null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const mockReturning = vi.fn().mockResolvedValue([newPage]);
        const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
        vi.mocked(db.insert).mockReturnValue({ values: mockValues } as never);

        const request = createRequest("POST", {
          slug: `${status}-page`,
          title: `${status} Page`,
          status,
        });
        const response = await POST(request);

        expect(response.status).toBe(201);
      }
    });
  });

  describe("Error handling", () => {
    it("POST should return 500 on internal error", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);
      vi.mocked(db.query.cmsPages.findFirst).mockRejectedValue(
        new Error("Database error")
      );

      const request = createRequest("POST", {
        slug: "new-page",
        title: "New Page",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal error");
    });
  });
});
