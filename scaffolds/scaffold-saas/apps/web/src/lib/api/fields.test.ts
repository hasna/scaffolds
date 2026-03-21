// @ts-nocheck
import { describe, it, expect } from "vitest";
import {
  parseFieldParams,
  selectFields,
  selectFieldsArray,
  buildColumnsSelection,
  fieldsSchema,
} from "./fields";

describe("api/fields", () => {
  describe("parseFieldParams", () => {
    it("should parse comma-separated fields", () => {
      const params = new URLSearchParams("fields=id,name,email");
      const result = parseFieldParams(params);
      expect(result).toEqual(["id", "name", "email"]);
    });

    it("should return null when fields param is missing", () => {
      const params = new URLSearchParams("");
      const result = parseFieldParams(params);
      expect(result).toBeNull();
    });

    it("should trim whitespace from field names", () => {
      const params = new URLSearchParams("fields=id , name , email");
      const result = parseFieldParams(params);
      expect(result).toEqual(["id", "name", "email"]);
    });

    it("should filter out empty strings", () => {
      const params = new URLSearchParams("fields=id,,name,");
      const result = parseFieldParams(params);
      expect(result).toEqual(["id", "name"]);
    });

    it("should handle single field", () => {
      const params = new URLSearchParams("fields=id");
      const result = parseFieldParams(params);
      expect(result).toEqual(["id"]);
    });
  });

  describe("selectFields", () => {
    const testObj = {
      id: "123",
      name: "Test",
      email: "test@example.com",
      createdAt: new Date(),
    };

    it("should return only selected fields", () => {
      const result = selectFields(testObj, ["id", "name"]);
      expect(result).toEqual({ id: "123", name: "Test" });
    });

    it("should return full object when fields is null", () => {
      const result = selectFields(testObj, null);
      expect(result).toEqual(testObj);
    });

    it("should return full object when fields is empty array", () => {
      const result = selectFields(testObj, []);
      expect(result).toEqual(testObj);
    });

    it("should ignore non-existent fields", () => {
      const result = selectFields(testObj, ["id", "nonexistent"]);
      expect(result).toEqual({ id: "123" });
    });

    it("should handle selecting all fields", () => {
      const result = selectFields(testObj, ["id", "name", "email", "createdAt"]);
      expect(result).toEqual(testObj);
    });
  });

  describe("selectFieldsArray", () => {
    const testItems = [
      { id: "1", name: "Item 1", description: "Desc 1" },
      { id: "2", name: "Item 2", description: "Desc 2" },
    ];

    it("should select fields for all items in array", () => {
      const result = selectFieldsArray(testItems, ["id", "name"]);
      expect(result).toEqual([
        { id: "1", name: "Item 1" },
        { id: "2", name: "Item 2" },
      ]);
    });

    it("should return full items when fields is null", () => {
      const result = selectFieldsArray(testItems, null);
      expect(result).toEqual(testItems);
    });

    it("should return full items when fields is empty array", () => {
      const result = selectFieldsArray(testItems, []);
      expect(result).toEqual(testItems);
    });

    it("should handle empty array", () => {
      const result = selectFieldsArray([], ["id"]);
      expect(result).toEqual([]);
    });
  });

  describe("buildColumnsSelection", () => {
    const allColumns = ["id", "name", "email", "createdAt"] as const;

    it("should select only specified columns", () => {
      const result = buildColumnsSelection<Record<string, boolean>>(
        ["name", "email"],
        [...allColumns]
      );
      // Should include id (always included) + name + email
      expect(result).toEqual({ id: true, name: true, email: true });
    });

    it("should select all columns when fields is null", () => {
      const result = buildColumnsSelection<Record<string, boolean>>(
        null,
        [...allColumns]
      );
      expect(result).toEqual({
        id: true,
        name: true,
        email: true,
        createdAt: true,
      });
    });

    it("should select all columns when fields is empty array", () => {
      const result = buildColumnsSelection<Record<string, boolean>>(
        [],
        [...allColumns]
      );
      expect(result).toEqual({
        id: true,
        name: true,
        email: true,
        createdAt: true,
      });
    });

    it("should always include id field", () => {
      const result = buildColumnsSelection<Record<string, boolean>>(
        ["name"],
        [...allColumns]
      );
      expect(result.id).toBe(true);
      expect(result.name).toBe(true);
    });

    it("should ignore non-existent columns", () => {
      const result = buildColumnsSelection<Record<string, boolean>>(
        ["name", "nonexistent"],
        [...allColumns]
      );
      expect(result).toEqual({ id: true, name: true });
      expect(result.nonexistent).toBeUndefined();
    });

    it("should not duplicate id if already in fields", () => {
      const result = buildColumnsSelection<Record<string, boolean>>(
        ["id", "name"],
        [...allColumns]
      );
      expect(result).toEqual({ id: true, name: true });
    });
  });

  describe("fieldsSchema", () => {
    it("should validate array of strings", () => {
      const result = fieldsSchema.parse(["id", "name"]);
      expect(result).toEqual(["id", "name"]);
    });

    it("should accept undefined", () => {
      const result = fieldsSchema.parse(undefined);
      expect(result).toBeUndefined();
    });

    it("should reject non-string arrays", () => {
      expect(() => fieldsSchema.parse([1, 2, 3])).toThrow();
    });

    it("should reject non-array values", () => {
      expect(() => fieldsSchema.parse("id,name")).toThrow();
    });
  });
});
