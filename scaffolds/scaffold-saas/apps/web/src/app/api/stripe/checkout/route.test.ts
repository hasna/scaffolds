// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock auth
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

// Mock stripe lib functions
vi.mock("@/lib/stripe", () => ({
  getOrCreateStripeCustomer: vi.fn(),
  createCheckoutSession: vi.fn(),
}));

// Mock database
vi.mock("@scaffold-saas/database/client", () => ({
  db: {
    query: {
      pricingPlans: { findFirst: vi.fn() },
    },
  },
}));

// Mock schema
vi.mock("@scaffold-saas/database/schema", () => ({
  pricingPlans: {
    slug: "slug",
  },
}));

import { GET } from "./route";
import { auth } from "@/lib/auth";
import { db } from "@scaffold-saas/database/client";
import { getOrCreateStripeCustomer, createCheckoutSession } from "@/lib/stripe";

function createRequest(params: Record<string, string> = {}): Request {
  const url = new URL("http://localhost:5900/api/stripe/checkout");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new Request(url.toString(), { method: "GET" });
}

const mockPlan = {
  id: "plan-1",
  slug: "pro",
  name: "Pro",
  stripePriceIdMonthly: "price_monthly_123",
  stripePriceIdYearly: "price_yearly_123",
};

describe("Stripe Checkout route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/stripe/checkout - Authorization", () => {
    it("should redirect to login when not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null as any);

      const request = createRequest({ plan: "pro" });
      const response = await GET(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("Location")).toContain("/login");
    });

    it("should redirect to onboarding when no tenant", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", tenantId: null },
      } as never);

      const request = createRequest({ plan: "pro" });
      const response = await GET(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("Location")).toContain("/onboarding");
    });
  });

  describe("GET /api/stripe/checkout - Validation", () => {
    it("should redirect to pricing when no plan specified", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", tenantId: "tenant-1", email: "user@test.com" },
      } as never);

      const request = createRequest({});
      const response = await GET(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("Location")).toContain("/pricing?error=no-plan");
    });

    it("should redirect to pricing when plan not found", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", tenantId: "tenant-1", email: "user@test.com" },
      } as never);
      vi.mocked(db.query.pricingPlans.findFirst).mockResolvedValue(null);

      const request = createRequest({ plan: "invalid" });
      const response = await GET(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("Location")).toContain("/pricing?error=invalid-plan");
    });

    it("should redirect to pricing when plan has no price ID", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", tenantId: "tenant-1", email: "user@test.com" },
      } as never);
      vi.mocked(db.query.pricingPlans.findFirst).mockResolvedValue({
        ...mockPlan,
        stripePriceIdMonthly: null,
        stripePriceIdYearly: null,
      });

      const request = createRequest({ plan: "pro" });
      const response = await GET(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("Location")).toContain("/pricing?error=no-price");
    });
  });

  describe("GET /api/stripe/checkout - Happy paths", () => {
    it("should create checkout session and redirect", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", tenantId: "tenant-1", email: "user@test.com", name: "Test User" },
      } as never);
      vi.mocked(db.query.pricingPlans.findFirst).mockResolvedValue(mockPlan);
      vi.mocked(getOrCreateStripeCustomer).mockResolvedValue({ id: "cus_123" } as never);
      vi.mocked(createCheckoutSession).mockResolvedValue({
        url: "https://checkout.stripe.com/session_123",
      } as never);

      const request = createRequest({ plan: "pro" });
      const response = await GET(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("Location")).toBe("https://checkout.stripe.com/session_123");
    });

    it("should use yearly price when interval is yearly", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", tenantId: "tenant-1", email: "user@test.com" },
      } as never);
      vi.mocked(db.query.pricingPlans.findFirst).mockResolvedValue(mockPlan);
      vi.mocked(getOrCreateStripeCustomer).mockResolvedValue({ id: "cus_123" } as never);
      vi.mocked(createCheckoutSession).mockResolvedValue({
        url: "https://checkout.stripe.com/session_123",
      } as never);

      const request = createRequest({ plan: "pro", interval: "yearly" });
      await GET(request);

      expect(createCheckoutSession).toHaveBeenCalledWith(
        "tenant-1",
        "price_yearly_123",
        expect.any(String),
        expect.any(String),
        "cus_123"
      );
    });

    it("should redirect to pricing error when checkout session has no URL", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", tenantId: "tenant-1", email: "user@test.com" },
      } as never);
      vi.mocked(db.query.pricingPlans.findFirst).mockResolvedValue(mockPlan);
      vi.mocked(getOrCreateStripeCustomer).mockResolvedValue({ id: "cus_123" } as never);
      vi.mocked(createCheckoutSession).mockResolvedValue({ url: null } as never);

      const request = createRequest({ plan: "pro" });
      const response = await GET(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("Location")).toContain("/pricing?error=checkout-failed");
    });
  });

  describe("Error handling", () => {
    it("should redirect to pricing error on exception", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", tenantId: "tenant-1", email: "user@test.com" },
      } as never);
      vi.mocked(db.query.pricingPlans.findFirst).mockRejectedValue(new Error("Database error"));

      const request = createRequest({ plan: "pro" });
      const response = await GET(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("Location")).toContain("/pricing?error=checkout-failed");
    });
  });
});
