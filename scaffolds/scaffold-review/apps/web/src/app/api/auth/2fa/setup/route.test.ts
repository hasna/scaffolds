// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";
import { redirect } from "next/navigation";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

// Mock auth
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

// Mock database
vi.mock("@scaffold-review/database/client", () => {
  return {
    db: {
      query: {
        users: {
          findFirst: vi.fn(),
        },
      },
      update: vi.fn(() => ({
        set: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve()),
        })),
      })),
    },
  };
});

// Mock schema
vi.mock("@scaffold-review/database/schema", () => ({
  users: { id: "id", twoFactorEnabled: "two_factor_enabled" },
}));

import { POST, DELETE } from "./route";
import { auth } from "@/lib/auth";
import { db } from "@scaffold-review/database/client";

describe("2FA setup route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/auth/2fa/setup - Authorization", () => {
    it("should return 500 when user is not authenticated (redirect caught)", async () => {
      vi.mocked(auth).mockResolvedValue(null as any);
      vi.mocked(redirect).mockImplementation(() => {
        throw new Error("NEXT_REDIRECT");
      });

      // The redirect throws but is caught by the route's catch block
      const response = await POST();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(redirect).toHaveBeenCalledWith("/login");
    });
  });

  describe("POST /api/auth/2fa/setup - Validation", () => {
    it("should return 400 when 2FA is already enabled", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", email: "user@example.com" },
        expires: new Date().toISOString(),
      });
      vi.mocked(db.query.users.findFirst).mockResolvedValue({
        email: "user@example.com",
        twoFactorEnabled: true,
      });

      const response = await POST();
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("2FA is already enabled");
    });
  });

  describe("POST /api/auth/2fa/setup - Happy paths", () => {
    it("should generate secret and return QR code when 2FA not enabled", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", email: "user@example.com" },
        expires: new Date().toISOString(),
      });
      vi.mocked(db.query.users.findFirst).mockResolvedValue({
        email: "user@example.com",
        twoFactorEnabled: false,
      });

      const response = await POST();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.secret).toBeDefined();
      expect(typeof data.secret).toBe("string");
      expect(data.otpauthUrl).toBeDefined();
      expect(data.otpauthUrl).toContain("otpauth://totp/");
      expect(data.qrCode).toBeDefined();
      expect(data.qrCode).toContain("qrserver.com");
    });

    it("should save secret to database", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", email: "user@example.com" },
        expires: new Date().toISOString(),
      });
      vi.mocked(db.query.users.findFirst).mockResolvedValue({
        email: "user@example.com",
        twoFactorEnabled: false,
      });

      await POST();

      expect(db.update).toHaveBeenCalled();
    });

    it("should work when user has no email in database", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", email: "session@example.com" },
        expires: new Date().toISOString(),
      });
      vi.mocked(db.query.users.findFirst).mockResolvedValue({
        email: null,
        twoFactorEnabled: false,
      });

      const response = await POST();
      const data = await response.json();

      expect(response.status).toBe(200);
      // Email is URL encoded in the otpauth URL
      expect(data.otpauthUrl).toContain("session%40example.com");
    });
  });

  describe("DELETE /api/auth/2fa/setup - Authorization", () => {
    it("should return 500 when user is not authenticated (redirect caught)", async () => {
      vi.mocked(auth).mockResolvedValue(null as any);
      vi.mocked(redirect).mockImplementation(() => {
        throw new Error("NEXT_REDIRECT");
      });

      // The redirect throws but is caught by the route's catch block
      const response = await DELETE();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(redirect).toHaveBeenCalledWith("/login");
    });
  });

  describe("DELETE /api/auth/2fa/setup - Happy paths", () => {
    it("should disable 2FA successfully", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", email: "user@example.com" },
        expires: new Date().toISOString(),
      });

      const response = await DELETE();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(db.update).toHaveBeenCalled();
    });
  });

  describe("Error handling", () => {
    it("should return 500 on POST internal error", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", email: "user@example.com" },
        expires: new Date().toISOString(),
      });
      vi.mocked(db.query.users.findFirst).mockRejectedValue(new Error("Database error"));

      const response = await POST();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal error");
    });

    it("should return 500 on DELETE internal error", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", email: "user@example.com" },
        expires: new Date().toISOString(),
      });
      vi.mocked(db.update).mockImplementation(() => {
        throw new Error("Database error");
      });

      const response = await DELETE();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal error");
    });
  });
});
