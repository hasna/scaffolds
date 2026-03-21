// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock auth-utils
vi.mock("@/lib/auth-utils", () => ({
  verifyEmailToken: vi.fn(),
}));

// Mock database
vi.mock("@scaffold-saas/database/client", () => {
  return {
    db: {
      update: vi.fn(() => ({
        set: vi.fn(() => ({
          where: vi.fn(() => ({
            returning: vi.fn(),
          })),
        })),
      })),
    },
  };
});

// Mock schema
vi.mock("@scaffold-saas/database/schema", () => ({
  users: { email: "email", id: "id" },
}));

import { POST, GET } from "./route";
import { verifyEmailToken } from "@/lib/auth-utils";
import { db } from "@scaffold-saas/database/client";

function createPostRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/auth/verify-email", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function createGetRequest(token?: string): Request {
  const url = token
    ? `http://localhost:3000/api/auth/verify-email?token=${token}`
    : "http://localhost:3000/api/auth/verify-email";
  return new Request(url, { method: "GET" });
}

describe("Verify email route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/auth/verify-email - Validation", () => {
    it("should return 400 for missing token", async () => {
      const request = createPostRequest({});
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid input");
    });

    it("should return 400 for empty token", async () => {
      const request = createPostRequest({ token: "" });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid input");
    });
  });

  describe("POST /api/auth/verify-email - Token validation", () => {
    it("should return 400 for invalid token", async () => {
      vi.mocked(verifyEmailToken).mockResolvedValue(null);

      const request = createPostRequest({ token: "invalid-token" });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid or expired verification token");
    });

    it("should return 404 when user not found", async () => {
      vi.mocked(verifyEmailToken).mockResolvedValue("user@example.com");

      const mockReturning = vi.fn().mockResolvedValue([]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      vi.mocked(db.update).mockReturnValue({ set: mockSet } as never);

      const request = createPostRequest({ token: "valid-token" });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("User not found");
    });
  });

  describe("POST /api/auth/verify-email - Happy paths", () => {
    it("should verify email successfully", async () => {
      vi.mocked(verifyEmailToken).mockResolvedValue("user@example.com");

      const mockReturning = vi.fn().mockResolvedValue([{ id: "user-1" }]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      vi.mocked(db.update).mockReturnValue({ set: mockSet } as never);

      const request = createPostRequest({ token: "valid-token" });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain("Email verified successfully");
    });
  });

  describe("POST /api/auth/verify-email - Error handling", () => {
    it("should return 500 on internal error", async () => {
      vi.mocked(verifyEmailToken).mockRejectedValue(new Error("Database error"));

      const request = createPostRequest({ token: "valid-token" });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal error");
    });
  });

  describe("GET /api/auth/verify-email - Redirects", () => {
    it("should redirect with error when token is missing", async () => {
      const request = createGetRequest();
      const response = await GET(request);

      expect(response.status).toBe(307); // redirect status
      expect(response.headers.get("location")).toContain("error=missing-token");
    });

    it("should redirect with error when token is invalid", async () => {
      vi.mocked(verifyEmailToken).mockResolvedValue(null);

      const request = createGetRequest("invalid-token");
      const response = await GET(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("error=invalid-token");
    });

    it("should redirect with success when token is valid", async () => {
      vi.mocked(verifyEmailToken).mockResolvedValue("user@example.com");

      const mockWhere = vi.fn().mockResolvedValue(undefined);
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      vi.mocked(db.update).mockReturnValue({ set: mockSet } as never);

      const request = createGetRequest("valid-token");
      const response = await GET(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("verified=true");
    });
  });
});
