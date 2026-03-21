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
vi.mock("@scaffold-landing-pages/database/client", () => {
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
vi.mock("@scaffold-landing-pages/database/schema", () => ({
  users: { id: "id", twoFactorSecret: "two_factor_secret" },
}));

import { POST } from "./route";
import { auth } from "@/lib/auth";
import { db } from "@scaffold-landing-pages/database/client";

function createRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/auth/2fa/verify", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("2FA verify route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/auth/2fa/verify - Authorization", () => {
    it("should return 500 when user is not authenticated (redirect caught)", async () => {
      vi.mocked(auth).mockResolvedValue(null as any);
      vi.mocked(redirect).mockImplementation(() => {
        throw new Error("NEXT_REDIRECT");
      });

      const request = createRequest({ code: "123456" });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(redirect).toHaveBeenCalledWith("/login");
    });
  });

  describe("POST /api/auth/2fa/verify - Validation", () => {
    it("should return 400 for invalid code format (non-numeric)", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", email: "user@example.com" },
        expires: new Date().toISOString(),
      });

      const request = createRequest({ code: "abcdef" });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid code format");
    });

    it("should return 400 for invalid code length", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", email: "user@example.com" },
        expires: new Date().toISOString(),
      });

      const request = createRequest({ code: "12345" });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid code format");
    });

    it("should return 400 for missing code", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", email: "user@example.com" },
        expires: new Date().toISOString(),
      });

      const request = createRequest({});
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid code format");
    });

    it("should return 400 when 2FA not set up", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", email: "user@example.com" },
        expires: new Date().toISOString(),
      });
      vi.mocked(db.query.users.findFirst).mockResolvedValue({
        twoFactorSecret: null,
        twoFactorEnabled: false,
      });

      const request = createRequest({ code: "123456" });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("2FA not set up. Please start setup first.");
    });

    it("should return 400 for invalid verification code", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", email: "user@example.com" },
        expires: new Date().toISOString(),
      });
      vi.mocked(db.query.users.findFirst).mockResolvedValue({
        twoFactorSecret: "JBSWY3DPEHPK3PXP", // A valid base32 secret
        twoFactorEnabled: false,
      });

      const request = createRequest({ code: "000000" }); // Invalid code
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid verification code");
    });
  });

  describe("POST /api/auth/2fa/verify - Error handling", () => {
    it("should return 500 on internal error", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", email: "user@example.com" },
        expires: new Date().toISOString(),
      });
      vi.mocked(db.query.users.findFirst).mockRejectedValue(new Error("Database error"));

      const request = createRequest({ code: "123456" });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal error");
    });
  });
});
