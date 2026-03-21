// @ts-nocheck
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock next-auth before importing auth-utils
vi.mock("next-auth", () => ({
  default: vi.fn(),
}));

vi.mock("./auth", () => ({
  auth: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("@scaffold-review/database/client", () => ({
  db: {
    query: {
      verificationTokens: { findFirst: vi.fn() },
      passwordResetTokens: { findFirst: vi.fn() },
    },
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue([]),
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([]),
    }),
  },
}));

vi.mock("@scaffold-review/database/schema", () => ({
  verificationTokens: { identifier: "identifier" },
  passwordResetTokens: { token: "token" },
}));

import {
  generateToken,
  isAdminEmail,
  validatePassword,
  hashPassword,
  verifyPassword,
} from "./auth-utils";

describe("auth-utils", () => {
  describe("generateToken", () => {
    it("should generate token of default length (64 hex chars for 32 bytes)", () => {
      const token = generateToken();
      expect(token).toHaveLength(64);
    });

    it("should generate token of specified length", () => {
      const token = generateToken(16);
      expect(token).toHaveLength(32); // 16 bytes = 32 hex chars
    });

    it("should generate unique tokens", () => {
      const token1 = generateToken();
      const token2 = generateToken();
      expect(token1).not.toBe(token2);
    });

    it("should only contain hex characters", () => {
      const token = generateToken();
      expect(token).toMatch(/^[0-9a-f]+$/);
    });
  });

  describe("isAdminEmail", () => {
    const originalEnv = process.env.ADMIN_EMAILS;

    afterEach(() => {
      if (originalEnv !== undefined) {
        process.env.ADMIN_EMAILS = originalEnv;
      } else {
        delete process.env.ADMIN_EMAILS;
      }
    });

    it("should return true for admin email in list", () => {
      process.env.ADMIN_EMAILS = "admin@example.com,super@example.com";
      expect(isAdminEmail("admin@example.com")).toBe(true);
    });

    it("should be case insensitive", () => {
      process.env.ADMIN_EMAILS = "admin@example.com";
      expect(isAdminEmail("ADMIN@EXAMPLE.COM")).toBe(true);
    });

    it("should return false for non-admin email", () => {
      process.env.ADMIN_EMAILS = "admin@example.com";
      expect(isAdminEmail("user@example.com")).toBe(false);
    });

    it("should return false when ADMIN_EMAILS is not set", () => {
      delete process.env.ADMIN_EMAILS;
      expect(isAdminEmail("admin@example.com")).toBe(false);
    });

    it("should handle whitespace in email list", () => {
      process.env.ADMIN_EMAILS = "admin@example.com, super@example.com ";
      expect(isAdminEmail("super@example.com")).toBe(true);
    });
  });

  describe("validatePassword", () => {
    it("should accept valid password", () => {
      const result = validatePassword("Test123!@#");
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject short password", () => {
      const result = validatePassword("Aa1!");
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Password must be at least 8 characters long");
    });

    it("should reject password without uppercase", () => {
      const result = validatePassword("test123!@#");
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Password must contain at least one uppercase letter"
      );
    });

    it("should reject password without lowercase", () => {
      const result = validatePassword("TEST123!@#");
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Password must contain at least one lowercase letter"
      );
    });

    it("should reject password without number", () => {
      const result = validatePassword("TestTest!@#");
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Password must contain at least one number"
      );
    });

    it("should reject password without special character", () => {
      const result = validatePassword("TestTest123");
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Password must contain at least one special character"
      );
    });

    it("should return multiple errors for completely invalid password", () => {
      const result = validatePassword("abc");
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  describe("hashPassword and verifyPassword", () => {
    it("should hash and verify password correctly", async () => {
      const password = "MySecurePassword123!";
      const hash = await hashPassword(password);

      expect(hash).not.toBe(password);
      expect(hash.startsWith("$2")).toBe(true); // bcrypt hash prefix

      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it("should reject incorrect password", async () => {
      const password = "MySecurePassword123!";
      const hash = await hashPassword(password);

      const isValid = await verifyPassword("WrongPassword123!", hash);
      expect(isValid).toBe(false);
    });

    it("should generate different hashes for same password", async () => {
      const password = "MySecurePassword123!";
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });
  });
});
