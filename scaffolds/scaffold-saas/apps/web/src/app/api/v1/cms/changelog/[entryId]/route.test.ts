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
      changelogEntries: { findFirst: vi.fn() },
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
  changelogEntries: {
    id: "id",
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
  const url = new URL("http://localhost:3000/api/v1/cms/changelog/entry-1");
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

const mockEntry = {
  id: "entry-1",
  version: "1.0.0",
  title: "New Feature Release",
  content: "We released a new feature!",
  type: "feature",
  publishedAt: new Date("2024-01-15"),
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-15"),
};

describe("Changelog Entry route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/v1/cms/changelog/[entryId] - Public", () => {
    it("should return published entry for public request", async () => {
      vi.mocked(db.query.changelogEntries.findFirst).mockResolvedValue(mockEntry);

      const request = createRequest("GET", undefined, { public: "true" });
      const response = await GET(request, {
        params: Promise.resolve({ entryId: "entry-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.entry.id).toBe("entry-1");
      expect(requireRole).not.toHaveBeenCalled();
    });

    it("should return 404 for unpublished entry in public mode", async () => {
      vi.mocked(db.query.changelogEntries.findFirst).mockResolvedValue(null);

      const request = createRequest("GET", undefined, { public: "true" });
      const response = await GET(request, {
        params: Promise.resolve({ entryId: "entry-draft" }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Entry not found");
    });
  });

  describe("GET /api/v1/cms/changelog/[entryId] - Admin", () => {
    it("should require admin for non-public request", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);
      vi.mocked(db.query.changelogEntries.findFirst).mockResolvedValue(mockEntry);

      const request = createRequest("GET");
      await GET(request, { params: Promise.resolve({ entryId: "entry-1" }) });

      expect(requireRole).toHaveBeenCalledWith("admin");
    });

    it("should return draft entry for admin", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);
      vi.mocked(db.query.changelogEntries.findFirst).mockResolvedValue({
        ...mockEntry,
        publishedAt: null,
      });

      const request = createRequest("GET");
      const response = await GET(request, {
        params: Promise.resolve({ entryId: "entry-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.entry.publishedAt).toBeNull();
    });

    it("should return 404 when entry not found", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);
      vi.mocked(db.query.changelogEntries.findFirst).mockResolvedValue(null);

      const request = createRequest("GET");
      const response = await GET(request, {
        params: Promise.resolve({ entryId: "non-existent" }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Entry not found");
    });

    it("should return 500 on internal error", async () => {
      vi.mocked(db.query.changelogEntries.findFirst).mockRejectedValue(
        new Error("Database error")
      );

      const request = createRequest("GET", undefined, { public: "true" });
      const response = await GET(request, {
        params: Promise.resolve({ entryId: "entry-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal error");
    });
  });

  describe("PATCH /api/v1/cms/changelog/[entryId] - Authorization", () => {
    it("should require admin role", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const mockReturning = vi.fn().mockResolvedValue([mockEntry]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      vi.mocked(db.update).mockReturnValue({ set: mockSet } as never);

      const request = createRequest("PATCH", { title: "Updated Title" });
      await PATCH(request, { params: Promise.resolve({ entryId: "entry-1" }) });

      expect(requireRole).toHaveBeenCalledWith("admin");
    });
  });

  describe("PATCH /api/v1/cms/changelog/[entryId] - Validation", () => {
    it("should return 400 for invalid type", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const request = createRequest("PATCH", { type: "invalid-type" });
      const response = await PATCH(request, {
        params: Promise.resolve({ entryId: "entry-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid input");
    });

    it("should return 404 when entry not found", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const mockReturning = vi.fn().mockResolvedValue([]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      vi.mocked(db.update).mockReturnValue({ set: mockSet } as never);

      const request = createRequest("PATCH", { title: "Updated" });
      const response = await PATCH(request, {
        params: Promise.resolve({ entryId: "non-existent" }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Entry not found");
    });
  });

  describe("PATCH /api/v1/cms/changelog/[entryId] - Happy paths", () => {
    it("should update entry title", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const updatedEntry = { ...mockEntry, title: "Updated Title" };

      const mockReturning = vi.fn().mockResolvedValue([updatedEntry]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      vi.mocked(db.update).mockReturnValue({ set: mockSet } as never);

      const request = createRequest("PATCH", { title: "Updated Title" });
      const response = await PATCH(request, {
        params: Promise.resolve({ entryId: "entry-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.entry.title).toBe("Updated Title");
    });

    it("should update entry type", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const updatedEntry = { ...mockEntry, type: "fix" };

      const mockReturning = vi.fn().mockResolvedValue([updatedEntry]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      vi.mocked(db.update).mockReturnValue({ set: mockSet } as never);

      const request = createRequest("PATCH", { type: "fix" });
      const response = await PATCH(request, {
        params: Promise.resolve({ entryId: "entry-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.entry.type).toBe("fix");
    });

    it("should accept all valid entry types", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const types = ["feature", "improvement", "fix", "breaking"];
      for (const type of types) {
        const updatedEntry = { ...mockEntry, type };

        const mockReturning = vi.fn().mockResolvedValue([updatedEntry]);
        const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
        const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
        vi.mocked(db.update).mockReturnValue({ set: mockSet } as never);

        const request = createRequest("PATCH", { type });
        const response = await PATCH(request, {
          params: Promise.resolve({ entryId: "entry-1" }),
        });

        expect(response.status).toBe(200);
      }
    });

    it("should publish entry by setting publishedAt", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const publishDate = "2024-01-20T00:00:00.000Z";
      const updatedEntry = { ...mockEntry, publishedAt: new Date(publishDate) };

      const mockReturning = vi.fn().mockResolvedValue([updatedEntry]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      vi.mocked(db.update).mockReturnValue({ set: mockSet } as never);

      const request = createRequest("PATCH", { publishedAt: publishDate });
      const response = await PATCH(request, {
        params: Promise.resolve({ entryId: "entry-1" }),
      });

      expect(response.status).toBe(200);
    });

    it("should unpublish entry by setting publishedAt to null", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const updatedEntry = { ...mockEntry, publishedAt: null };

      const mockReturning = vi.fn().mockResolvedValue([updatedEntry]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      vi.mocked(db.update).mockReturnValue({ set: mockSet } as never);

      const request = createRequest("PATCH", { publishedAt: null });
      const response = await PATCH(request, {
        params: Promise.resolve({ entryId: "entry-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.entry.publishedAt).toBeNull();
    });
  });

  describe("DELETE /api/v1/cms/changelog/[entryId] - Authorization", () => {
    it("should require admin role", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const mockReturning = vi.fn().mockResolvedValue([{ id: "entry-1" }]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      vi.mocked(db.delete).mockReturnValue({ where: mockWhere } as never);

      const request = createRequest("DELETE");
      await DELETE(request, { params: Promise.resolve({ entryId: "entry-1" }) });

      expect(requireRole).toHaveBeenCalledWith("admin");
    });
  });

  describe("DELETE /api/v1/cms/changelog/[entryId] - Validation", () => {
    it("should return 404 when entry not found", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const mockReturning = vi.fn().mockResolvedValue([]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      vi.mocked(db.delete).mockReturnValue({ where: mockWhere } as never);

      const request = createRequest("DELETE");
      const response = await DELETE(request, {
        params: Promise.resolve({ entryId: "non-existent" }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Entry not found");
    });
  });

  describe("DELETE /api/v1/cms/changelog/[entryId] - Happy paths", () => {
    it("should delete entry successfully", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const mockReturning = vi.fn().mockResolvedValue([{ id: "entry-1" }]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      vi.mocked(db.delete).mockReturnValue({ where: mockWhere } as never);

      const request = createRequest("DELETE");
      const response = await DELETE(request, {
        params: Promise.resolve({ entryId: "entry-1" }),
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
        params: Promise.resolve({ entryId: "entry-1" }),
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
        params: Promise.resolve({ entryId: "entry-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal error");
    });
  });
});
