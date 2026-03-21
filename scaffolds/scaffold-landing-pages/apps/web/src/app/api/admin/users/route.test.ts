// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";

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
          findMany: vi.fn(),
        },
      },
    },
  };
});

// Mock schema
vi.mock("@scaffold-landing-pages/database/schema", () => ({
  users: { createdAt: "created_at" },
}));

import { GET } from "./route";
import { auth } from "@/lib/auth";
import { db } from "@scaffold-landing-pages/database/client";

function createRequest(params?: Record<string, string>): Request {
  const searchParams = new URLSearchParams(params);
  const url = `http://localhost:3000/api/admin/users${params ? `?${searchParams}` : ""}`;
  return new Request(url, { method: "GET" });
}

describe("Admin users route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/admin/users - Authorization", () => {
    it("should return 403 when user is not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null as any);

      const request = createRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });

    it("should return 403 when session has no user id", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "", email: "test@example.com", role: "admin" },
        expires: new Date().toISOString(),
      });

      const request = createRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });

    it("should return 403 when user is not an admin", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", email: "user@example.com", role: "user" },
        expires: new Date().toISOString(),
      });

      const request = createRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });

    it("should return 403 for super_admin (only admin role allowed)", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "super-1", email: "super@example.com", role: "super_admin" },
        expires: new Date().toISOString(),
      });

      const request = createRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });
  });

  describe("GET /api/admin/users - Happy paths", () => {
    it("should return list of users for admin", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin-1", email: "admin@example.com", role: "admin" },
        expires: new Date().toISOString(),
      });
      vi.mocked(db.query.users.findMany).mockResolvedValue([
        {
          id: "user-1",
          email: "user@example.com",
          name: "Test User",
          role: "user",
          emailVerifiedAt: new Date(),
          createdAt: new Date(),
        },
      ]);

      const request = createRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toBeDefined();
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data[0].id).toBe("user-1");
    });

    it("should return empty array when no users exist", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin-1", email: "admin@example.com", role: "admin" },
        expires: new Date().toISOString(),
      });
      vi.mocked(db.query.users.findMany).mockResolvedValue([]);

      const request = createRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toEqual([]);
    });
  });

  describe("GET /api/admin/users - Pagination", () => {
    it("should respect limit parameter", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin-1", email: "admin@example.com", role: "admin" },
        expires: new Date().toISOString(),
      });
      vi.mocked(db.query.users.findMany).mockResolvedValue([]);

      const request = createRequest({ limit: "10" });
      await GET(request);

      expect(db.query.users.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 10 })
      );
    });

    it("should respect offset parameter", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin-1", email: "admin@example.com", role: "admin" },
        expires: new Date().toISOString(),
      });
      vi.mocked(db.query.users.findMany).mockResolvedValue([]);

      const request = createRequest({ offset: "20" });
      await GET(request);

      expect(db.query.users.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ offset: 20 })
      );
    });

    it("should cap limit at 100", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin-1", email: "admin@example.com", role: "admin" },
        expires: new Date().toISOString(),
      });
      vi.mocked(db.query.users.findMany).mockResolvedValue([]);

      const request = createRequest({ limit: "200" });
      await GET(request);

      expect(db.query.users.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 100 })
      );
    });

    it("should use default limit of 50 when not provided", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin-1", email: "admin@example.com", role: "admin" },
        expires: new Date().toISOString(),
      });
      vi.mocked(db.query.users.findMany).mockResolvedValue([]);

      const request = createRequest();
      await GET(request);

      expect(db.query.users.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 50, offset: 0 })
      );
    });
  });

  describe("GET /api/admin/users - Error handling", () => {
    it("should return 500 on internal error", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin-1", email: "admin@example.com", role: "admin" },
        expires: new Date().toISOString(),
      });
      vi.mocked(db.query.users.findMany).mockRejectedValue(new Error("Database error"));

      const request = createRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal error");
    });
  });
});
