// @ts-nocheck
import { describe, it, expect, vi, beforeAll } from "vitest";

// Mock Stripe before any imports to prevent API key validation error
vi.mock("stripe", () => ({
  default: vi.fn().mockImplementation(() => ({
    customers: { create: vi.fn(), retrieve: vi.fn() },
    checkout: { sessions: { create: vi.fn() } },
    billingPortal: { sessions: { create: vi.fn() } },
    subscriptions: { retrieve: vi.fn(), update: vi.fn(), cancel: vi.fn() },
    invoices: { list: vi.fn() },
    products: { list: vi.fn() },
    prices: { list: vi.fn() },
  })),
}));

vi.mock("@scaffold-landing-pages/database/client", () => ({
  db: {
    query: {
      tenants: { findFirst: vi.fn() },
      plans: { findMany: vi.fn() },
      subscriptions: { findFirst: vi.fn() },
    },
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    }),
  },
}));

vi.mock("@scaffold-landing-pages/database/schema", () => ({
  tenants: { id: "id" },
  plans: { id: "id" },
  subscriptions: { id: "id" },
}));

// NOTE: This module interacts with Stripe SDK and database.
// Unit testing is limited due to Stripe instance being created at module load time.
// Full testing requires integration tests with Stripe test environment.

describe("stripe", () => {
  describe("exports", () => {
    it("should export stripe instance", async () => {
      // Dynamically import to avoid module initialization issues
      const mod = await import("./stripe");
      expect(mod.stripe).toBeDefined();
    });

    it("should export createStripeCustomer function", async () => {
      const mod = await import("./stripe");
      expect(typeof mod.createStripeCustomer).toBe("function");
    });

    it("should export getOrCreateStripeCustomer function", async () => {
      const mod = await import("./stripe");
      expect(typeof mod.getOrCreateStripeCustomer).toBe("function");
    });

    it("should export createCheckoutSession function", async () => {
      const mod = await import("./stripe");
      expect(typeof mod.createCheckoutSession).toBe("function");
    });

    it("should export createBillingPortalSession function", async () => {
      const mod = await import("./stripe");
      expect(typeof mod.createBillingPortalSession).toBe("function");
    });

    it("should export getSubscription function", async () => {
      const mod = await import("./stripe");
      expect(typeof mod.getSubscription).toBe("function");
    });

    it("should export syncSubscription function", async () => {
      const mod = await import("./stripe");
      expect(typeof mod.syncSubscription).toBe("function");
    });

    it("should export cancelSubscription function", async () => {
      const mod = await import("./stripe");
      expect(typeof mod.cancelSubscription).toBe("function");
    });

    it("should export reactivateSubscription function", async () => {
      const mod = await import("./stripe");
      expect(typeof mod.reactivateSubscription).toBe("function");
    });

    it("should export getPricingPlans function", async () => {
      const mod = await import("./stripe");
      expect(typeof mod.getPricingPlans).toBe("function");
    });

    it("should export getInvoices function", async () => {
      const mod = await import("./stripe");
      expect(typeof mod.getInvoices).toBe("function");
    });
  });

  describe("stripe instance configuration", () => {
    it("should have Stripe SDK methods available", async () => {
      const mod = await import("./stripe");
      // Check that the stripe instance has expected API namespaces
      expect(mod.stripe.customers).toBeDefined();
      expect(mod.stripe.checkout).toBeDefined();
      expect(mod.stripe.billingPortal).toBeDefined();
      expect(mod.stripe.subscriptions).toBeDefined();
      expect(mod.stripe.invoices).toBeDefined();
    });
  });

  describe("Invoice type", () => {
    it("should export Invoice type", async () => {
      // This test verifies the module compiles correctly with the type export
      const mod = await import("./stripe");
      // Invoice is a type, so we just verify the module loads
      expect(mod).toBeDefined();
    });
  });
});
