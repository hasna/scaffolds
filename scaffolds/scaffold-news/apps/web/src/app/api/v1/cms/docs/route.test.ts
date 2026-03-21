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
      docsPages: { findFirst: vi.fn(), findMany: vi.fn() },
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
  docsPages: {
    id: "id",
    slug: "slug",
    parentId: "parent_id",
    order: "order",
    title: "title",
    createdAt: "created_at",
  },
}));

import { GET, POST } from "./route";
import { requireRole } from "@/lib/auth-utils";
import { db } from "@scaffold-news/database/client";

function createRequest(
  method: string,
  body?: unknown,
  searchParams?: Record<string, string>
): Request {
  const url = new URL("http://localhost:3000/api/v1/cms/docs");
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

const mockDocs = [
  {
    id: "doc-1",
    slug: "getting-started",
    title: "Getting Started",
    content: "# Getting Started",
    parentId: null,
    order: 0,
    createdAt: new Date("2024-01-01"),
    children: [
      {
        id: "doc-1-1",
        slug: "installation",
        title: "Installation",
        order: 0,
      },
    ],
  },
  {
    id: "doc-2",
    slug: "api-reference",
    title: "API Reference",
    content: "# API Reference",
    parentId: null,
    order: 1,
    createdAt: new Date("2024-01-02"),
    children: [],
  },
];

describe("Docs route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/v1/cms/docs - Public", () => {
    it("should return docs for public request", async () => {
      vi.mocked(db.query.docsPages.findMany).mockResolvedValue(mockDocs);

      const request = createRequest("GET", undefined, { public: "true" });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.docs).toHaveLength(2);
      expect(requireRole).not.toHaveBeenCalled();
    });

    it("should include children in response", async () => {
      vi.mocked(db.query.docsPages.findMany).mockResolvedValue(mockDocs);

      const request = createRequest("GET", undefined, { public: "true" });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.docs[0].children).toHaveLength(1);
    });

    it("should filter by null parentId for root docs", async () => {
      vi.mocked(db.query.docsPages.findMany).mockResolvedValue(mockDocs);

      const request = createRequest("GET", undefined, {
        public: "true",
        parentId: "null",
      });
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(db.query.docsPages.findMany).toHaveBeenCalled();
    });

    it("should filter by specific parentId", async () => {
      vi.mocked(db.query.docsPages.findMany).mockResolvedValue([
        mockDocs[0].children[0],
      ]);

      const request = createRequest("GET", undefined, {
        public: "true",
        parentId: "doc-1",
      });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(db.query.docsPages.findMany).toHaveBeenCalled();
    });

    it("should return empty array when no docs", async () => {
      vi.mocked(db.query.docsPages.findMany).mockResolvedValue([]);

      const request = createRequest("GET", undefined, { public: "true" });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.docs).toHaveLength(0);
    });
  });

  describe("GET /api/v1/cms/docs - Admin", () => {
    it("should require admin for non-public request", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);
      vi.mocked(db.query.docsPages.findMany).mockResolvedValue(mockDocs);

      const request = createRequest("GET");
      await GET(request);

      expect(requireRole).toHaveBeenCalledWith("admin");
    });

    it("should return 500 on internal error", async () => {
      vi.mocked(db.query.docsPages.findMany).mockRejectedValue(
        new Error("Database error")
      );

      const request = createRequest("GET", undefined, { public: "true" });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal error");
    });
  });

  describe("POST /api/v1/cms/docs - Authorization", () => {
    it("should require admin role", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);
      vi.mocked(db.query.docsPages.findFirst).mockResolvedValue(null);

      const mockReturning = vi.fn().mockResolvedValue([mockDocs[0]]);
      const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
      vi.mocked(db.insert).mockReturnValue({ values: mockValues } as never);

      const request = createRequest("POST", {
        slug: "new-doc",
        title: "New Doc",
        content: "# New Doc",
      });
      await POST(request);

      expect(requireRole).toHaveBeenCalledWith("admin");
    });
  });

  describe("POST /api/v1/cms/docs - Validation", () => {
    it("should return 400 for missing slug", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const request = createRequest("POST", {
        title: "New Doc",
        content: "# New Doc",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid input");
    });

    it("should return 400 for missing title", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const request = createRequest("POST", {
        slug: "new-doc",
        content: "# New Doc",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid input");
    });

    it("should return 400 for missing content", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const request = createRequest("POST", {
        slug: "new-doc",
        title: "New Doc",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid input");
    });

    it("should return 400 for invalid slug format", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const request = createRequest("POST", {
        slug: "Invalid Slug!",
        title: "New Doc",
        content: "# New Doc",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid input");
    });

    it("should return 409 when slug already exists", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);
      vi.mocked(db.query.docsPages.findFirst).mockResolvedValue(mockDocs[0]);

      const request = createRequest("POST", {
        slug: "getting-started",
        title: "New Doc",
        content: "# New Doc",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toBe("Doc with this slug already exists");
    });

    it("should return 404 when parent not found", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);
      vi.mocked(db.query.docsPages.findFirst)
        .mockResolvedValueOnce(null) // slug check
        .mockResolvedValueOnce(null); // parent check

      const request = createRequest("POST", {
        slug: "new-doc",
        title: "New Doc",
        content: "# New Doc",
        parentId: "00000000-0000-0000-0000-000000000000",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Parent doc not found");
    });
  });

  describe("POST /api/v1/cms/docs - Happy paths", () => {
    it("should create doc without parent (root doc)", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);
      vi.mocked(db.query.docsPages.findFirst).mockResolvedValue(null);

      const newDoc = {
        id: "doc-new",
        slug: "new-doc",
        title: "New Doc",
        content: "# New Doc",
        parentId: null,
        order: 0,
        createdAt: new Date(),
      };

      const mockReturning = vi.fn().mockResolvedValue([newDoc]);
      const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
      vi.mocked(db.insert).mockReturnValue({ values: mockValues } as never);

      const request = createRequest("POST", {
        slug: "new-doc",
        title: "New Doc",
        content: "# New Doc",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.doc.slug).toBe("new-doc");
      expect(data.doc.parentId).toBeNull();
    });

    it("should create doc with default order", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);
      vi.mocked(db.query.docsPages.findFirst).mockResolvedValue(null);

      const newDoc = {
        id: "doc-new",
        slug: "another-doc",
        title: "Another Doc",
        content: "# Another Doc",
        parentId: null,
        order: 0,
        createdAt: new Date(),
      };

      const mockReturning = vi.fn().mockResolvedValue([newDoc]);
      const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
      vi.mocked(db.insert).mockReturnValue({ values: mockValues } as never);

      const request = createRequest("POST", {
        slug: "another-doc",
        title: "Another Doc",
        content: "# Another Doc",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.doc.order).toBe(0);
    });

    it("should create doc with custom order", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);
      vi.mocked(db.query.docsPages.findFirst).mockResolvedValue(null);

      const newDoc = {
        id: "doc-new",
        slug: "new-doc",
        title: "New Doc",
        content: "# New Doc",
        parentId: null,
        order: 5,
        createdAt: new Date(),
      };

      const mockReturning = vi.fn().mockResolvedValue([newDoc]);
      const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
      vi.mocked(db.insert).mockReturnValue({ values: mockValues } as never);

      const request = createRequest("POST", {
        slug: "new-doc",
        title: "New Doc",
        content: "# New Doc",
        order: 5,
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.doc.order).toBe(5);
    });

    it("should create doc with SEO fields", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);
      vi.mocked(db.query.docsPages.findFirst).mockReset().mockResolvedValue(null);

      const newDoc = {
        id: "doc-seo",
        slug: "seo-doc",
        title: "SEO Doc",
        content: "# SEO Doc",
        seoTitle: "SEO Doc | Documentation",
        seoDescription: "Learn about the SEO doc",
        parentId: null,
        order: 0,
        createdAt: new Date(),
      };

      const mockReturning = vi.fn().mockResolvedValue([newDoc]);
      const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
      vi.mocked(db.insert).mockReturnValue({ values: mockValues } as never);

      const request = createRequest("POST", {
        slug: "seo-doc",
        title: "SEO Doc",
        content: "# SEO Doc",
        seoTitle: "SEO Doc | Documentation",
        seoDescription: "Learn about the SEO doc",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.doc.seoTitle).toBe("SEO Doc | Documentation");
    });
  });

  describe("Error handling", () => {
    it("POST should return 500 on internal error", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);
      vi.mocked(db.query.docsPages.findFirst).mockRejectedValue(
        new Error("Database error")
      );

      const request = createRequest("POST", {
        slug: "new-doc",
        title: "New Doc",
        content: "# New Doc",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal error");
    });
  });
});
