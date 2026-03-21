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

describe("Stripe Cancel route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/stripe/cancel - Authorization", () => {
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

  // Note: Stripe is initialized at module load time.
  // When STRIPE_SECRET_KEY is not set (test environment),
  // the route returns "Stripe not configured" for any request
  // that passes the auth and tenantId checks.
  describe("POST /api/stripe/cancel - Stripe configuration", () => {
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
});
