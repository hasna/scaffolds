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
          findFirst: vi.fn(),
        },
        featureFlags: {
          findFirst: vi.fn(),
        },
      },
      insert: vi.fn(() => ({
        values: vi.fn(() => ({
          onConflictDoUpdate: vi.fn(() => Promise.resolve()),
        })),
      })),
    },
  };
});

// Mock schema
vi.mock("@scaffold-landing-pages/database/schema", () => ({
  users: { id: "id", role: "role" },
  featureFlags: { id: "id" },
  planFeatures: {
    planId: "plan_id",
    featureFlagId: "feature_flag_id",
  },
}));

import { PUT } from "./route";
import { auth } from "@/lib/auth";
import { db } from "@scaffold-landing-pages/database/client";
import { NextRequest } from "next/server";

function createRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/admin/feature-flags/flag-1/plan-features", {
    method: "PUT",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("Admin feature-flags plan-features route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("PUT /api/admin/feature-flags/[id]/plan-features - Authorization", () => {
    it("should return 401 when user is not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null as any);

      const request = createRequest({ planFeatures: {} });
      const response = await PUT(request, { params: Promise.resolve({ id: "flag-1" }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 401 when session has no user id", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "", email: "test@example.com" },
        expires: new Date().toISOString(),
      });

      const request = createRequest({ planFeatures: {} });
      const response = await PUT(request, { params: Promise.resolve({ id: "flag-1" }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 403 when user is not an admin", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", email: "user@example.com" },
        expires: new Date().toISOString(),
      });
      vi.mocked(db.query.users.findFirst).mockResolvedValue({
        id: "user-1",
        role: "user",
        email: "user@example.com",
      });

      const request = createRequest({ planFeatures: {} });
      const response = await PUT(request, { params: Promise.resolve({ id: "flag-1" }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });

    it("should return 403 when user not found in database", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", email: "user@example.com" },
        expires: new Date().toISOString(),
      });
      vi.mocked(db.query.users.findFirst).mockResolvedValue(undefined);

      const request = createRequest({ planFeatures: {} });
      const response = await PUT(request, { params: Promise.resolve({ id: "flag-1" }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });
  });

  describe("PUT /api/admin/feature-flags/[id]/plan-features - Feature flag validation", () => {
    it("should return 404 when feature flag does not exist", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin-1", email: "admin@example.com" },
        expires: new Date().toISOString(),
      });
      vi.mocked(db.query.users.findFirst).mockResolvedValue({
        id: "admin-1",
        role: "admin",
        email: "admin@example.com",
      });
      vi.mocked(db.query.featureFlags.findFirst).mockResolvedValue(undefined);

      const request = createRequest({ planFeatures: {} });
      const response = await PUT(request, { params: Promise.resolve({ id: "nonexistent" }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Feature flag not found");
    });
  });

  describe("PUT /api/admin/feature-flags/[id]/plan-features - Validation", () => {
    it("should return 400 for invalid body schema", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin-1", email: "admin@example.com" },
        expires: new Date().toISOString(),
      });
      vi.mocked(db.query.users.findFirst).mockResolvedValue({
        id: "admin-1",
        role: "admin",
        email: "admin@example.com",
      });
      vi.mocked(db.query.featureFlags.findFirst).mockResolvedValue({
        id: "flag-1",
        key: "test_feature",
        name: "Test Feature",
      });

      const request = createRequest({ invalid: "data" });
      const response = await PUT(request, { params: Promise.resolve({ id: "flag-1" }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid request");
      expect(data.details).toBeDefined();
    });

    it("should return 400 when planFeatures has invalid structure", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin-1", email: "admin@example.com" },
        expires: new Date().toISOString(),
      });
      vi.mocked(db.query.users.findFirst).mockResolvedValue({
        id: "admin-1",
        role: "admin",
        email: "admin@example.com",
      });
      vi.mocked(db.query.featureFlags.findFirst).mockResolvedValue({
        id: "flag-1",
        key: "test_feature",
        name: "Test Feature",
      });

      const request = createRequest({
        planFeatures: {
          "plan-1": { enabled: "not-boolean" }, // Invalid: enabled should be boolean
        },
      });
      const response = await PUT(request, { params: Promise.resolve({ id: "flag-1" }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid request");
    });
  });

  describe("PUT /api/admin/feature-flags/[id]/plan-features - Happy paths", () => {
    it("should allow admin to update plan features", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin-1", email: "admin@example.com" },
        expires: new Date().toISOString(),
      });
      vi.mocked(db.query.users.findFirst).mockResolvedValue({
        id: "admin-1",
        role: "admin",
        email: "admin@example.com",
      });
      vi.mocked(db.query.featureFlags.findFirst).mockResolvedValue({
        id: "flag-1",
        key: "test_feature",
        name: "Test Feature",
      });

      const request = createRequest({
        planFeatures: {
          "plan-1": { enabled: true },
          "plan-2": { enabled: false },
        },
      });
      const response = await PUT(request, { params: Promise.resolve({ id: "flag-1" }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(db.insert).toHaveBeenCalled();
    });

    it("should allow super_admin to update plan features", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "super-1", email: "super@example.com" },
        expires: new Date().toISOString(),
      });
      vi.mocked(db.query.users.findFirst).mockResolvedValue({
        id: "super-1",
        role: "super_admin",
        email: "super@example.com",
      });
      vi.mocked(db.query.featureFlags.findFirst).mockResolvedValue({
        id: "flag-1",
        key: "test_feature",
        name: "Test Feature",
      });

      const request = createRequest({
        planFeatures: {
          "plan-1": { enabled: true },
        },
      });
      const response = await PUT(request, { params: Promise.resolve({ id: "flag-1" }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("should accept plan features with limits", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin-1", email: "admin@example.com" },
        expires: new Date().toISOString(),
      });
      vi.mocked(db.query.users.findFirst).mockResolvedValue({
        id: "admin-1",
        role: "admin",
        email: "admin@example.com",
      });
      vi.mocked(db.query.featureFlags.findFirst).mockResolvedValue({
        id: "flag-1",
        key: "test_feature",
        name: "Test Feature",
      });

      const request = createRequest({
        planFeatures: {
          "plan-1": {
            enabled: true,
            limits: { maxUsers: 10, maxStorage: 1000 },
          },
        },
      });
      const response = await PUT(request, { params: Promise.resolve({ id: "flag-1" }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("should accept empty planFeatures object", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin-1", email: "admin@example.com" },
        expires: new Date().toISOString(),
      });
      vi.mocked(db.query.users.findFirst).mockResolvedValue({
        id: "admin-1",
        role: "admin",
        email: "admin@example.com",
      });
      vi.mocked(db.query.featureFlags.findFirst).mockResolvedValue({
        id: "flag-1",
        key: "test_feature",
        name: "Test Feature",
      });

      const request = createRequest({ planFeatures: {} });
      const response = await PUT(request, { params: Promise.resolve({ id: "flag-1" }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });
});
