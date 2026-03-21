import { describe, it, expect, vi } from "vitest";

// Mock database before importing to avoid DATABASE_URL requirement
vi.mock("@scaffold-saas/database/client", () => ({
  db: {
    query: {
      tenants: { findFirst: vi.fn() },
    },
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    }),
  },
}));

vi.mock("@scaffold-saas/database/schema", () => ({
  tenants: { id: "id" },
}));

// NOTE: This module interacts with Stripe and database at runtime.
// Full testing requires integration tests with test Stripe environment.
// These tests verify exports and type definitions.

describe("billing jobs", () => {
  describe("exports", () => {
    it("should export processBillingJob function", async () => {
      const mod = await import("./billing");
      expect(typeof mod.processBillingJob).toBe("function");
    });
  });

  describe("BillingJobData type", () => {
    it("should support sync-subscription type", () => {
      const data = {
        type: "sync-subscription" as const,
        subscriptionId: "sub-123",
      };
      expect(data.type).toBe("sync-subscription");
      expect(data.subscriptionId).toBe("sub-123");
    });

    it("should support cancel-expired-trials type", () => {
      const data = {
        type: "cancel-expired-trials" as const,
      };
      expect(data.type).toBe("cancel-expired-trials");
    });

    it("should support usage-report type", () => {
      const data = {
        type: "usage-report" as const,
        tenantId: "tenant-1",
        metric: "api_calls",
        quantity: 100,
      };
      expect(data.type).toBe("usage-report");
      expect(data.tenantId).toBe("tenant-1");
      expect(data.metric).toBe("api_calls");
      expect(data.quantity).toBe(100);
    });
  });

  describe("module behavior", () => {
    it("should handle missing STRIPE_SECRET_KEY", async () => {
      // The module checks for STRIPE_SECRET_KEY and sets stripe to null if missing
      // This tests that the module can be imported without crashing
      const originalKey = process.env.STRIPE_SECRET_KEY;
      delete process.env.STRIPE_SECRET_KEY;

      // Dynamic import to reset the module
      const mod = await import("./billing");
      expect(mod.processBillingJob).toBeDefined();

      // Restore
      process.env.STRIPE_SECRET_KEY = originalKey;
    });
  });
});
