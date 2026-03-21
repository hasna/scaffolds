// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock auth
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

// Mock database
vi.mock("@scaffold-social/database/client", () => ({
  db: {
    query: {
      subscriptions: { findFirst: vi.fn() },
      featureFlags: { findMany: vi.fn() },
      planFeatures: { findMany: vi.fn() },
      tenantFeatureOverrides: { findMany: vi.fn() },
    },
  },
}));

// Mock schema
vi.mock("@scaffold-social/database/schema", () => ({
  subscriptions: {
    tenantId: "tenant_id",
    status: "status",
  },
  planFeatures: {
    planId: "plan_id",
  },
  tenantFeatureOverrides: {
    tenantId: "tenant_id",
  },
}));

import { GET } from "./route";
import { auth } from "@/lib/auth";
import { db } from "@scaffold-social/database/client";

const mockFlags = [
  {
    id: "flag-1",
    key: "api_keys",
    name: "API Keys",
    defaultEnabled: false,
  },
  {
    id: "flag-2",
    key: "webhooks",
    name: "Webhooks",
    defaultEnabled: false,
  },
  {
    id: "flag-3",
    key: "assistant",
    name: "AI Assistant",
    defaultEnabled: true,
  },
];

const mockSubscription = {
  id: "sub-1",
  tenantId: "tenant-1",
  planId: "plan-pro",
  status: "active",
  plan: {
    id: "plan-pro",
    name: "Pro",
  },
};

const mockPlanFeatures = [
  {
    id: "pf-1",
    planId: "plan-pro",
    featureFlagId: "flag-1",
    enabled: true,
    limits: { max: 10 },
  },
  {
    id: "pf-2",
    planId: "plan-pro",
    featureFlagId: "flag-2",
    enabled: true,
    limits: { max: 5 },
  },
];

const mockTenantOverrides = [
  {
    id: "override-1",
    tenantId: "tenant-1",
    featureFlagId: "flag-1",
    enabled: true,
    limits: { max: 100 }, // Override the plan limit
    expiresAt: null,
  },
];

