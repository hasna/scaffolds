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
      changelogEntries: { findMany: vi.fn() },
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
  changelogEntries: {
    publishedAt: "published_at",
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
  const url = new URL("http://localhost:3000/api/v1/cms/changelog");
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

const mockEntries = [
  {
    id: "entry-1",
    version: "1.1.0",
    title: "New Dashboard Feature",
    content: "We added a new dashboard!",
    type: "feature",
    publishedAt: new Date("2024-01-20"),
    createdAt: new Date("2024-01-15"),
  },
  {
    id: "entry-2",
    version: "1.0.1",
    title: "Bug Fix",
    content: "Fixed a bug.",
    type: "fix",
    publishedAt: new Date("2024-01-10"),
    createdAt: new Date("2024-01-05"),
  },
];

describe("Changelog route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/v1/cms/changelog - Public", () => {
    it("should return published entries for public request", async () => {
      vi.mocked(db.query.changelogEntries.findMany).mockResolvedValue(mockEntries);

      const request = createRequest("GET", undefined, { public: "true" });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.entries).toHaveLength(2);
      expect(requireRole).not.toHaveBeenCalled();
    });

    it("should respect limit parameter", async () => {
      vi.mocked(db.query.changelogEntries.findMany).mockResolvedValue([mockEntries[0]]);

      const request = createRequest("GET", undefined, { public: "true", limit: "1" });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.entries).toHaveLength(1);
    });

    it("should cap limit at 100", async () => {
      vi.mocked(db.query.changelogEntries.findMany).mockResolvedValue([]);

      const request = createRequest("GET", undefined, { public: "true", limit: "200" });
      const response = await GET(request);

      expect(response.status).toBe(200);
      // Verify findMany was called with limit capped at 100
      expect(db.query.changelogEntries.findMany).toHaveBeenCalled();
    });

    it("should return empty array when no entries", async () => {
      vi.mocked(db.query.changelogEntries.findMany).mockResolvedValue([]);

      const request = createRequest("GET", undefined, { public: "true" });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.entries).toHaveLength(0);
    });
  });

  describe("GET /api/v1/cms/changelog - Admin", () => {
    it("should require admin for non-public request", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);
      vi.mocked(db.query.changelogEntries.findMany).mockResolvedValue(mockEntries);

      const request = createRequest("GET");
      await GET(request);

      expect(requireRole).toHaveBeenCalledWith("admin");
    });

    it("should return all entries including drafts for admin", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);
      vi.mocked(db.query.changelogEntries.findMany).mockResolvedValue([
        ...mockEntries,
        {
          id: "entry-draft",
          version: "1.2.0",
          title: "Draft Entry",
          content: "Not published yet",
          type: "feature",
          publishedAt: null,
          createdAt: new Date("2024-01-25"),
        },
      ]);

      const request = createRequest("GET");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.entries).toHaveLength(3);
    });

    it("should return 500 on internal error", async () => {
      vi.mocked(db.query.changelogEntries.findMany).mockRejectedValue(
        new Error("Database error")
      );

      const request = createRequest("GET", undefined, { public: "true" });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal error");
    });
  });

  describe("POST /api/v1/cms/changelog - Authorization", () => {
    it("should require admin role", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const mockReturning = vi.fn().mockResolvedValue([mockEntries[0]]);
      const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
      vi.mocked(db.insert).mockReturnValue({ values: mockValues } as never);

      const request = createRequest("POST", {
        version: "2.0.0",
        title: "New Release",
        content: "Release content",
      });
      await POST(request);

      expect(requireRole).toHaveBeenCalledWith("admin");
    });

    it("should return error when not admin", async () => {
      vi.mocked(requireRole).mockRejectedValue(new Error("Forbidden"));

      const request = createRequest("POST", {
        version: "2.0.0",
        title: "New Release",
        content: "Release content",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal error");
    });
  });

  describe("POST /api/v1/cms/changelog - Validation", () => {
    it("should return 400 for missing version", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const request = createRequest("POST", {
        title: "New Release",
        content: "Release content",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid input");
    });

    it("should return 400 for missing title", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const request = createRequest("POST", {
        version: "2.0.0",
        content: "Release content",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid input");
    });

    it("should return 400 for missing content", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const request = createRequest("POST", {
        version: "2.0.0",
        title: "New Release",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid input");
    });

    it("should return 400 for invalid type", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const request = createRequest("POST", {
        version: "2.0.0",
        title: "New Release",
        content: "Content",
        type: "invalid-type",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid input");
    });
  });

  describe("POST /api/v1/cms/changelog - Happy paths", () => {
    it("should create entry without publishedAt (draft)", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const newEntry = {
        id: "entry-new",
        version: "2.0.0",
        title: "New Release",
        content: "Release content",
        type: null,
        publishedAt: null,
        createdAt: new Date(),
      };

      const mockReturning = vi.fn().mockResolvedValue([newEntry]);
      const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
      vi.mocked(db.insert).mockReturnValue({ values: mockValues } as never);

      const request = createRequest("POST", {
        version: "2.0.0",
        title: "New Release",
        content: "Release content",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.entry.version).toBe("2.0.0");
      expect(data.entry.publishedAt).toBeNull();
    });

    it("should create entry with publishedAt (published)", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const publishDate = "2024-01-30T00:00:00.000Z";
      const newEntry = {
        id: "entry-new",
        version: "2.0.0",
        title: "New Release",
        content: "Release content",
        type: "feature",
        publishedAt: new Date(publishDate),
        createdAt: new Date(),
      };

      const mockReturning = vi.fn().mockResolvedValue([newEntry]);
      const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
      vi.mocked(db.insert).mockReturnValue({ values: mockValues } as never);

      const request = createRequest("POST", {
        version: "2.0.0",
        title: "New Release",
        content: "Release content",
        type: "feature",
        publishedAt: publishDate,
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.entry.type).toBe("feature");
    });

    it("should accept all valid entry types", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const types = ["feature", "improvement", "fix", "breaking"];
      for (const type of types) {
        const newEntry = {
          id: "entry-new",
          version: "2.0.0",
          title: "New Release",
          content: "Release content",
          type,
          publishedAt: null,
          createdAt: new Date(),
        };

        const mockReturning = vi.fn().mockResolvedValue([newEntry]);
        const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
        vi.mocked(db.insert).mockReturnValue({ values: mockValues } as never);

        const request = createRequest("POST", {
          version: "2.0.0",
          title: "New Release",
          content: "Release content",
          type,
        });
        const response = await POST(request);

        expect(response.status).toBe(201);
      }
    });
  });

  describe("Error handling", () => {
    it("POST should return 500 on internal error", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const mockValues = vi.fn().mockImplementation(() => {
        throw new Error("Database error");
      });
      vi.mocked(db.insert).mockReturnValue({ values: mockValues } as never);

      const request = createRequest("POST", {
        version: "2.0.0",
        title: "New Release",
        content: "Release content",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal error");
    });
  });
});
