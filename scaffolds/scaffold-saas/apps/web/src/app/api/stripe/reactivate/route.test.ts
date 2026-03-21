// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock auth-utils
vi.mock("@/lib/auth-utils", () => ({
  requireAuth: vi.fn(),
}));

// Mock database
vi.mock("@scaffold-saas/database/client", () => ({
  db: {
    query: {
      subscriptions: { findFirst: vi.fn() },
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
  subscriptions: {
    tenantId: "tenant_id",
    id: "id",
  },
}));

import { POST } from "./route";
import { requireAuth } from "@/lib/auth-utils";
import { db } from "@scaffold-saas/database/client";

const mockSubscription = {
  id: "sub-1",
  tenantId: "tenant-1",
  stripeSubscriptionId: "sub_stripe123",
  status: "active",
  cancelAtPeriodEnd: true,
};

describe("Stripe Reactivate route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/stripe/reactivate - Authorization", () => {
    it("should return 500 when not authenticated", async () => {
      vi.mocked(requireAuth).mockRejectedValue(new Error("Unauthorized"));

      const response = await POST();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal error");
    });

    it("should return 400 when no active team", async () => {
      vi.mocked(requireAuth).mockResolvedValue({
        user: { id: "user-1", tenantId: null },
      } as never);

      const response = await POST();
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("No active team");
    });
  });

  describe("POST /api/stripe/reactivate - Validation", () => {
    it("should return 500 when Stripe is not configured", async () => {
      vi.mocked(requireAuth).mockResolvedValue({
        user: { id: "user-1", tenantId: "tenant-1" },
      } as never);

      const response = await POST();
      const data = await response.json();

      // Without STRIPE_SECRET_KEY, route returns "Stripe not configured"
      expect(response.status).toBe(500);
      expect(data.error).toBe("Stripe not configured");
    });
  });

  // Note: Additional validation tests would require Stripe to be configured.
  // The route checks in this order:
  // 1. Auth - requireAuth()
  // 2. TenantId exists
  // 3. Stripe is configured
  // 4. Subscription exists with stripeSubscriptionId
  // 5. cancelAtPeriodEnd is true
  // 6. Call Stripe API to remove cancellation
  // 7. Update local database
});
