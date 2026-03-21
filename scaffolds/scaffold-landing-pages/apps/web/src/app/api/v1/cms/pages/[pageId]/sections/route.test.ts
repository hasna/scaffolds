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
      cmsSections: { findMany: vi.fn() },
      cmsPages: { findFirst: vi.fn() },
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
vi.mock("@scaffold-landing-pages/database/schema", () => ({
  cmsSections: {
    id: "id",
    pageId: "page_id",
    order: "order",
    updatedAt: "updated_at",
  },
  cmsPages: {
    id: "id",
  },
}));

import { GET, POST, PATCH, DELETE } from "./route";
import { requireRole } from "@/lib/auth-utils";
import { db } from "@scaffold-landing-pages/database/client";

function createRequest(
  method: string,
  body?: unknown,
  searchParams?: Record<string, string>
): Request {
  const url = new URL("http://localhost:3000/api/v1/cms/pages/page-1/sections");
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

const mockSections = [
  {
    id: "section-1",
    pageId: "page-1",
    type: "hero",
    order: 0,
    content: { title: "Welcome" },
    enabled: true,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  },
  {
    id: "section-2",
    pageId: "page-1",
    type: "features",
    order: 1,
    content: { items: [] },
    enabled: true,
    createdAt: new Date("2024-01-02"),
    updatedAt: new Date("2024-01-02"),
  },
];

describe("CMS Pages Sections route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/v1/cms/pages/[pageId]/sections - Authorization", () => {
    it("should require admin role", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);
      vi.mocked(db.query.cmsSections.findMany).mockResolvedValue(mockSections);

      const request = createRequest("GET");
      await GET(request, { params: Promise.resolve({ pageId: "page-1" }) });

      expect(requireRole).toHaveBeenCalledWith("admin");
    });
  });

  describe("GET /api/v1/cms/pages/[pageId]/sections - Happy paths", () => {
    it("should return sections for page", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);
      vi.mocked(db.query.cmsSections.findMany).mockResolvedValue(mockSections);

      const request = createRequest("GET");
      const response = await GET(request, {
        params: Promise.resolve({ pageId: "page-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.sections).toHaveLength(2);
      expect(data.sections[0].type).toBe("hero");
    });

    it("should return empty array when no sections", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);
      vi.mocked(db.query.cmsSections.findMany).mockResolvedValue([]);

      const request = createRequest("GET");
      const response = await GET(request, {
        params: Promise.resolve({ pageId: "page-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.sections).toHaveLength(0);
    });

    it("should return 500 on internal error", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);
      vi.mocked(db.query.cmsSections.findMany).mockRejectedValue(
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

  describe("POST /api/v1/cms/pages/[pageId]/sections - Authorization", () => {
    it("should require admin role", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);
      vi.mocked(db.query.cmsPages.findFirst).mockResolvedValue({ id: "page-1" });

      const mockReturning = vi.fn().mockResolvedValue([mockSections[0]]);
      const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
      vi.mocked(db.insert).mockReturnValue({ values: mockValues } as never);

      const request = createRequest("POST", { type: "hero" });
      await POST(request, { params: Promise.resolve({ pageId: "page-1" }) });

      expect(requireRole).toHaveBeenCalledWith("admin");
    });
  });

  describe("POST /api/v1/cms/pages/[pageId]/sections - Validation", () => {
    it("should return 400 when type is missing", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const request = createRequest("POST", { order: 0 });
      const response = await POST(request, {
        params: Promise.resolve({ pageId: "page-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid input");
    });

    it("should return 400 when type is empty", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const request = createRequest("POST", { type: "" });
      const response = await POST(request, {
        params: Promise.resolve({ pageId: "page-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid input");
    });

    it("should return 400 when type exceeds max length", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const request = createRequest("POST", { type: "a".repeat(101) });
      const response = await POST(request, {
        params: Promise.resolve({ pageId: "page-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid input");
    });

    it("should return 400 when order is negative", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const request = createRequest("POST", { type: "hero", order: -1 });
      const response = await POST(request, {
        params: Promise.resolve({ pageId: "page-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid input");
    });

    it("should return 404 when page not found", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);
      vi.mocked(db.query.cmsPages.findFirst).mockResolvedValue(null);

      const request = createRequest("POST", { type: "hero" });
      const response = await POST(request, {
        params: Promise.resolve({ pageId: "non-existent" }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Page not found");
    });
  });

  describe("POST /api/v1/cms/pages/[pageId]/sections - Happy paths", () => {
    it("should create section with required fields only", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);
      vi.mocked(db.query.cmsPages.findFirst).mockResolvedValue({ id: "page-1" });

      const newSection = {
        id: "section-new",
        pageId: "page-1",
        type: "hero",
        order: 0,
        content: null,
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockReturning = vi.fn().mockResolvedValue([newSection]);
      const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
      vi.mocked(db.insert).mockReturnValue({ values: mockValues } as never);

      const request = createRequest("POST", { type: "hero" });
      const response = await POST(request, {
        params: Promise.resolve({ pageId: "page-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.section.type).toBe("hero");
    });

    it("should create section with order and enabled fields", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);
      vi.mocked(db.query.cmsPages.findFirst).mockResolvedValue({ id: "page-1" });

      const newSection = {
        id: "section-full",
        pageId: "page-1",
        type: "features",
        order: 2,
        content: null,
        enabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockReturning = vi.fn().mockResolvedValue([newSection]);
      const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
      vi.mocked(db.insert).mockReturnValue({ values: mockValues } as never);

      const request = createRequest("POST", {
        type: "features",
        order: 2,
        enabled: false,
      });
      const response = await POST(request, {
        params: Promise.resolve({ pageId: "page-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.section.order).toBe(2);
      expect(data.section.enabled).toBe(false);
    });

    it("should return 500 on internal error", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);
      vi.mocked(db.query.cmsPages.findFirst).mockRejectedValue(
        new Error("Database error")
      );

      const request = createRequest("POST", { type: "hero" });
      const response = await POST(request, {
        params: Promise.resolve({ pageId: "page-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal error");
    });
  });

  describe("PATCH /api/v1/cms/pages/[pageId]/sections - Authorization", () => {
    it("should require admin role", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const mockReturning = vi.fn().mockResolvedValue([mockSections[0]]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      vi.mocked(db.update).mockReturnValue({ set: mockSet } as never);

      const request = createRequest("PATCH", {
        sectionId: "section-1",
        type: "updated",
      });
      await PATCH(request);

      expect(requireRole).toHaveBeenCalledWith("admin");
    });
  });

  describe("PATCH /api/v1/cms/pages/[pageId]/sections - Validation", () => {
    it("should return 400 when sectionId is missing", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const request = createRequest("PATCH", { type: "updated" });
      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("sectionId required");
    });

    it("should return 400 when type exceeds max length", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const request = createRequest("PATCH", {
        sectionId: "section-1",
        type: "a".repeat(101),
      });
      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid input");
    });

    it("should return 400 when order is negative", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const request = createRequest("PATCH", {
        sectionId: "section-1",
        order: -1,
      });
      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid input");
    });

    it("should return 404 when section not found", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const mockReturning = vi.fn().mockResolvedValue([]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      vi.mocked(db.update).mockReturnValue({ set: mockSet } as never);

      const request = createRequest("PATCH", {
        sectionId: "non-existent",
        type: "updated",
      });
      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Section not found");
    });
  });

  describe("PATCH /api/v1/cms/pages/[pageId]/sections - Happy paths", () => {
    it("should update section type", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const updatedSection = { ...mockSections[0], type: "updated-hero" };

      const mockReturning = vi.fn().mockResolvedValue([updatedSection]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      vi.mocked(db.update).mockReturnValue({ set: mockSet } as never);

      const request = createRequest("PATCH", {
        sectionId: "section-1",
        type: "updated-hero",
      });
      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.section.type).toBe("updated-hero");
    });

    it("should update section order", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const updatedSection = { ...mockSections[0], order: 5 };

      const mockReturning = vi.fn().mockResolvedValue([updatedSection]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      vi.mocked(db.update).mockReturnValue({ set: mockSet } as never);

      const request = createRequest("PATCH", {
        sectionId: "section-1",
        order: 5,
      });
      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.section.order).toBe(5);
    });

    it("should update multiple fields at once", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const updatedSection = {
        ...mockSections[0],
        type: "banner",
        order: 3,
      };

      const mockReturning = vi.fn().mockResolvedValue([updatedSection]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      vi.mocked(db.update).mockReturnValue({ set: mockSet } as never);

      const request = createRequest("PATCH", {
        sectionId: "section-1",
        type: "banner",
        order: 3,
      });
      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.section.type).toBe("banner");
      expect(data.section.order).toBe(3);
    });

    it("should update section enabled status", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const updatedSection = { ...mockSections[0], enabled: false };

      const mockReturning = vi.fn().mockResolvedValue([updatedSection]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      vi.mocked(db.update).mockReturnValue({ set: mockSet } as never);

      const request = createRequest("PATCH", {
        sectionId: "section-1",
        enabled: false,
      });
      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.section.enabled).toBe(false);
    });

    it("should return 500 on internal error", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const mockSet = vi.fn().mockImplementation(() => {
        throw new Error("Database error");
      });
      vi.mocked(db.update).mockReturnValue({ set: mockSet } as never);

      const request = createRequest("PATCH", {
        sectionId: "section-1",
        type: "updated",
      });
      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal error");
    });
  });

  describe("DELETE /api/v1/cms/pages/[pageId]/sections - Authorization", () => {
    it("should require admin role", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const mockReturning = vi.fn().mockResolvedValue([{ id: "section-1" }]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      vi.mocked(db.delete).mockReturnValue({ where: mockWhere } as never);

      const request = createRequest("DELETE", undefined, {
        sectionId: "section-1",
      });
      await DELETE(request);

      expect(requireRole).toHaveBeenCalledWith("admin");
    });
  });

  describe("DELETE /api/v1/cms/pages/[pageId]/sections - Validation", () => {
    it("should return 400 when sectionId not provided", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const request = createRequest("DELETE");
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("sectionId required");
    });

    it("should return 404 when section not found", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const mockReturning = vi.fn().mockResolvedValue([]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      vi.mocked(db.delete).mockReturnValue({ where: mockWhere } as never);

      const request = createRequest("DELETE", undefined, {
        sectionId: "non-existent",
      });
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Section not found");
    });
  });

  describe("DELETE /api/v1/cms/pages/[pageId]/sections - Happy paths", () => {
    it("should delete section successfully", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const mockReturning = vi.fn().mockResolvedValue([{ id: "section-1" }]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      vi.mocked(db.delete).mockReturnValue({ where: mockWhere } as never);

      const request = createRequest("DELETE", undefined, {
        sectionId: "section-1",
      });
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("should return 500 on internal error", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const mockWhere = vi.fn().mockImplementation(() => {
        throw new Error("Database error");
      });
      vi.mocked(db.delete).mockReturnValue({ where: mockWhere } as never);

      const request = createRequest("DELETE", undefined, {
        sectionId: "section-1",
      });
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal error");
    });
  });
});
