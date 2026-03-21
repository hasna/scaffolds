// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock auth
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

// Mock tenant lib
vi.mock("@/lib/tenant", () => ({
  getTenant: vi.fn(),
}));

// Mock stripe lib functions
vi.mock("@/lib/stripe", () => ({
  createBillingPortalSession: vi.fn(),
}));

import { POST } from "./route";
import { auth } from "@/lib/auth";
import { getTenant } from "@/lib/tenant";
import { createBillingPortalSession } from "@/lib/stripe";

describe("Stripe Portal route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/stripe/portal - Authorization", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null as any);

      const response = await POST();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 401 when session has no user", async () => {
      vi.mocked(auth).mockResolvedValue({ user: null } as never);

      const response = await POST();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 400 when no tenant", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", tenantId: null },
      } as never);

      const response = await POST();
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("No tenant");
    });
  });

  describe("POST /api/stripe/portal - Validation", () => {
    it("should return 400 when tenant has no Stripe customer ID", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", tenantId: "tenant-1" },
      } as never);
      vi.mocked(getTenant).mockResolvedValue({
        id: "tenant-1",
        stripeCustomerId: null,
      });

      const response = await POST();
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("No customer");
    });

    it("should return 400 when tenant not found", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", tenantId: "tenant-1" },
      } as never);
      vi.mocked(getTenant).mockResolvedValue(null);

      const response = await POST();
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("No customer");
    });
  });

  describe("POST /api/stripe/portal - Happy paths", () => {
    it("should return portal URL successfully", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", tenantId: "tenant-1" },
      } as never);
      vi.mocked(getTenant).mockResolvedValue({
        id: "tenant-1",
        stripeCustomerId: "cus_123",
      });
      vi.mocked(createBillingPortalSession).mockResolvedValue({
        url: "https://billing.stripe.com/portal_123",
      } as never);

      const response = await POST();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.url).toBe("https://billing.stripe.com/portal_123");
    });
  });

  describe("Error handling", () => {
    it("should return 500 on internal error", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", tenantId: "tenant-1" },
      } as never);
      vi.mocked(getTenant).mockRejectedValue(new Error("Database error"));

      const response = await POST();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to create portal");
    });

    it("should return 500 on Stripe error", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", tenantId: "tenant-1" },
      } as never);
      vi.mocked(getTenant).mockResolvedValue({
        id: "tenant-1",
        stripeCustomerId: "cus_123",
      });
      vi.mocked(createBillingPortalSession).mockRejectedValue(new Error("Stripe error"));

      const response = await POST();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to create portal");
    });
  });
});
