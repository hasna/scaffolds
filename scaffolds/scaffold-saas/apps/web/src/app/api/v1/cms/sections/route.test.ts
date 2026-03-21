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
      cmsSections: { findMany: vi.fn() },
    },
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(),
      })),
    })),
  },
}));

// Mock schema
vi.mock("@scaffold-saas/database/schema", () => ({
  cmsSections: {
    id: "id",
    pageId: "page_id",
    order: "order",
    updatedAt: "updated_at",
  },
}));

import { GET, POST, PUT } from "./route";
import { requireRole } from "@/lib/auth-utils";
import { db } from "@scaffold-saas/database/client";

function createRequest(
  method: string,
  body?: unknown,
  searchParams?: Record<string, string>
): Request {
  const url = new URL("http://localhost:3000/api/v1/cms/sections");
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

// Use proper RFC 4122 v4 UUIDs for Zod validation
// Format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx (y = 8, 9, a, or b)
const MOCK_PAGE_ID = "a1b2c3d4-e5f6-4789-abcd-ef0123456789";
const MOCK_SECTION_1_ID = "11111111-2222-4333-9444-555555555555";
const MOCK_SECTION_2_ID = "66666666-7777-4888-a999-aaaaaaaaaaaa";

const mockSections = [
  {
    id: MOCK_SECTION_1_ID,
    pageId: MOCK_PAGE_ID,
    type: "hero",
    order: 0,
    content: { title: "Welcome" },
    enabled: true,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  },
  {
    id: MOCK_SECTION_2_ID,
    pageId: MOCK_PAGE_ID,
    type: "features",
    order: 1,
    content: {},
    enabled: true,
    createdAt: new Date("2024-01-02"),
    updatedAt: new Date("2024-01-02"),
  },
];

describe("CMS Sections route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/v1/cms/sections - Authorization", () => {
    it("should require admin role", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);
      vi.mocked(db.query.cmsSections.findMany).mockResolvedValue(mockSections);

      const request = createRequest("GET", undefined, {
        pageId: "a1b2c3d4-e5f6-4789-abcd-ef0123456789",
      });
      await GET(request);

      expect(requireRole).toHaveBeenCalledWith("admin");
    });
  });

  describe("GET /api/v1/cms/sections - Validation", () => {
    it("should return 400 when pageId not provided", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const request = createRequest("GET");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("pageId required");
    });
  });

  describe("GET /api/v1/cms/sections - Happy paths", () => {
    it("should return sections for page", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);
      vi.mocked(db.query.cmsSections.findMany).mockResolvedValue(mockSections);

      const request = createRequest("GET", undefined, {
        pageId: "a1b2c3d4-e5f6-4789-abcd-ef0123456789",
      });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.sections).toHaveLength(2);
    });

    it("should return empty array when no sections", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);
      vi.mocked(db.query.cmsSections.findMany).mockResolvedValue([]);

      const request = createRequest("GET", undefined, {
        pageId: "a1b2c3d4-e5f6-4789-abcd-ef0123456789",
      });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.sections).toHaveLength(0);
    });

    it("should return 500 on internal error", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);
      vi.mocked(db.query.cmsSections.findMany).mockRejectedValue(
        new Error("Database error")
      );

      const request = createRequest("GET", undefined, {
        pageId: "a1b2c3d4-e5f6-4789-abcd-ef0123456789",
      });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal error");
    });
  });

  describe("POST /api/v1/cms/sections - Authorization", () => {
    it("should require admin role", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);
      vi.mocked(db.query.cmsSections.findMany).mockResolvedValue([]);

      const mockReturning = vi.fn().mockResolvedValue([mockSections[0]]);
      const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
      vi.mocked(db.insert).mockReturnValue({ values: mockValues } as never);

      const request = createRequest("POST", {
        pageId: "a1b2c3d4-e5f6-4789-abcd-ef0123456789",
        type: "hero",
      });
      await POST(request);

      expect(requireRole).toHaveBeenCalledWith("admin");
    });
  });

  describe("POST /api/v1/cms/sections - Validation", () => {
    it("should return 400 when pageId missing", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const request = createRequest("POST", { type: "hero" });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid input");
    });

    it("should return 400 when pageId is not UUID", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const request = createRequest("POST", {
        pageId: "not-a-uuid",
        type: "hero",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid input");
    });

    it("should return 400 when type missing", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const request = createRequest("POST", {
        pageId: "a1b2c3d4-e5f6-4789-abcd-ef0123456789",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid input");
    });

    it("should return 400 when type is empty", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const request = createRequest("POST", {
        pageId: "a1b2c3d4-e5f6-4789-abcd-ef0123456789",
        type: "",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid input");
    });

    it("should return 400 when type exceeds max length", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const request = createRequest("POST", {
        pageId: "a1b2c3d4-e5f6-4789-abcd-ef0123456789",
        type: "a".repeat(101),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid input");
    });

    it("should return 400 when order is negative", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const request = createRequest("POST", {
        pageId: "a1b2c3d4-e5f6-4789-abcd-ef0123456789",
        type: "hero",
        order: -1,
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid input");
    });
  });

  describe("POST /api/v1/cms/sections - Happy paths", () => {
    it("should create section with required fields", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);
      vi.mocked(db.query.cmsSections.findMany).mockResolvedValue([]);

      const newSection = {
        id: "bbbbbbbb-cccc-4ddd-aeee-ffffffffffff",
        pageId: "a1b2c3d4-e5f6-4789-abcd-ef0123456789",
        type: "hero",
        order: 0,
        content: {},
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockReturning = vi.fn().mockResolvedValue([newSection]);
      const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
      vi.mocked(db.insert).mockReturnValue({ values: mockValues } as never);

      const request = createRequest("POST", {
        pageId: "a1b2c3d4-e5f6-4789-abcd-ef0123456789",
        type: "hero",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.section.type).toBe("hero");
    });

    it("should auto-calculate order from existing sections", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);
      vi.mocked(db.query.cmsSections.findMany).mockResolvedValue([
        { order: 0 },
        { order: 1 },
        { order: 2 },
      ]);

      const newSection = {
        id: "bbbbbbbb-cccc-4ddd-aeee-ffffffffffff",
        pageId: "a1b2c3d4-e5f6-4789-abcd-ef0123456789",
        type: "cta",
        order: 3, // Should be maxOrder + 1
        content: {},
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockReturning = vi.fn().mockResolvedValue([newSection]);
      const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
      vi.mocked(db.insert).mockReturnValue({ values: mockValues } as never);

      const request = createRequest("POST", {
        pageId: "a1b2c3d4-e5f6-4789-abcd-ef0123456789",
        type: "cta",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.section.order).toBe(3);
    });

    it("should create section with explicit order", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);
      vi.mocked(db.query.cmsSections.findMany).mockResolvedValue([]);

      const newSection = {
        id: "bbbbbbbb-cccc-4ddd-aeee-ffffffffffff",
        pageId: "a1b2c3d4-e5f6-4789-abcd-ef0123456789",
        type: "hero",
        order: 5,
        content: {},
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockReturning = vi.fn().mockResolvedValue([newSection]);
      const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
      vi.mocked(db.insert).mockReturnValue({ values: mockValues } as never);

      const request = createRequest("POST", {
        pageId: "a1b2c3d4-e5f6-4789-abcd-ef0123456789",
        type: "hero",
        order: 5,
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.section.order).toBe(5);
    });

    it("should create section with enabled false", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);
      vi.mocked(db.query.cmsSections.findMany).mockResolvedValue([]);

      const newSection = {
        id: "bbbbbbbb-cccc-4ddd-aeee-ffffffffffff",
        pageId: "a1b2c3d4-e5f6-4789-abcd-ef0123456789",
        type: "hero",
        order: 0,
        content: {},
        enabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockReturning = vi.fn().mockResolvedValue([newSection]);
      const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
      vi.mocked(db.insert).mockReturnValue({ values: mockValues } as never);

      const request = createRequest("POST", {
        pageId: "a1b2c3d4-e5f6-4789-abcd-ef0123456789",
        type: "hero",
        enabled: false,
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.section.enabled).toBe(false);
    });

    it("should return 500 on internal error", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);
      vi.mocked(db.query.cmsSections.findMany).mockRejectedValue(
        new Error("Database error")
      );

      const request = createRequest("POST", {
        pageId: "a1b2c3d4-e5f6-4789-abcd-ef0123456789",
        type: "hero",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal error");
    });
  });

  describe("PUT /api/v1/cms/sections (reorder) - Authorization", () => {
    it("should require admin role", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const mockWhere = vi.fn();
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      vi.mocked(db.update).mockReturnValue({ set: mockSet } as never);

      const request = createRequest("PUT", {
        pageId: "a1b2c3d4-e5f6-4789-abcd-ef0123456789",
        sectionIds: [
          "11111111-2222-4333-9444-555555555555",
          "66666666-7777-4888-a999-aaaaaaaaaaaa",
        ],
      });
      await PUT(request);

      expect(requireRole).toHaveBeenCalledWith("admin");
    });
  });

  describe("PUT /api/v1/cms/sections (reorder) - Validation", () => {
    it("should return 400 when pageId missing", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const request = createRequest("PUT", {
        sectionIds: ["11111111-2222-4333-9444-555555555555"],
      });
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid input");
    });

    it("should return 400 when pageId is not UUID", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const request = createRequest("PUT", {
        pageId: "not-a-uuid",
        sectionIds: ["11111111-2222-4333-9444-555555555555"],
      });
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid input");
    });

    it("should return 400 when sectionIds missing", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const request = createRequest("PUT", {
        pageId: "a1b2c3d4-e5f6-4789-abcd-ef0123456789",
      });
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid input");
    });

    it("should return 400 when sectionIds contains non-UUID", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const request = createRequest("PUT", {
        pageId: "a1b2c3d4-e5f6-4789-abcd-ef0123456789",
        sectionIds: ["not-a-uuid"],
      });
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid input");
    });
  });

  describe("PUT /api/v1/cms/sections (reorder) - Happy paths", () => {
    it("should reorder sections successfully", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const mockWhere = vi.fn();
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      vi.mocked(db.update).mockReturnValue({ set: mockSet } as never);

      const request = createRequest("PUT", {
        pageId: "a1b2c3d4-e5f6-4789-abcd-ef0123456789",
        sectionIds: [
          "66666666-7777-4888-a999-aaaaaaaaaaaa",
          "11111111-2222-4333-9444-555555555555",
        ],
      });
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(db.update).toHaveBeenCalledTimes(2);
    });

    it("should handle empty sectionIds array", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const mockWhere = vi.fn();
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      vi.mocked(db.update).mockReturnValue({ set: mockSet } as never);

      const request = createRequest("PUT", {
        pageId: "a1b2c3d4-e5f6-4789-abcd-ef0123456789",
        sectionIds: [],
      });
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(db.update).not.toHaveBeenCalled();
    });

    it("should return 500 on internal error", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const mockSet = vi.fn().mockImplementation(() => {
        throw new Error("Database error");
      });
      vi.mocked(db.update).mockReturnValue({ set: mockSet } as never);

      const request = createRequest("PUT", {
        pageId: "a1b2c3d4-e5f6-4789-abcd-ef0123456789",
        sectionIds: ["11111111-2222-4333-9444-555555555555"],
      });
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal error");
    });
  });
});