describe("Feature Flags route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/v1/feature-flags - Authorization", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null as any);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 401 when session has no user", async () => {
      vi.mocked(auth).mockResolvedValue({ user: null } as never);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 400 when no tenant", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", tenantId: null },
      } as never);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("No tenant");
    });
  });

  describe("GET /api/v1/feature-flags - Default values", () => {
    it("should return default flag values when no subscription", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", tenantId: "tenant-1" },
      } as never);
      vi.mocked(db.query.subscriptions.findFirst).mockResolvedValue(null);
      vi.mocked(db.query.featureFlags.findMany).mockResolvedValue(mockFlags);
      vi.mocked(db.query.planFeatures.findMany).mockResolvedValue([]);
      vi.mocked(db.query.tenantFeatureOverrides.findMany).mockResolvedValue([]);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(3);

      // Check default values
      const apiKeys = data.data.find((f: { key: string }) => f.key === "api_keys");
      expect(apiKeys.enabled).toBe(false); // defaultEnabled = false

      const assistant = data.data.find((f: { key: string }) => f.key === "assistant");
      expect(assistant.enabled).toBe(true); // defaultEnabled = true
    });

    it("should return empty array when no flags exist", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", tenantId: "tenant-1" },
      } as never);
      vi.mocked(db.query.subscriptions.findFirst).mockResolvedValue(null);
      vi.mocked(db.query.featureFlags.findMany).mockResolvedValue([]);
      vi.mocked(db.query.planFeatures.findMany).mockResolvedValue([]);
      vi.mocked(db.query.tenantFeatureOverrides.findMany).mockResolvedValue([]);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(0);
    });
  });

  describe("GET /api/v1/feature-flags - Plan features", () => {
    it("should apply plan features when subscription exists", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", tenantId: "tenant-1" },
      } as never);
      vi.mocked(db.query.subscriptions.findFirst).mockResolvedValue(mockSubscription);
      vi.mocked(db.query.featureFlags.findMany).mockResolvedValue(mockFlags);
      vi.mocked(db.query.planFeatures.findMany).mockResolvedValue(mockPlanFeatures);
      vi.mocked(db.query.tenantFeatureOverrides.findMany).mockResolvedValue([]);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);

      // Check plan features are applied
      const apiKeys = data.data.find((f: { key: string }) => f.key === "api_keys");
      expect(apiKeys.enabled).toBe(true); // From plan feature
      expect(apiKeys.limits).toEqual({ max: 10 });

      const webhooks = data.data.find((f: { key: string }) => f.key === "webhooks");
      expect(webhooks.enabled).toBe(true); // From plan feature
      expect(webhooks.limits).toEqual({ max: 5 });

      // Assistant should use default (no plan feature for it)
      const assistant = data.data.find((f: { key: string }) => f.key === "assistant");
      expect(assistant.enabled).toBe(true); // defaultEnabled
      expect(assistant.limits).toBeUndefined();
    });
  });

  describe("GET /api/v1/feature-flags - Tenant overrides", () => {
    it("should apply tenant overrides over plan features", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", tenantId: "tenant-1" },
      } as never);
      vi.mocked(db.query.subscriptions.findFirst).mockResolvedValue(mockSubscription);
      vi.mocked(db.query.featureFlags.findMany).mockResolvedValue(mockFlags);
      vi.mocked(db.query.planFeatures.findMany).mockResolvedValue(mockPlanFeatures);
      vi.mocked(db.query.tenantFeatureOverrides.findMany).mockResolvedValue(mockTenantOverrides);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);

      // API keys should use tenant override
      const apiKeys = data.data.find((f: { key: string }) => f.key === "api_keys");
      expect(apiKeys.enabled).toBe(true);
      expect(apiKeys.limits).toEqual({ max: 100 }); // Override value, not plan value (10)
    });

    it("should ignore expired tenant overrides", async () => {
      const expiredOverride = {
        ...mockTenantOverrides[0],
        expiresAt: new Date("2020-01-01"), // Expired
      };

      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", tenantId: "tenant-1" },
      } as never);
      vi.mocked(db.query.subscriptions.findFirst).mockResolvedValue(mockSubscription);
      vi.mocked(db.query.featureFlags.findMany).mockResolvedValue(mockFlags);
      vi.mocked(db.query.planFeatures.findMany).mockResolvedValue(mockPlanFeatures);
      vi.mocked(db.query.tenantFeatureOverrides.findMany).mockResolvedValue([expiredOverride]);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);

      // API keys should fall back to plan feature (override expired)
      const apiKeys = data.data.find((f: { key: string }) => f.key === "api_keys");
      expect(apiKeys.limits).toEqual({ max: 10 }); // Plan value, not override (100)
    });

    it("should apply non-expired override with future expiry", async () => {
      const futureOverride = {
        ...mockTenantOverrides[0],
        expiresAt: new Date("2030-01-01"), // Future date
      };

      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", tenantId: "tenant-1" },
      } as never);
      vi.mocked(db.query.subscriptions.findFirst).mockResolvedValue(mockSubscription);
      vi.mocked(db.query.featureFlags.findMany).mockResolvedValue(mockFlags);
      vi.mocked(db.query.planFeatures.findMany).mockResolvedValue(mockPlanFeatures);
      vi.mocked(db.query.tenantFeatureOverrides.findMany).mockResolvedValue([futureOverride]);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);

      // API keys should use override (not expired)
      const apiKeys = data.data.find((f: { key: string }) => f.key === "api_keys");
      expect(apiKeys.limits).toEqual({ max: 100 }); // Override value
    });
  });

  describe("GET /api/v1/feature-flags - Response format", () => {
    it("should return flags with correct structure", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", tenantId: "tenant-1" },
      } as never);
      vi.mocked(db.query.subscriptions.findFirst).mockResolvedValue(null);
      vi.mocked(db.query.featureFlags.findMany).mockResolvedValue(mockFlags);
      vi.mocked(db.query.planFeatures.findMany).mockResolvedValue([]);
      vi.mocked(db.query.tenantFeatureOverrides.findMany).mockResolvedValue([]);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);

      // Check structure
      const flag = data.data[0];
      expect(flag).toHaveProperty("key");
      expect(flag).toHaveProperty("name");
      expect(flag).toHaveProperty("enabled");
    });
  });

  describe("Error handling", () => {
    it("should return 500 on internal error", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", tenantId: "tenant-1" },
      } as never);
      vi.mocked(db.query.subscriptions.findFirst).mockRejectedValue(
        new Error("Database error")
      );

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal error");
    });
  });
});
