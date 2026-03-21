// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock bcryptjs
vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn(),
  },
}));

// Mock database
vi.mock("@scaffold-social/database/client", () => {
  return {
    db: {
      query: {
        passwordResetTokens: {
          findFirst: vi.fn(),
        },
      },
      update: vi.fn(() => ({
        set: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve()),
        })),
      })),
      delete: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve()),
      })),
    },
  };
});

// Mock schema
vi.mock("@scaffold-social/database/schema", () => ({
  passwordResetTokens: { token: "token", expiresAt: "expires_at", id: "id" },
  users: { id: "id" },
  sessions: { userId: "user_id" },
}));

import { POST } from "./route";
import bcrypt from "bcryptjs";
import { db } from "@scaffold-social/database/client";

function createRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/auth/reset-password", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("Reset password route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(bcrypt.hash).mockResolvedValue("hashed-password" as never);
  });

  describe("POST /api/auth/reset-password - Validation", () => {
    it("should return 400 for missing token", async () => {
      const request = createRequest({ password: "NewPassword123!" });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid input");
    });

    it("should return 400 for missing password", async () => {
      const request = createRequest({ token: "valid-token" });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid input");
    });

    it("should return 400 for password too short", async () => {
      const request = createRequest({ token: "valid-token", password: "short" });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid input");
    });
  });

  describe("POST /api/auth/reset-password - Token validation", () => {
    it("should return 400 for invalid token", async () => {
      vi.mocked(db.query.passwordResetTokens.findFirst).mockResolvedValue(undefined);

      const request = createRequest({ token: "invalid-token", password: "NewPassword123!" });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid or expired reset link");
    });

    it("should return 400 for expired token", async () => {
      vi.mocked(db.query.passwordResetTokens.findFirst).mockResolvedValue(undefined);

      const request = createRequest({ token: "expired-token", password: "NewPassword123!" });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid or expired reset link");
    });
  });

  describe("POST /api/auth/reset-password - Happy paths", () => {
    it("should reset password successfully", async () => {
      vi.mocked(db.query.passwordResetTokens.findFirst).mockResolvedValue({
        id: "token-1",
        token: "valid-token",
        userId: "user-1",
        expiresAt: new Date(Date.now() + 3600000),
      });

      const request = createRequest({ token: "valid-token", password: "NewPassword123!" });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(bcrypt.hash).toHaveBeenCalledWith("NewPassword123!", 12);
      expect(db.update).toHaveBeenCalled();
      expect(db.delete).toHaveBeenCalled();
    });
  });

  describe("POST /api/auth/reset-password - Error handling", () => {
    it("should return 500 on internal error", async () => {
      vi.mocked(db.query.passwordResetTokens.findFirst).mockRejectedValue(new Error("Database error"));

      const request = createRequest({ token: "valid-token", password: "NewPassword123!" });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal error");
    });
  });
});
