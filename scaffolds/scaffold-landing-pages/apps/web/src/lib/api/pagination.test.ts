// @ts-nocheck
import { describe, it, expect } from "vitest";
import {
  encodeCursor,
  decodeCursor,
  buildPaginatedResponse,
  parsePaginationParams,
  paginationSchema,
  type PaginationParams,
} from "./pagination";

describe("api/pagination", () => {
  describe("encodeCursor", () => {
    it("should encode id and timestamp to base64url", () => {
      const id = "test-id";
      const timestamp = new Date("2024-01-01T00:00:00Z");
      const cursor = encodeCursor(id, timestamp);
      expect(typeof cursor).toBe("string");
      expect(cursor.length).toBeGreaterThan(0);
    });

    it("should create different cursors for different inputs", () => {
      const timestamp = new Date("2024-01-01T00:00:00Z");
      const cursor1 = encodeCursor("id1", timestamp);
      const cursor2 = encodeCursor("id2", timestamp);
      expect(cursor1).not.toBe(cursor2);
    });
  });

  describe("decodeCursor", () => {
    it("should decode a valid cursor", () => {
      const id = "test-id";
      const timestamp = new Date("2024-01-01T00:00:00Z");
      const cursor = encodeCursor(id, timestamp);
      const decoded = decodeCursor(cursor);
      expect(decoded).not.toBeNull();
      expect(decoded!.id).toBe(id);
      expect(decoded!.ts.toISOString()).toBe(timestamp.toISOString());
    });

    it("should return null for invalid cursor", () => {
      const result = decodeCursor("invalid-cursor");
      expect(result).toBeNull();
    });

    it("should return null for empty string", () => {
      const result = decodeCursor("");
      expect(result).toBeNull();
    });

    it("should handle malformed JSON", () => {
      const malformed = Buffer.from("not-json").toString("base64url");
      const result = decodeCursor(malformed);
      expect(result).toBeNull();
    });
  });

  describe("buildPaginatedResponse", () => {
    const createItems = (count: number) =>
      Array.from({ length: count }, (_, i) => ({
        id: `id-${i}`,
        createdAt: new Date(`2024-01-0${i + 1}T00:00:00Z`),
        name: `Item ${i}`,
      }));

    it("should build response with pagination info", () => {
      const items = createItems(5);
      const params: PaginationParams = { limit: 10, direction: "forward" };
      const result = buildPaginatedResponse(items, params);

      expect(result.data).toHaveLength(5);
      expect(result.pagination.hasNextPage).toBe(false);
      expect(result.pagination.hasPreviousPage).toBe(false);
      expect(result.pagination.startCursor).toBeTruthy();
      expect(result.pagination.endCursor).toBeTruthy();
    });

    it("should indicate hasNextPage when items exceed limit", () => {
      const items = createItems(6); // 6 items, limit is 5
      const params: PaginationParams = { limit: 5, direction: "forward" };
      const result = buildPaginatedResponse(items, params);

      expect(result.data).toHaveLength(5);
      expect(result.pagination.hasNextPage).toBe(true);
    });

    it("should indicate hasPreviousPage when cursor is provided", () => {
      const items = createItems(3);
      const params: PaginationParams = {
        limit: 10,
        direction: "forward",
        cursor: "some-cursor",
      };
      const result = buildPaginatedResponse(items, params);

      expect(result.pagination.hasPreviousPage).toBe(true);
    });

    it("should handle empty items array", () => {
      const params: PaginationParams = { limit: 10, direction: "forward" };
      const result = buildPaginatedResponse([], params);

      expect(result.data).toHaveLength(0);
      expect(result.pagination.startCursor).toBeNull();
      expect(result.pagination.endCursor).toBeNull();
      expect(result.pagination.hasNextPage).toBe(false);
    });

    it("should include totalCount when provided", () => {
      const items = createItems(5);
      const params: PaginationParams = { limit: 10, direction: "forward" };
      const result = buildPaginatedResponse(items, params, 100);

      expect(result.pagination.totalCount).toBe(100);
    });
  });

  describe("parsePaginationParams", () => {
    it("should parse all pagination params", () => {
      const params = new URLSearchParams(
        "cursor=abc123&limit=50&direction=backward"
      );
      const result = parsePaginationParams(params);

      expect(result.cursor).toBe("abc123");
      expect(result.limit).toBe(50);
      expect(result.direction).toBe("backward");
    });

    it("should use default values when not provided", () => {
      const params = new URLSearchParams("");
      const result = parsePaginationParams(params);

      expect(result.cursor).toBeUndefined();
      expect(result.limit).toBe(25);
      expect(result.direction).toBe("forward");
    });

    it("should coerce limit to number", () => {
      const params = new URLSearchParams("limit=30");
      const result = parsePaginationParams(params);

      expect(result.limit).toBe(30);
      expect(typeof result.limit).toBe("number");
    });

    it("should enforce maximum limit", () => {
      const params = new URLSearchParams("limit=1000");
      expect(() => parsePaginationParams(params)).toThrow();
    });

    it("should enforce minimum limit", () => {
      const params = new URLSearchParams("limit=0");
      expect(() => parsePaginationParams(params)).toThrow();
    });
  });

  describe("paginationSchema", () => {
    it("should validate valid pagination params", () => {
      const result = paginationSchema.parse({
        cursor: "abc123",
        limit: 50,
        direction: "backward",
      });
      expect(result.cursor).toBe("abc123");
      expect(result.limit).toBe(50);
      expect(result.direction).toBe("backward");
    });

    it("should apply defaults", () => {
      const result = paginationSchema.parse({});
      expect(result.limit).toBe(25);
      expect(result.direction).toBe("forward");
    });

    it("should reject invalid direction", () => {
      expect(() =>
        paginationSchema.parse({ direction: "invalid" })
      ).toThrow();
    });

    it("should reject limit above 100", () => {
      expect(() => paginationSchema.parse({ limit: 101 })).toThrow();
    });

    it("should reject limit below 1", () => {
      expect(() => paginationSchema.parse({ limit: 0 })).toThrow();
    });
  });
});
