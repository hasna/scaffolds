// @ts-nocheck
import { describe, it, expect } from "vitest";
import {
  escapeHtml,
  stripHtml,
  sanitizeForDisplay,
  sanitizeEmail,
  sanitizeUrl,
  sanitizeFilename,
  sanitizeObjectKeys,
  truncate,
  validateLength,
  removeNullBytes,
  escapeSqlLike,
} from "./sanitize";

describe("security/sanitize", () => {
  describe("escapeHtml", () => {
    it("should escape < and >", () => {
      expect(escapeHtml("<script>")).toBe("&lt;script&gt;");
    });

    it("should escape quotes", () => {
      expect(escapeHtml('He said "hello"')).toBe("He said &quot;hello&quot;");
      expect(escapeHtml("It's working")).toBe("It&#x27;s working");
    });

    it("should escape ampersand", () => {
      expect(escapeHtml("foo & bar")).toBe("foo &amp; bar");
    });

    it("should escape forward slash", () => {
      expect(escapeHtml("a/b")).toBe("a&#x2F;b");
    });

    it("should escape backtick and equals", () => {
      expect(escapeHtml("`=")).toBe("&#x60;&#x3D;");
    });

    it("should handle empty string", () => {
      expect(escapeHtml("")).toBe("");
    });

    it("should preserve safe characters", () => {
      expect(escapeHtml("Hello World 123")).toBe("Hello World 123");
    });
  });

  describe("stripHtml", () => {
    it("should remove HTML tags", () => {
      expect(stripHtml("<p>Hello</p>")).toBe("Hello");
    });

    it("should remove nested tags", () => {
      expect(stripHtml("<div><span>Text</span></div>")).toBe("Text");
    });

    it("should remove self-closing tags", () => {
      expect(stripHtml("Hello<br/>World")).toBe("HelloWorld");
    });

    it("should handle empty string", () => {
      expect(stripHtml("")).toBe("");
    });

    it("should preserve text without tags", () => {
      expect(stripHtml("Plain text")).toBe("Plain text");
    });
  });

  describe("sanitizeForDisplay", () => {
    it("should strip tags and escape HTML", () => {
      expect(sanitizeForDisplay("<p>Hello & goodbye</p>")).toBe(
        "Hello &amp; goodbye"
      );
    });
  });

  describe("sanitizeEmail", () => {
    it("should return valid email in lowercase", () => {
      expect(sanitizeEmail("User@Example.com")).toBe("user@example.com");
    });

    it("should trim whitespace", () => {
      expect(sanitizeEmail("  user@example.com  ")).toBe("user@example.com");
    });

    it("should return null for invalid email", () => {
      expect(sanitizeEmail("not-an-email")).toBeNull();
      expect(sanitizeEmail("@example.com")).toBeNull();
      expect(sanitizeEmail("user@")).toBeNull();
    });

    it("should return null for email exceeding max length", () => {
      const longEmail = "a".repeat(250) + "@example.com";
      expect(sanitizeEmail(longEmail)).toBeNull();
    });

    it("should accept valid emails with subdomains", () => {
      expect(sanitizeEmail("user@mail.example.com")).toBe("user@mail.example.com");
    });

    it("should accept emails with plus signs", () => {
      expect(sanitizeEmail("user+tag@example.com")).toBe("user+tag@example.com");
    });
  });

  describe("sanitizeUrl", () => {
    it("should return valid http URLs", () => {
      expect(sanitizeUrl("http://example.com")).toBe("http://example.com/");
    });

    it("should return valid https URLs", () => {
      expect(sanitizeUrl("https://example.com/path")).toBe(
        "https://example.com/path"
      );
    });

    it("should return null for javascript: URLs", () => {
      expect(sanitizeUrl("javascript:alert(1)")).toBeNull();
      expect(sanitizeUrl("JAVASCRIPT:alert(1)")).toBeNull();
    });

    it("should return null for data: URLs", () => {
      expect(sanitizeUrl("data:text/html,<script>")).toBeNull();
    });

    it("should return null for vbscript: URLs", () => {
      expect(sanitizeUrl("vbscript:alert(1)")).toBeNull();
    });

    it("should return null for file: URLs", () => {
      expect(sanitizeUrl("file:///etc/passwd")).toBeNull();
    });

    it("should allow relative URLs starting with /", () => {
      expect(sanitizeUrl("/api/users")).toBe("/api/users");
    });

    it("should reject protocol-relative URLs", () => {
      expect(sanitizeUrl("//evil.com")).toBeNull();
    });

    it("should trim whitespace", () => {
      expect(sanitizeUrl("  https://example.com  ")).toBe("https://example.com/");
    });
  });

  describe("sanitizeFilename", () => {
    it("should remove path separators", () => {
      expect(sanitizeFilename("../../../etc/passwd")).toBe("etcpasswd");
    });

    it("should remove parent directory references", () => {
      expect(sanitizeFilename("..file.txt")).toBe("file.txt");
    });

    it("should remove control characters", () => {
      expect(sanitizeFilename("file\x00.txt")).toBe("file.txt");
    });

    it("should remove invalid filename characters", () => {
      expect(sanitizeFilename('file<>:"|?*.txt')).toBe("file.txt");
    });

    it("should trim whitespace", () => {
      expect(sanitizeFilename("  file.txt  ")).toBe("file.txt");
    });

    it("should preserve valid filenames", () => {
      expect(sanitizeFilename("my-file_name.txt")).toBe("my-file_name.txt");
    });
  });

  describe("sanitizeObjectKeys", () => {
    it("should remove __proto__ key from own properties", () => {
      // Note: __proto__ in literal form is special in JS, so we use Object.defineProperty
      const obj: Record<string, unknown> = { name: "test" };
      Object.defineProperty(obj, "__proto__", { value: "evil", enumerable: true });
      const result = sanitizeObjectKeys(obj);
      expect(Object.keys(result)).not.toContain("__proto__");
      expect(result.name).toBe("test");
    });

    it("should remove constructor key from own properties", () => {
      const obj = { name: "test", constructor: "evil" };
      const result = sanitizeObjectKeys(obj);
      expect(Object.keys(result)).not.toContain("constructor");
      expect(result.name).toBe("test");
    });

    it("should sanitize nested objects", () => {
      const nested: Record<string, unknown> = { value: "safe" };
      Object.defineProperty(nested, "__proto__", { value: "evil", enumerable: true });
      const obj = { name: "test", nested };
      const result = sanitizeObjectKeys(obj);
      expect(Object.keys(result.nested)).not.toContain("__proto__");
      expect(result.nested.value).toBe("safe");
    });

    it("should preserve arrays", () => {
      const obj = { items: [1, 2, 3] };
      const result = sanitizeObjectKeys(obj);
      expect(result.items).toEqual([1, 2, 3]);
    });

    it("should handle case-insensitive dangerous keys", () => {
      const obj = { PROTOTYPE: "evil", name: "safe" };
      const result = sanitizeObjectKeys(obj);
      expect(Object.keys(result)).not.toContain("PROTOTYPE");
      expect(result.name).toBe("safe");
    });
  });

  describe("truncate", () => {
    it("should truncate long strings", () => {
      expect(truncate("Hello World", 5)).toBe("Hello");
    });

    it("should return original string if shorter than max", () => {
      expect(truncate("Hello", 10)).toBe("Hello");
    });

    it("should return original string if equal to max", () => {
      expect(truncate("Hello", 5)).toBe("Hello");
    });

    it("should handle empty string", () => {
      expect(truncate("", 5)).toBe("");
    });
  });

  describe("validateLength", () => {
    it("should return true for valid length", () => {
      expect(validateLength("Hello", 1, 10)).toBe(true);
    });

    it("should return true at exact min", () => {
      expect(validateLength("Hello", 5, 10)).toBe(true);
    });

    it("should return true at exact max", () => {
      expect(validateLength("Hello", 1, 5)).toBe(true);
    });

    it("should return false below min", () => {
      expect(validateLength("Hi", 3, 10)).toBe(false);
    });

    it("should return false above max", () => {
      expect(validateLength("Hello World", 1, 5)).toBe(false);
    });
  });

  describe("removeNullBytes", () => {
    it("should remove null bytes", () => {
      expect(removeNullBytes("Hello\x00World")).toBe("HelloWorld");
    });

    it("should handle multiple null bytes", () => {
      expect(removeNullBytes("\x00test\x00data\x00")).toBe("testdata");
    });

    it("should handle string without null bytes", () => {
      expect(removeNullBytes("Hello")).toBe("Hello");
    });
  });

  describe("escapeSqlLike", () => {
    it("should escape single quotes", () => {
      expect(escapeSqlLike("O'Brien")).toBe("O''Brien");
    });

    it("should escape percent sign", () => {
      expect(escapeSqlLike("100%")).toBe("100\\%");
    });

    it("should escape underscore", () => {
      expect(escapeSqlLike("user_name")).toBe("user\\_name");
    });

    it("should escape multiple special characters", () => {
      expect(escapeSqlLike("It's 100% like_this")).toBe(
        "It''s 100\\% like\\_this"
      );
    });
  });
});
