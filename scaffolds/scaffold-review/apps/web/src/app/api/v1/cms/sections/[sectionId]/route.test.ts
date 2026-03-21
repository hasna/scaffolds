// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock auth-utils
vi.mock("@/lib/auth-utils", () => ({
  requireRole: vi.fn(),
}));

// Mock database
vi.mock("@scaffold-review/database/client", () => ({
  db: {
    query: {
      cmsSections: { findFirst: vi.fn() },
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
vi.mock("@scaffold-review/database/schema", () => ({
  cmsSections: {
    id: "id",
    updatedAt: "updated_at",
  },
}));

import { GET, PATCH, DELETE } from "./route";
import { requireRole } from "@/lib/auth-utils";
import { db } from "@scaffold-review/database/client";

function createRequest(method: string, body?: unknown): Request {
  const url = new URL(
    "http://localhost:3000/api/v1/cms/sections/section-1"
  );
  return new Request(url.toString(), {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { "Content-Type": "application/json" } : undefined,
  });
}

const mockSection = {
  id: "section-1",
  pageId: "page-1",
  type: "hero",
  order: 0,
  content: { title: "Welcome" },
  enabled: true,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
  page: {
    id: "page-1",
    slug: "about",
    title: "About Us",
  },
};

describe("CMS Sections [sectionId] route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/v1/cms/sections/[sectionId] - Authorization", () => {
    it("should require admin role", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);
      vi.mocked(db.query.cmsSections.findFirst).mockResolvedValue(mockSection);

      const request = createRequest("GET");
      await GET(request, { params: Promise.resolve({ sectionId: "section-1" }) });

      expect(requireRole).toHaveBeenCalledWith("admin");
    });
  });

  describe("GET /api/v1/cms/sections/[sectionId] - Happy paths", () => {
    it("should return section with page", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);
      vi.mocked(db.query.cmsSections.findFirst).mockResolvedValue(mockSection);

      const request = createRequest("GET");
      const response = await GET(request, {
        params: Promise.resolve({ sectionId: "section-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.section.id).toBe("section-1");
      expect(data.section.page.slug).toBe("about");
    });

    it("should return 404 when section not found", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);
      vi.mocked(db.query.cmsSections.findFirst).mockResolvedValue(null);

      const request = createRequest("GET");
      const response = await GET(request, {
        params: Promise.resolve({ sectionId: "non-existent" }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Section not found");
    });

    it("should return 500 on internal error", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);
      vi.mocked(db.query.cmsSections.findFirst).mockRejectedValue(
        new Error("Database error")
      );

      const request = createRequest("GET");
      const response = await GET(request, {
        params: Promise.resolve({ sectionId: "section-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal error");
    });
  });

  describe("PATCH /api/v1/cms/sections/[sectionId] - Authorization", () => {
    it("should require admin role", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const mockReturning = vi.fn().mockResolvedValue([mockSection]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      vi.mocked(db.update).mockReturnValue({ set: mockSet } as never);

      const request = createRequest("PATCH", { type: "updated" });
      await PATCH(request, { params: Promise.resolve({ sectionId: "section-1" }) });

      expect(requireRole).toHaveBeenCalledWith("admin");
    });
  });

  describe("PATCH /api/v1/cms/sections/[sectionId] - Validation", () => {
    it("should return 400 when type exceeds max length", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const request = createRequest("PATCH", { type: "a".repeat(101) });
      const response = await PATCH(request, {
        params: Promise.resolve({ sectionId: "section-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid input");
    });

    it("should return 400 when type is empty", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const request = createRequest("PATCH", { type: "" });
      const response = await PATCH(request, {
        params: Promise.resolve({ sectionId: "section-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid input");
    });

    it("should return 400 when order is negative", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const request = createRequest("PATCH", { order: -1 });
      const response = await PATCH(request, {
        params: Promise.resolve({ sectionId: "section-1" }),
      });
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

      const request = createRequest("PATCH", { type: "updated" });
      const response = await PATCH(request, {
        params: Promise.resolve({ sectionId: "non-existent" }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Section not found");
    });
  });

  describe("PATCH /api/v1/cms/sections/[sectionId] - Happy paths", () => {
    it("should update section type", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const updatedSection = { ...mockSection, type: "banner" };

      const mockReturning = vi.fn().mockResolvedValue([updatedSection]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      vi.mocked(db.update).mockReturnValue({ set: mockSet } as never);

      const request = createRequest("PATCH", { type: "banner" });
      const response = await PATCH(request, {
        params: Promise.resolve({ sectionId: "section-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.section.type).toBe("banner");
    });

    it("should update section order", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const updatedSection = { ...mockSection, order: 5 };

      const mockReturning = vi.fn().mockResolvedValue([updatedSection]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      vi.mocked(db.update).mockReturnValue({ set: mockSet } as never);

      const request = createRequest("PATCH", { order: 5 });
      const response = await PATCH(request, {
        params: Promise.resolve({ sectionId: "section-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.section.order).toBe(5);
    });

    it("should update section enabled status", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const updatedSection = { ...mockSection, enabled: false };

      const mockReturning = vi.fn().mockResolvedValue([updatedSection]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      vi.mocked(db.update).mockReturnValue({ set: mockSet } as never);

      const request = createRequest("PATCH", { enabled: false });
      const response = await PATCH(request, {
        params: Promise.resolve({ sectionId: "section-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.section.enabled).toBe(false);
    });

    it("should update multiple fields at once", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const updatedSection = { ...mockSection, type: "cta", order: 3, enabled: false };

      const mockReturning = vi.fn().mockResolvedValue([updatedSection]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      vi.mocked(db.update).mockReturnValue({ set: mockSet } as never);

      const request = createRequest("PATCH", { type: "cta", order: 3, enabled: false });
      const response = await PATCH(request, {
        params: Promise.resolve({ sectionId: "section-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.section.type).toBe("cta");
      expect(data.section.order).toBe(3);
      expect(data.section.enabled).toBe(false);
    });

    it("should return 500 on internal error", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const mockSet = vi.fn().mockImplementation(() => {
        throw new Error("Database error");
      });
      vi.mocked(db.update).mockReturnValue({ set: mockSet } as never);

      const request = createRequest("PATCH", { type: "updated" });
      const response = await PATCH(request, {
        params: Promise.resolve({ sectionId: "section-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal error");
    });
  });

  describe("DELETE /api/v1/cms/sections/[sectionId] - Authorization", () => {
    it("should require admin role", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const mockReturning = vi.fn().mockResolvedValue([{ id: "section-1" }]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      vi.mocked(db.delete).mockReturnValue({ where: mockWhere } as never);

      const request = createRequest("DELETE");
      await DELETE(request, { params: Promise.resolve({ sectionId: "section-1" }) });

      expect(requireRole).toHaveBeenCalledWith("admin");
    });
  });

  describe("DELETE /api/v1/cms/sections/[sectionId] - Validation", () => {
    it("should return 404 when section not found", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const mockReturning = vi.fn().mockResolvedValue([]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      vi.mocked(db.delete).mockReturnValue({ where: mockWhere } as never);

      const request = createRequest("DELETE");
      const response = await DELETE(request, {
        params: Promise.resolve({ sectionId: "non-existent" }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Section not found");
    });
  });

  describe("DELETE /api/v1/cms/sections/[sectionId] - Happy paths", () => {
    it("should delete section successfully", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const mockReturning = vi.fn().mockResolvedValue([{ id: "section-1" }]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      vi.mocked(db.delete).mockReturnValue({ where: mockWhere } as never);

      const request = createRequest("DELETE");
      const response = await DELETE(request, {
        params: Promise.resolve({ sectionId: "section-1" }),
      });
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

      const request = createRequest("DELETE");
      const response = await DELETE(request, {
        params: Promise.resolve({ sectionId: "section-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal error");
    });
  });
});
