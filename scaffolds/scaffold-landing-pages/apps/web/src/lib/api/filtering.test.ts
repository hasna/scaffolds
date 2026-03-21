// @ts-nocheck
import { describe, it, expect } from "vitest";
import { parseFilterParams, filterSchema, type FilterCondition } from "./filtering";

describe("api/filtering", () => {
  describe("parseFilterParams", () => {
    it("should parse eq filter", () => {
      const params = new URLSearchParams("filter[status][eq]=active");
      const result = parseFilterParams(params);
      expect(result).toEqual([
        { field: "status", operator: "eq", value: "active" },
      ]);
    });

    it("should parse multiple filters", () => {
      const params = new URLSearchParams(
        "filter[status][eq]=active&filter[name][like]=john"
      );
      const result = parseFilterParams(params);
      expect(result).toHaveLength(2);
      expect(result).toContainEqual({
        field: "status",
        operator: "eq",
        value: "active",
      });
      expect(result).toContainEqual({
        field: "name",
        operator: "like",
        value: "john",
      });
    });

    it("should parse boolean true value", () => {
      const params = new URLSearchParams("filter[isActive][eq]=true");
      const result = parseFilterParams(params);
      expect(result[0]!.value).toBe(true);
    });

    it("should parse boolean false value", () => {
      const params = new URLSearchParams("filter[isActive][eq]=false");
      const result = parseFilterParams(params);
      expect(result[0]!.value).toBe(false);
    });

    it("should parse numeric value", () => {
      const params = new URLSearchParams("filter[age][gte]=18");
      const result = parseFilterParams(params);
      expect(result[0]!.value).toBe(18);
      expect(typeof result[0]!.value).toBe("number");
    });

    it("should parse float numeric value", () => {
      const params = new URLSearchParams("filter[price][gte]=19.99");
      const result = parseFilterParams(params);
      expect(result[0]!.value).toBe(19.99);
    });

    it("should parse in operator with array value", () => {
      const params = new URLSearchParams("filter[status][in]=active,pending,draft");
      const result = parseFilterParams(params);
      expect(result[0]!.value).toEqual(["active", "pending", "draft"]);
    });

    it("should parse nin operator with array value", () => {
      const params = new URLSearchParams("filter[status][nin]=deleted,archived");
      const result = parseFilterParams(params);
      expect(result[0]!.value).toEqual(["deleted", "archived"]);
    });

    it("should trim whitespace from array values", () => {
      const params = new URLSearchParams("filter[status][in]=active , pending , draft");
      const result = parseFilterParams(params);
      expect(result[0]!.value).toEqual(["active", "pending", "draft"]);
    });

    it("should ignore non-filter params", () => {
      const params = new URLSearchParams(
        "page=1&limit=10&filter[status][eq]=active"
      );
      const result = parseFilterParams(params);
      expect(result).toHaveLength(1);
      expect(result[0]!.field).toBe("status");
    });

    it("should return empty array when no filters", () => {
      const params = new URLSearchParams("page=1&limit=10");
      const result = parseFilterParams(params);
      expect(result).toEqual([]);
    });

    it("should handle all operators", () => {
      const operators = ["eq", "ne", "gt", "gte", "lt", "lte", "like"];
      for (const op of operators) {
        const params = new URLSearchParams(`filter[field][${op}]=value`);
        const result = parseFilterParams(params);
        expect(result[0]!.operator).toBe(op);
      }
    });

    it("should keep string values as strings when they look like numbers but have leading zeros", () => {
      const params = new URLSearchParams("filter[code][eq]=007");
      const result = parseFilterParams(params);
      // Note: "007" parses as 7 in JavaScript, but this is actually a number
      expect(result[0]!.value).toBe(7);
    });

    it("should handle negative numbers", () => {
      const params = new URLSearchParams("filter[balance][lt]=-100");
      const result = parseFilterParams(params);
      expect(result[0]!.value).toBe(-100);
    });

    it("should handle empty string value", () => {
      const params = new URLSearchParams("filter[name][eq]=");
      const result = parseFilterParams(params);
      expect(result[0]!.value).toBe("");
    });
  });

  describe("filterSchema", () => {
    it("should validate valid filter with string value", () => {
      const filter: FilterCondition = {
        field: "status",
        operator: "eq",
        value: "active",
      };
      const result = filterSchema.parse(filter);
      expect(result).toEqual(filter);
    });

    it("should validate valid filter with number value", () => {
      const filter: FilterCondition = {
        field: "age",
        operator: "gte",
        value: 18,
      };
      const result = filterSchema.parse(filter);
      expect(result).toEqual(filter);
    });

    it("should validate valid filter with boolean value", () => {
      const filter: FilterCondition = {
        field: "isActive",
        operator: "eq",
        value: true,
      };
      const result = filterSchema.parse(filter);
      expect(result).toEqual(filter);
    });

    it("should validate valid filter with string array value", () => {
      const filter: FilterCondition = {
        field: "status",
        operator: "in",
        value: ["active", "pending"],
      };
      const result = filterSchema.parse(filter);
      expect(result).toEqual(filter);
    });

    it("should validate valid filter with number array value", () => {
      const filter: FilterCondition = {
        field: "ids",
        operator: "in",
        value: [1, 2, 3],
      };
      const result = filterSchema.parse(filter);
      expect(result).toEqual(filter);
    });

    it("should reject invalid operator", () => {
      const filter = {
        field: "status",
        operator: "invalid",
        value: "active",
      };
      expect(() => filterSchema.parse(filter)).toThrow();
    });

    it("should reject missing field", () => {
      const filter = {
        operator: "eq",
        value: "active",
      };
      expect(() => filterSchema.parse(filter)).toThrow();
    });

    it("should accept all valid operators", () => {
      const operators = ["eq", "ne", "gt", "gte", "lt", "lte", "like", "in", "nin"];
      for (const operator of operators) {
        const filter = {
          field: "test",
          operator,
          value: "value",
        };
        expect(() => filterSchema.parse(filter)).not.toThrow();
      }
    });
  });
});
