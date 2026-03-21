// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock auth
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

// Mock database
vi.mock("@scaffold-social/database/client", () => {
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
      delete: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve()),
      })),
    },
  };
});

// Mock schema
vi.mock("@scaffold-social/database/schema", () => ({
  users: { id: "id", role: "role" },
  sessions: { userId: "user_id" },
  accounts: { userId: "user_id" },
  teamMembers: { userId: "user_id" },
}));

import { PATCH, DELETE } from "./route";
import { auth } from "@/lib/auth";
import { db } from "@scaffold-social/database/client";

function createPatchRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/admin/users/user-1", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function createDeleteRequest(): Request {
  return new Request("http://localhost:3000/api/admin/users/user-1", {
    method: "DELETE",
  });
}

describe("Admin users [userId] route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("PATCH /api/admin/users/[userId] - Authorization", () => {
    it("should return 403 when user is not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null as any);

      const request = createPatchRequest({ action: "disable" });
      const response = await PATCH(request, { params: Promise.resolve({ userId: "user-1" }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });

    it("should return 403 when session has no user id", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "", email: "test@example.com", role: "admin" },
        expires: new Date().toISOString(),
      });

      const request = createPatchRequest({ action: "disable" });
      const response = await PATCH(request, { params: Promise.resolve({ userId: "user-1" }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });

    it("should return 403 when user is not an admin", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", email: "user@example.com", role: "user" },
        expires: new Date().toISOString(),
      });

      const request = createPatchRequest({ action: "disable" });
      const response = await PATCH(request, { params: Promise.resolve({ userId: "user-1" }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });
  });

  describe("PATCH /api/admin/users/[userId] - Validation", () => {
    it("should return 400 for invalid action", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin-1", email: "admin@example.com", role: "admin" },
        expires: new Date().toISOString(),
      });

      const request = createPatchRequest({ action: "invalid" });
      const response = await PATCH(request, { params: Promise.resolve({ userId: "user-1" }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid input");
    });

    it("should return 400 when trying to modify self", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin-1", email: "admin@example.com", role: "admin" },
        expires: new Date().toISOString(),
      });

      const request = createPatchRequest({ action: "disable" });
      const response = await PATCH(request, { params: Promise.resolve({ userId: "admin-1" }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Cannot modify your own account");
    });

    it("should return 404 when user does not exist", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin-1", email: "admin@example.com", role: "admin" },
        expires: new Date().toISOString(),
      });
      vi.mocked(db.query.users.findFirst).mockResolvedValue(undefined);

      const request = createPatchRequest({ action: "disable" });
      const response = await PATCH(request, { params: Promise.resolve({ userId: "nonexistent" }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("User not found");
    });
  });

  describe("PATCH /api/admin/users/[userId] - Happy paths", () => {
    it("should disable a user successfully", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin-1", email: "admin@example.com", role: "admin" },
        expires: new Date().toISOString(),
      });
      vi.mocked(db.query.users.findFirst).mockResolvedValue({
        id: "user-1",
        email: "user@example.com",
        role: "user",
        isDisabled: false,
      });

      const request = createPatchRequest({ action: "disable" });
      const response = await PATCH(request, { params: Promise.resolve({ userId: "user-1" }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(db.update).toHaveBeenCalled();
    });

    it("should enable a disabled user", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin-1", email: "admin@example.com", role: "admin" },
        expires: new Date().toISOString(),
      });
      vi.mocked(db.query.users.findFirst).mockResolvedValue({
        id: "user-1",
        email: "user@example.com",
        role: "user",
        isDisabled: true,
      });

      const request = createPatchRequest({ action: "disable" });
      const response = await PATCH(request, { params: Promise.resolve({ userId: "user-1" }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("should promote a user to admin", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin-1", email: "admin@example.com", role: "admin" },
        expires: new Date().toISOString(),
      });
      vi.mocked(db.query.users.findFirst).mockResolvedValue({
        id: "user-1",
        email: "user@example.com",
        role: "user",
        isDisabled: false,
      });

      const request = createPatchRequest({ action: "make-admin" });
      const response = await PATCH(request, { params: Promise.resolve({ userId: "user-1" }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("should demote an admin to user", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin-1", email: "admin@example.com", role: "admin" },
        expires: new Date().toISOString(),
      });
      vi.mocked(db.query.users.findFirst).mockResolvedValue({
        id: "user-2",
        email: "admin2@example.com",
        role: "admin",
        isDisabled: false,
      });

      const request = createPatchRequest({ action: "make-admin" });
      const response = await PATCH(request, { params: Promise.resolve({ userId: "user-2" }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe("DELETE /api/admin/users/[userId] - Authorization", () => {
    it("should return 403 when user is not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null as any);

      const request = createDeleteRequest();
      const response = await DELETE(request, { params: Promise.resolve({ userId: "user-1" }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });

    it("should return 403 when user is not an admin", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", email: "user@example.com", role: "user" },
        expires: new Date().toISOString(),
      });

      const request = createDeleteRequest();
      const response = await DELETE(request, { params: Promise.resolve({ userId: "user-1" }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });
  });

  describe("DELETE /api/admin/users/[userId] - Validation", () => {
    it("should return 400 when trying to delete self", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin-1", email: "admin@example.com", role: "admin" },
        expires: new Date().toISOString(),
      });

      const request = createDeleteRequest();
      const response = await DELETE(request, { params: Promise.resolve({ userId: "admin-1" }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Cannot delete your own account");
    });
  });

  describe("DELETE /api/admin/users/[userId] - Happy paths", () => {
    it("should delete a user successfully", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin-1", email: "admin@example.com", role: "admin" },
        expires: new Date().toISOString(),
      });

      const request = createDeleteRequest();
      const response = await DELETE(request, { params: Promise.resolve({ userId: "user-1" }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(db.delete).toHaveBeenCalled();
    });
  });

  describe("Error handling", () => {
    it("should return 500 on PATCH internal error", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin-1", email: "admin@example.com", role: "admin" },
        expires: new Date().toISOString(),
      });
      vi.mocked(db.query.users.findFirst).mockRejectedValue(new Error("Database error"));

      const request = createPatchRequest({ action: "disable" });
      const response = await PATCH(request, { params: Promise.resolve({ userId: "user-1" }) });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal error");
    });

    it("should return 500 on DELETE internal error", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin-1", email: "admin@example.com", role: "admin" },
        expires: new Date().toISOString(),
      });
      vi.mocked(db.delete).mockImplementation(() => {
        throw new Error("Database error");
      });

      const request = createDeleteRequest();
      const response = await DELETE(request, { params: Promise.resolve({ userId: "user-1" }) });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal error");
    });
  });
});
