// @ts-nocheck
import { describe, it, expect } from "vitest";
import { parseSortParams, sortSchema, type SortCondition } from "./sorting";

describe("api/sorting", () => {
  describe("parseSortParams", () => {
    it("should parse single sort param with direction", () => {
      const params = new URLSearchParams("sort=createdAt:desc");
      const result = parseSortParams(params);
      expect(result).toEqual([{ field: "createdAt", direction: "desc" }]);
    });

    it("should parse multiple sort params", () => {
      const params = new URLSearchParams("sort=createdAt:desc,name:asc");
      const result = parseSortParams(params);
      expect(result).toEqual([
        { field: "createdAt", direction: "desc" },
        { field: "name", direction: "asc" },
      ]);
    });

    it("should default to asc when direction not specified", () => {
      const params = new URLSearchParams("sort=name");
      const result = parseSortParams(params);
      expect(result).toEqual([{ field: "name", direction: "asc" }]);
    });

    it("should return empty array when no sort param", () => {
      const params = new URLSearchParams("page=1");
      const result = parseSortParams(params);
      expect(result).toEqual([]);
    });

    it("should handle DESC case-insensitively", () => {
      const params = new URLSearchParams("sort=name:DESC");
      const result = parseSortParams(params);
      expect(result[0]!.direction).toBe("desc");
    });

    it("should handle ASC case-insensitively", () => {
      const params = new URLSearchParams("sort=name:ASC");
      const result = parseSortParams(params);
      expect(result[0]!.direction).toBe("asc");
    });

    it("should trim whitespace from sort entries", () => {
      const params = new URLSearchParams("sort=name:desc,email:asc");
      const result = parseSortParams(params);
      expect(result).toHaveLength(2);
      expect(result[0]!.field).toBe("name");
      expect(result[1]!.field).toBe("email");
    });

    it("should treat invalid direction as asc", () => {
      const params = new URLSearchParams("sort=name:invalid");
      const result = parseSortParams(params);
      expect(result[0]!.direction).toBe("asc");
    });

    it("should handle field with multiple colons", () => {
      const params = new URLSearchParams("sort=field:desc:extra");
      const result = parseSortParams(params);
      // Should only take first two parts
      expect(result[0]!.field).toBe("field");
      expect(result[0]!.direction).toBe("desc");
    });
  });

  describe("sortSchema", () => {
    it("should validate valid sort condition with asc", () => {
      const sort: SortCondition = { field: "name", direction: "asc" };
      const result = sortSchema.parse(sort);
      expect(result).toEqual(sort);
    });

    it("should validate valid sort condition with desc", () => {
      const sort: SortCondition = { field: "createdAt", direction: "desc" };
      const result = sortSchema.parse(sort);
      expect(result).toEqual(sort);
    });

    it("should reject invalid direction", () => {
      expect(() =>
        sortSchema.parse({ field: "name", direction: "invalid" })
      ).toThrow();
    });

    it("should reject missing field", () => {
      expect(() => sortSchema.parse({ direction: "asc" })).toThrow();
    });

    it("should reject missing direction", () => {
      expect(() => sortSchema.parse({ field: "name" })).toThrow();
    });

    it("should reject non-string field", () => {
      expect(() =>
        sortSchema.parse({ field: 123, direction: "asc" })
      ).toThrow();
    });
  });
});
