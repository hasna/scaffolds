// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock auth-utils
vi.mock("@/lib/auth-utils", () => ({
  requireAuth: vi.fn(),
}));

// Mock database
vi.mock("@scaffold-review/database/client", () => ({
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
vi.mock("@scaffold-review/database/schema", () => ({
  users: {
    id: "id",
    notificationPreferences: "notification_preferences",
    updatedAt: "updated_at",
  },
}));

import { GET, PATCH } from "./route";
import { requireAuth } from "@/lib/auth-utils";
import { db } from "@scaffold-review/database/client";

function createRequest(
  method: string,
  body?: unknown
): Request {
  const url = new URL("http://localhost:3000/api/v1/users/me/notifications");
  return new Request(url.toString(), {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { "Content-Type": "application/json" } : undefined,
  });
}

const defaultPreferences = {
  email: true,
  marketing: false,
  updates: true,
  security: true,
};

const customPreferences = {
  email: false,
  marketing: true,
  updates: false,
  security: true,
};

describe("User Notification Preferences route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/v1/users/me/notifications - Authorization", () => {
    it("should return 500 when not authenticated", async () => {
      vi.mocked(requireAuth).mockRejectedValue(new Error("Unauthorized"));

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal error");
    });
  });

  describe("GET /api/v1/users/me/notifications - Happy paths", () => {
    it("should return user notification preferences", async () => {
      vi.mocked(requireAuth).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" },
        expires: new Date().toISOString(),
      });
      vi.mocked(db.query.users.findFirst).mockResolvedValue({
        notificationPreferences: customPreferences,
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.preferences.email).toBe(false);
      expect(data.preferences.marketing).toBe(true);
      expect(data.preferences.updates).toBe(false);
      expect(data.preferences.security).toBe(true);
    });

    it("should return default preferences when user has none set", async () => {
      vi.mocked(requireAuth).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" },
        expires: new Date().toISOString(),
      });
      vi.mocked(db.query.users.findFirst).mockResolvedValue({
        notificationPreferences: null,
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.preferences).toEqual(defaultPreferences);
    });

    it("should return default preferences when user not found", async () => {
      vi.mocked(requireAuth).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" },
        expires: new Date().toISOString(),
      });
      vi.mocked(db.query.users.findFirst).mockResolvedValue(null);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.preferences).toEqual(defaultPreferences);
    });

    it("should return 500 on internal error", async () => {
      vi.mocked(requireAuth).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" },
        expires: new Date().toISOString(),
      });
      vi.mocked(db.query.users.findFirst).mockRejectedValue(
        new Error("Database error")
      );

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal error");
    });
  });

  describe("PATCH /api/v1/users/me/notifications - Authorization", () => {
    it("should return 500 when not authenticated", async () => {
      vi.mocked(requireAuth).mockRejectedValue(new Error("Unauthorized"));

      const request = createRequest("PATCH", { email: false });
      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal error");
    });
  });

  describe("PATCH /api/v1/users/me/notifications - Validation", () => {
    it("should return 400 for invalid email value", async () => {
      vi.mocked(requireAuth).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" },
        expires: new Date().toISOString(),
      });

      const request = createRequest("PATCH", { email: "not-a-boolean" });
      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid input");
    });

    it("should return 400 for invalid marketing value", async () => {
      vi.mocked(requireAuth).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" },
        expires: new Date().toISOString(),
      });

      const request = createRequest("PATCH", { marketing: "yes" });
      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid input");
    });
  });

  describe("PATCH /api/v1/users/me/notifications - Happy paths", () => {
    it("should update single preference", async () => {
      vi.mocked(requireAuth).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" },
        expires: new Date().toISOString(),
      });
      vi.mocked(db.query.users.findFirst).mockResolvedValue({
        notificationPreferences: defaultPreferences,
      });

      const mockWhere = vi.fn();
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      vi.mocked(db.update).mockReturnValue({ set: mockSet } as never);

      const request = createRequest("PATCH", { email: false });
      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.preferences.email).toBe(false);
      expect(data.preferences.marketing).toBe(false);
      expect(data.preferences.updates).toBe(true);
      expect(data.preferences.security).toBe(true);
    });

    it("should update multiple preferences", async () => {
      vi.mocked(requireAuth).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" },
        expires: new Date().toISOString(),
      });
      vi.mocked(db.query.users.findFirst).mockResolvedValue({
        notificationPreferences: defaultPreferences,
      });

      const mockWhere = vi.fn();
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      vi.mocked(db.update).mockReturnValue({ set: mockSet } as never);

      const request = createRequest("PATCH", {
        email: false,
        marketing: true,
        updates: false,
      });
      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.preferences.email).toBe(false);
      expect(data.preferences.marketing).toBe(true);
      expect(data.preferences.updates).toBe(false);
      expect(data.preferences.security).toBe(true);
    });

    it("should merge with existing preferences when user has none", async () => {
      vi.mocked(requireAuth).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" },
        expires: new Date().toISOString(),
      });
      vi.mocked(db.query.users.findFirst).mockResolvedValue({
        notificationPreferences: null,
      });

      const mockWhere = vi.fn();
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      vi.mocked(db.update).mockReturnValue({ set: mockSet } as never);

      const request = createRequest("PATCH", { marketing: true });
      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.preferences.email).toBe(true);
      expect(data.preferences.marketing).toBe(true);
      expect(data.preferences.updates).toBe(true);
      expect(data.preferences.security).toBe(true);
    });

    it("should accept empty body (no changes)", async () => {
      vi.mocked(requireAuth).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" },
        expires: new Date().toISOString(),
      });
      vi.mocked(db.query.users.findFirst).mockResolvedValue({
        notificationPreferences: customPreferences,
      });

      const mockWhere = vi.fn();
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      vi.mocked(db.update).mockReturnValue({ set: mockSet } as never);

      const request = createRequest("PATCH", {});
      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.preferences).toEqual(customPreferences);
    });
  });

  describe("Error handling", () => {
    it("PATCH should return 500 on internal error", async () => {
      vi.mocked(requireAuth).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" },
        expires: new Date().toISOString(),
      });
      vi.mocked(db.query.users.findFirst).mockRejectedValue(
        new Error("Database error")
      );

      const request = createRequest("PATCH", { email: false });
      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal error");
    });
  });
});
