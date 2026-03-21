// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock auth-utils
vi.mock("@/lib/auth-utils", () => ({
  requireRole: vi.fn(),
}));

// Mock database
vi.mock("@scaffold-competition/database/client", () => ({
  db: {
    query: {
      docsPages: { findFirst: vi.fn(), findMany: vi.fn() },
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
vi.mock("@scaffold-competition/database/schema", () => ({
  docsPages: {
    id: "id",
    slug: "slug",
    parentId: "parent_id",
    order: "order",
    title: "title",
    updatedAt: "updated_at",
  },
}));

import { GET, PATCH, DELETE } from "./route";
import { requireRole } from "@/lib/auth-utils";
import { db } from "@scaffold-competition/database/client";

function createRequest(
  method: string,
  body?: unknown,
  searchParams?: Record<string, string>
): Request {
  const url = new URL("http://localhost:3000/api/v1/cms/docs/doc-1");
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

const mockDoc = {
  id: "doc-1",
  slug: "getting-started",
  title: "Getting Started",
  content: "# Getting Started\n\nWelcome to the docs!",
  parentId: null,
  order: 0,
  seoTitle: "Getting Started Guide",
  seoDescription: "Learn how to get started.",
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-15"),
  parent: null,
  children: [
    {
      id: "doc-2",
      slug: "installation",
      title: "Installation",
      order: 0,
    },
  ],
};

describe("Docs [docId] route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/v1/cms/docs/[docId] - Public", () => {
    it("should return doc for public request", async () => {
      vi.mocked(db.query.docsPages.findFirst).mockResolvedValue(mockDoc);

      const request = createRequest("GET", undefined, { public: "true" });
      const response = await GET(request, {
        params: Promise.resolve({ docId: "doc-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.doc.id).toBe("doc-1");
      expect(data.doc.title).toBe("Getting Started");
      expect(requireRole).not.toHaveBeenCalled();
    });

    it("should include parent and children in response", async () => {
      vi.mocked(db.query.docsPages.findFirst).mockResolvedValue(mockDoc);

      const request = createRequest("GET", undefined, { public: "true" });
      const response = await GET(request, {
        params: Promise.resolve({ docId: "doc-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.doc.children).toHaveLength(1);
      expect(data.doc.children[0].slug).toBe("installation");
    });

    it("should return 404 when doc not found", async () => {
      vi.mocked(db.query.docsPages.findFirst).mockResolvedValue(null);

      const request = createRequest("GET", undefined, { public: "true" });
      const response = await GET(request, {
        params: Promise.resolve({ docId: "non-existent" }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Doc not found");
    });
  });

  describe("GET /api/v1/cms/docs/[docId] - Admin", () => {
    it("should require admin for non-public request", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);
      vi.mocked(db.query.docsPages.findFirst).mockResolvedValue(mockDoc);

      const request = createRequest("GET");
      await GET(request, { params: Promise.resolve({ docId: "doc-1" }) });

      expect(requireRole).toHaveBeenCalledWith("admin");
    });

    it("should return 500 on internal error", async () => {
      vi.mocked(db.query.docsPages.findFirst).mockRejectedValue(
        new Error("Database error")
      );

      const request = createRequest("GET", undefined, { public: "true" });
      const response = await GET(request, {
        params: Promise.resolve({ docId: "doc-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal error");
    });
  });

  describe("PATCH /api/v1/cms/docs/[docId] - Authorization", () => {
    it("should require admin role", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const mockReturning = vi.fn().mockResolvedValue([mockDoc]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      vi.mocked(db.update).mockReturnValue({ set: mockSet } as never);

      const request = createRequest("PATCH", { title: "Updated Title" });
      await PATCH(request, { params: Promise.resolve({ docId: "doc-1" }) });

      expect(requireRole).toHaveBeenCalledWith("admin");
    });
  });

  describe("PATCH /api/v1/cms/docs/[docId] - Validation", () => {
    it("should return 400 for invalid slug format", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const request = createRequest("PATCH", { slug: "Invalid Slug!" });
      const response = await PATCH(request, {
        params: Promise.resolve({ docId: "doc-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid input");
    });

    it("should return 400 for empty title", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const request = createRequest("PATCH", { title: "" });
      const response = await PATCH(request, {
        params: Promise.resolve({ docId: "doc-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid input");
    });

    it("should return 409 when slug already exists", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);
      vi.mocked(db.query.docsPages.findFirst).mockResolvedValue({
        id: "doc-other",
        slug: "existing-slug",
      });

      const request = createRequest("PATCH", { slug: "existing-slug" });
      const response = await PATCH(request, {
        params: Promise.resolve({ docId: "doc-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toBe("Doc with this slug already exists");
    });

    it("should allow updating to same slug", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);
      vi.mocked(db.query.docsPages.findFirst).mockResolvedValue({
        id: "doc-1",
        slug: "getting-started",
      });

      const mockReturning = vi.fn().mockResolvedValue([mockDoc]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      vi.mocked(db.update).mockReturnValue({ set: mockSet } as never);

      const request = createRequest("PATCH", { slug: "getting-started" });
      const response = await PATCH(request, {
        params: Promise.resolve({ docId: "doc-1" }),
      });

      expect(response.status).toBe(200);
    });

    it("should return 400 for invalid parent UUID format", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const request = createRequest("PATCH", { parentId: "not-a-uuid" });
      const response = await PATCH(request, {
        params: Promise.resolve({ docId: "doc-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid input");
    });

    it("should return 404 when parent not found", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);
      vi.mocked(db.query.docsPages.findFirst).mockResolvedValue(null);

      const request = createRequest("PATCH", {
        parentId: "00000000-0000-0000-0000-000000000000",
      });
      const response = await PATCH(request, {
        params: Promise.resolve({ docId: "doc-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Parent doc not found");
    });

    it("should return 404 when doc not found", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const mockReturning = vi.fn().mockResolvedValue([]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      vi.mocked(db.update).mockReturnValue({ set: mockSet } as never);

      const request = createRequest("PATCH", { title: "Updated" });
      const response = await PATCH(request, {
        params: Promise.resolve({ docId: "non-existent" }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Doc not found");
    });
  });

  describe("PATCH /api/v1/cms/docs/[docId] - Happy paths", () => {
    it("should update doc title", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const updatedDoc = { ...mockDoc, title: "Updated Title" };

      const mockReturning = vi.fn().mockResolvedValue([updatedDoc]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      vi.mocked(db.update).mockReturnValue({ set: mockSet } as never);

      const request = createRequest("PATCH", { title: "Updated Title" });
      const response = await PATCH(request, {
        params: Promise.resolve({ docId: "doc-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.doc.title).toBe("Updated Title");
    });

    it("should update doc content", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const updatedDoc = { ...mockDoc, content: "# New Content" };

      const mockReturning = vi.fn().mockResolvedValue([updatedDoc]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      vi.mocked(db.update).mockReturnValue({ set: mockSet } as never);

      const request = createRequest("PATCH", { content: "# New Content" });
      const response = await PATCH(request, {
        params: Promise.resolve({ docId: "doc-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.doc.content).toBe("# New Content");
    });

    it("should update doc order", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const updatedDoc = { ...mockDoc, order: 5 };

      const mockReturning = vi.fn().mockResolvedValue([updatedDoc]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      vi.mocked(db.update).mockReturnValue({ set: mockSet } as never);

      const request = createRequest("PATCH", { order: 5 });
      const response = await PATCH(request, {
        params: Promise.resolve({ docId: "doc-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.doc.order).toBe(5);
    });

    it("should update SEO fields", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const updatedDoc = {
        ...mockDoc,
        seoTitle: "New SEO Title",
        seoDescription: "New description",
      };

      const mockReturning = vi.fn().mockResolvedValue([updatedDoc]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      vi.mocked(db.update).mockReturnValue({ set: mockSet } as never);

      const request = createRequest("PATCH", {
        seoTitle: "New SEO Title",
        seoDescription: "New description",
      });
      const response = await PATCH(request, {
        params: Promise.resolve({ docId: "doc-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.doc.seoTitle).toBe("New SEO Title");
    });

    it("should update doc with valid data", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const updatedDoc = {
        ...mockDoc,
        title: "Updated Documentation",
      };

      const mockReturning = vi.fn().mockResolvedValue([updatedDoc]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      vi.mocked(db.update).mockReturnValue({ set: mockSet } as never);

      const request = createRequest("PATCH", { title: "Updated Documentation" });
      const response = await PATCH(request, {
        params: Promise.resolve({ docId: "doc-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.doc.title).toBe("Updated Documentation");
    });

    it("should allow setting parentId to null (move to root)", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const updatedDoc = { ...mockDoc, parentId: null };

      const mockReturning = vi.fn().mockResolvedValue([updatedDoc]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      vi.mocked(db.update).mockReturnValue({ set: mockSet } as never);

      const request = createRequest("PATCH", { parentId: null });
      const response = await PATCH(request, {
        params: Promise.resolve({ docId: "doc-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.doc.parentId).toBeNull();
    });
  });

  describe("DELETE /api/v1/cms/docs/[docId] - Authorization", () => {
    it("should require admin role", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);
      vi.mocked(db.query.docsPages.findMany).mockResolvedValue([]);

      const mockReturning = vi.fn().mockResolvedValue([{ id: "doc-1" }]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      vi.mocked(db.delete).mockReturnValue({ where: mockWhere } as never);

      const request = createRequest("DELETE");
      await DELETE(request, { params: Promise.resolve({ docId: "doc-1" }) });

      expect(requireRole).toHaveBeenCalledWith("admin");
    });
  });

  describe("DELETE /api/v1/cms/docs/[docId] - Validation", () => {
    it("should return 400 when doc has children", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);
      vi.mocked(db.query.docsPages.findMany).mockResolvedValue([
        { id: "child-1" },
        { id: "child-2" },
      ]);

      const request = createRequest("DELETE");
      const response = await DELETE(request, {
        params: Promise.resolve({ docId: "doc-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe(
        "Cannot delete doc with children. Delete children first."
      );
    });

    it("should return 404 when doc not found", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);
      vi.mocked(db.query.docsPages.findMany).mockResolvedValue([]);

      const mockReturning = vi.fn().mockResolvedValue([]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      vi.mocked(db.delete).mockReturnValue({ where: mockWhere } as never);

      const request = createRequest("DELETE");
      const response = await DELETE(request, {
        params: Promise.resolve({ docId: "non-existent" }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Doc not found");
    });
  });

  describe("DELETE /api/v1/cms/docs/[docId] - Happy paths", () => {
    it("should delete doc successfully", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);
      vi.mocked(db.query.docsPages.findMany).mockResolvedValue([]);

      const mockReturning = vi.fn().mockResolvedValue([{ id: "doc-1" }]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      vi.mocked(db.delete).mockReturnValue({ where: mockWhere } as never);

      const request = createRequest("DELETE");
      const response = await DELETE(request, {
        params: Promise.resolve({ docId: "doc-1" }),
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
        params: Promise.resolve({ docId: "doc-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal error");
    });

    it("DELETE should return 500 on internal error", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);
      vi.mocked(db.query.docsPages.findMany).mockRejectedValue(
        new Error("Database error")
      );

      const request = createRequest("DELETE");
      const response = await DELETE(request, {
        params: Promise.resolve({ docId: "doc-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal error");
    });
  });
});
