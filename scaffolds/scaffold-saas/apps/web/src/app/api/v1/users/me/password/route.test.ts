// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock auth-utils
vi.mock("@/lib/auth-utils", () => ({
  requireAuth: vi.fn(),
}));

// Mock bcryptjs
vi.mock("bcryptjs", () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn(),
  },
}));

// Mock database
vi.mock("@scaffold-saas/database/client", () => ({
  db: {
    query: {
      users: { findFirst: vi.fn() },
    },
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(),
      })),
    })),
  },
}));

// Mock schema
vi.mock("@scaffold-saas/database/schema", () => ({
  users: {
    id: "id",
    passwordHash: "password_hash",
    updatedAt: "updated_at",
  },
}));

import { POST } from "./route";
import { requireAuth } from "@/lib/auth-utils";
import { db } from "@scaffold-saas/database/client";
import bcrypt from "bcryptjs";

function createRequest(body?: unknown): Request {
  const url = new URL("http://localhost:3000/api/v1/users/me/password");
  return new Request(url.toString(), {
    method: "POST",
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { "Content-Type": "application/json" } : undefined,
  });
}

describe("User Password route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/v1/users/me/password - Authorization", () => {
    it("should return 500 when not authenticated", async () => {
      vi.mocked(requireAuth).mockRejectedValue(new Error("Unauthorized"));

      const request = createRequest({
        currentPassword: "OldPass123",
        newPassword: "NewPass456",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal error");
    });
  });

  describe("POST /api/v1/users/me/password - Validation", () => {
    it("should return 400 for missing currentPassword", async () => {
      vi.mocked(requireAuth).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" },
        expires: new Date().toISOString(),
      });

      const request = createRequest({ newPassword: "NewPass456" });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid input");
    });

    it("should return 400 for missing newPassword", async () => {
      vi.mocked(requireAuth).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" },
        expires: new Date().toISOString(),
      });

      const request = createRequest({ currentPassword: "OldPass123" });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid input");
    });

    it("should return 400 for short newPassword", async () => {
      vi.mocked(requireAuth).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" },
        expires: new Date().toISOString(),
      });

      const request = createRequest({
        currentPassword: "OldPass123",
        newPassword: "Short1",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid input");
    });

    it("should return 400 for newPassword without uppercase", async () => {
      vi.mocked(requireAuth).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" },
        expires: new Date().toISOString(),
      });

      const request = createRequest({
        currentPassword: "OldPass123",
        newPassword: "newpass123",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid input");
    });

    it("should return 400 for newPassword without lowercase", async () => {
      vi.mocked(requireAuth).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" },
        expires: new Date().toISOString(),
      });

      const request = createRequest({
        currentPassword: "OldPass123",
        newPassword: "NEWPASS123",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid input");
    });

    it("should return 400 for newPassword without number", async () => {
      vi.mocked(requireAuth).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" },
        expires: new Date().toISOString(),
      });

      const request = createRequest({
        currentPassword: "OldPass123",
        newPassword: "NewPassword",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid input");
    });
  });

  describe("POST /api/v1/users/me/password - User checks", () => {
    it("should return 400 when user has no password (OAuth only)", async () => {
      vi.mocked(requireAuth).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" },
        expires: new Date().toISOString(),
      });
      vi.mocked(db.query.users.findFirst).mockResolvedValue({
        id: "user-1",
        passwordHash: null,
      });

      const request = createRequest({
        currentPassword: "OldPass123",
        newPassword: "NewPass456",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Password authentication not enabled for this account");
    });

    it("should return 400 when current password is incorrect", async () => {
      vi.mocked(requireAuth).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" },
        expires: new Date().toISOString(),
      });
      vi.mocked(db.query.users.findFirst).mockResolvedValue({
        id: "user-1",
        passwordHash: "hashed-password",
      });
      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

      const request = createRequest({
        currentPassword: "WrongPassword123",
        newPassword: "NewPass456",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Current password is incorrect");
    });
  });

  describe("POST /api/v1/users/me/password - Happy paths", () => {
    it("should change password successfully", async () => {
      vi.mocked(requireAuth).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" },
        expires: new Date().toISOString(),
      });
      vi.mocked(db.query.users.findFirst).mockResolvedValue({
        id: "user-1",
        passwordHash: "hashed-old-password",
      });
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
      vi.mocked(bcrypt.hash).mockResolvedValue("hashed-new-password" as never);

      const mockWhere = vi.fn();
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      vi.mocked(db.update).mockReturnValue({ set: mockSet } as never);

      const request = createRequest({
        currentPassword: "OldPass123",
        newPassword: "NewPass456",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(bcrypt.hash).toHaveBeenCalledWith("NewPass456", 12);
    });

    it("should accept complex password", async () => {
      vi.mocked(requireAuth).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" },
        expires: new Date().toISOString(),
      });
      vi.mocked(db.query.users.findFirst).mockResolvedValue({
        id: "user-1",
        passwordHash: "hashed-old-password",
      });
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
      vi.mocked(bcrypt.hash).mockResolvedValue("hashed-new-password" as never);

      const mockWhere = vi.fn();
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      vi.mocked(db.update).mockReturnValue({ set: mockSet } as never);

      const request = createRequest({
        currentPassword: "OldPass123",
        newPassword: "MyComplex@Password123!",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe("Error handling", () => {
    it("should return 500 on internal error", async () => {
      vi.mocked(requireAuth).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" },
        expires: new Date().toISOString(),
      });
      vi.mocked(db.query.users.findFirst).mockRejectedValue(
        new Error("Database error")
      );

      const request = createRequest({
        currentPassword: "OldPass123",
        newPassword: "NewPass456",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal error");
    });
  });
});
