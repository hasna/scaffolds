// @ts-nocheck
import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("utils", () => {
  describe("cn", () => {
    it("should merge class names", () => {
      const result = cn("foo", "bar");
      expect(result).toBe("foo bar");
    });

    it("should handle conditional classes", () => {
      const result = cn("foo", true && "bar", false && "baz");
      expect(result).toBe("foo bar");
    });

    it("should handle object syntax", () => {
      const result = cn("foo", { bar: true, baz: false });
      expect(result).toBe("foo bar");
    });

    it("should handle array syntax", () => {
      const result = cn("foo", ["bar", "baz"]);
      expect(result).toBe("foo bar baz");
    });

    it("should merge Tailwind classes correctly", () => {
      const result = cn("px-2 py-1", "px-4");
      expect(result).toBe("py-1 px-4");
    });

    it("should handle conflicting Tailwind classes", () => {
      const result = cn("text-red-500", "text-blue-500");
      expect(result).toBe("text-blue-500");
    });

    it("should handle undefined and null", () => {
      const result = cn("foo", undefined, null, "bar");
      expect(result).toBe("foo bar");
    });

    it("should handle empty string", () => {
      const result = cn("foo", "", "bar");
      expect(result).toBe("foo bar");
    });

    it("should return empty string for no arguments", () => {
      const result = cn();
      expect(result).toBe("");
    });

    it("should merge complex Tailwind classes", () => {
      const result = cn(
        "flex items-center",
        "bg-blue-500 hover:bg-blue-600",
        "bg-red-500"
      );
      expect(result).toBe("flex items-center hover:bg-blue-600 bg-red-500");
    });
  });
});
