// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock auth
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

// Mock database
vi.mock("@scaffold-review/database/client", () => ({
  db: {
    query: {
      subscriptions: { findFirst: vi.fn() },
    },
  },
}));

// Mock schema
vi.mock("@scaffold-review/database/schema", () => ({
  subscriptions: {
    tenantId: "tenant_id",
  },
}));

import { GET } from "./route";
import { auth } from "@/lib/auth";
import { db } from "@scaffold-review/database/client";

const mockSubscription = {
  id: "sub-1",
  tenantId: "tenant-1",
  status: "active",
  stripeSubscriptionId: "sub_abc123",
  currentPeriodStart: new Date("2024-01-01"),
  currentPeriodEnd: new Date("2024-02-01"),
  plan: {
    id: "plan-pro",
    name: "Pro",
    priceMonthly: 2999,
    priceYearly: 29999,
  },
};

describe("Billing Subscription route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/v1/billing/subscription - Authorization", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null as any);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 400 when no tenant", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" },
        expires: new Date().toISOString(),
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("No tenant");
    });
  });

  describe("GET /api/v1/billing/subscription - Happy paths", () => {
    it("should return null when no subscription exists", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "user-1",
          email: "test@example.com",
          tenantId: "tenant-1",
        },
        expires: new Date().toISOString(),
      });
      vi.mocked(db.query.subscriptions.findFirst).mockResolvedValue(null);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toBeNull();
    });

    it("should return subscription with plan details", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "user-1",
          email: "test@example.com",
          tenantId: "tenant-1",
        },
        expires: new Date().toISOString(),
      });
      vi.mocked(db.query.subscriptions.findFirst).mockResolvedValue(
        mockSubscription
      );

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.id).toBe("sub-1");
      expect(data.data.status).toBe("active");
      expect(data.data.plan).toEqual({
        id: "plan-pro",
        name: "Pro",
        priceMonthly: 2999,
        priceYearly: 29999,
      });
    });

    it("should return subscription without plan if plan is null", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "user-1",
          email: "test@example.com",
          tenantId: "tenant-1",
        },
        expires: new Date().toISOString(),
      });
      vi.mocked(db.query.subscriptions.findFirst).mockResolvedValue({
        ...mockSubscription,
        plan: null,
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.id).toBe("sub-1");
      expect(data.data.plan).toBeNull();
    });

    it("should include period dates in response", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "user-1",
          email: "test@example.com",
          tenantId: "tenant-1",
        },
        expires: new Date().toISOString(),
      });
      vi.mocked(db.query.subscriptions.findFirst).mockResolvedValue(
        mockSubscription
      );

      const response = await GET();
      const data = await response.json();

      expect(data.data.currentPeriodStart).toBeDefined();
      expect(data.data.currentPeriodEnd).toBeDefined();
    });
  });

  describe("GET /api/v1/billing/subscription - Various statuses", () => {
    const statuses = ["active", "past_due", "canceled", "trialing"];

    for (const status of statuses) {
      it(`should return subscription with ${status} status`, async () => {
        vi.mocked(auth).mockResolvedValue({
          user: {
            id: "user-1",
            email: "test@example.com",
            tenantId: "tenant-1",
          },
          expires: new Date().toISOString(),
        });
        vi.mocked(db.query.subscriptions.findFirst).mockResolvedValue({
          ...mockSubscription,
          status,
        });

        const response = await GET();
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.data.status).toBe(status);
      });
    }
  });

  describe("Error handling", () => {
    it("should return 500 on internal error", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "user-1",
          email: "test@example.com",
          tenantId: "tenant-1",
        },
        expires: new Date().toISOString(),
      });
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
