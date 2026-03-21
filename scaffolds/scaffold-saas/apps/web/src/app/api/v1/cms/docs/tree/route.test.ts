// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock database
vi.mock("@scaffold-saas/database/client", () => ({
  db: {
    query: {
      docsPages: { findMany: vi.fn() },
    },
  },
}));

// Mock schema
vi.mock("@scaffold-saas/database/schema", () => ({
  docsPages: {
    order: "order",
    title: "title",
  },
}));

import { GET } from "./route";
import { db } from "@scaffold-saas/database/client";

const mockDocs = [
  {
    id: "doc-1",
    slug: "getting-started",
    title: "Getting Started",
    parentId: null,
    order: 0,
  },
  {
    id: "doc-1-1",
    slug: "installation",
    title: "Installation",
    parentId: "doc-1",
    order: 0,
  },
  {
    id: "doc-1-2",
    slug: "configuration",
    title: "Configuration",
    parentId: "doc-1",
    order: 1,
  },
  {
    id: "doc-2",
    slug: "api-reference",
    title: "API Reference",
    parentId: null,
    order: 1,
  },
  {
    id: "doc-2-1",
    slug: "endpoints",
    title: "Endpoints",
    parentId: "doc-2",
    order: 0,
  },
];

describe("Docs Tree route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/v1/cms/docs/tree", () => {
    it("should return tree structure of docs", async () => {
      vi.mocked(db.query.docsPages.findMany).mockResolvedValue(mockDocs);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.tree).toHaveLength(2); // Two root docs
    });

    it("should build nested tree correctly", async () => {
      vi.mocked(db.query.docsPages.findMany).mockResolvedValue(mockDocs);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);

      // First root should be "Getting Started"
      const gettingStarted = data.tree.find(
        (d: { slug: string }) => d.slug === "getting-started"
      );
      expect(gettingStarted).toBeDefined();
      expect(gettingStarted.children).toHaveLength(2);

      // Check children are properly nested
      const installation = gettingStarted.children.find(
        (d: { slug: string }) => d.slug === "installation"
      );
      expect(installation).toBeDefined();
      expect(installation.title).toBe("Installation");
    });

    it("should sort by order then title", async () => {
      vi.mocked(db.query.docsPages.findMany).mockResolvedValue(mockDocs);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);

      // First root should have order 0
      expect(data.tree[0].order).toBe(0);
      expect(data.tree[1].order).toBe(1);

      // Children should be sorted by order
      const gettingStarted = data.tree.find(
        (d: { slug: string }) => d.slug === "getting-started"
      );
      expect(gettingStarted.children[0].slug).toBe("installation"); // order 0
      expect(gettingStarted.children[1].slug).toBe("configuration"); // order 1
    });

    it("should return empty tree when no docs", async () => {
      vi.mocked(db.query.docsPages.findMany).mockResolvedValue([]);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.tree).toHaveLength(0);
    });

    it("should return tree with only root docs when no children", async () => {
      vi.mocked(db.query.docsPages.findMany).mockResolvedValue([
        {
          id: "doc-1",
          slug: "standalone",
          title: "Standalone Doc",
          parentId: null,
          order: 0,
        },
      ]);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.tree).toHaveLength(1);
      expect(data.tree[0].children).toHaveLength(0);
    });

    it("should include doc properties in tree nodes", async () => {
      vi.mocked(db.query.docsPages.findMany).mockResolvedValue(mockDocs);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);

      const doc = data.tree[0];
      expect(doc).toHaveProperty("id");
      expect(doc).toHaveProperty("slug");
      expect(doc).toHaveProperty("title");
      expect(doc).toHaveProperty("order");
      expect(doc).toHaveProperty("children");
    });

    it("should return 500 on internal error", async () => {
      vi.mocked(db.query.docsPages.findMany).mockRejectedValue(
        new Error("Database error")
      );

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal error");
    });
  });
});
