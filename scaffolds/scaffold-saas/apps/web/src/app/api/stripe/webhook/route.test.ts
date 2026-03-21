// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock next/headers
vi.mock("next/headers", () => ({
  headers: vi.fn(),
}));

// Mock stripe lib
vi.mock("@/lib/stripe", () => ({
  stripe: {
    webhooks: {
      constructEvent: vi.fn(),
    },
    subscriptions: {
      retrieve: vi.fn(),
    },
  },
  syncSubscription: vi.fn(),
}));

// Mock database
vi.mock("@scaffold-saas/database/client", () => ({
  db: {
    query: {
      tenants: { findFirst: vi.fn() },
      pricingPlans: { findFirst: vi.fn() },
    },
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(),
    })),
  },
}));

// Mock schema
vi.mock("@scaffold-saas/database/schema", () => ({
  subscriptions: {
    tenantId: "tenant_id",
  },
  tenants: {
    id: "id",
    stripeCustomerId: "stripe_customer_id",
  },
  pricingPlans: {
    slug: "slug",
  },
  invoices: {},
}));

import { POST } from "./route";
import { headers } from "next/headers";
import { stripe, syncSubscription } from "@/lib/stripe";
import { db } from "@scaffold-saas/database/client";

function createRequest(body: string): Request {
  return new Request("http://localhost:3000/api/stripe/webhook", {
    method: "POST",
    body,
    headers: { "Content-Type": "application/json" },
  });
}

describe("Stripe Webhook route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/stripe/webhook - Validation", () => {
    it("should return 400 when no signature header", async () => {
      vi.mocked(headers).mockResolvedValue({
        get: vi.fn().mockReturnValue(null),
      } as never);

      const request = createRequest("{}");
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("No signature");
    });

    it("should return 400 when signature verification fails", async () => {
      vi.mocked(headers).mockResolvedValue({
        get: vi.fn().mockReturnValue("invalid_signature"),
      } as never);
      vi.mocked(stripe.webhooks.constructEvent).mockImplementation(() => {
        throw new Error("Invalid signature");
      });

      const request = createRequest("{}");
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid signature");
    });
  });

  describe("POST /api/stripe/webhook - Event handling", () => {
    it("should handle checkout.session.completed event", async () => {
      vi.mocked(headers).mockResolvedValue({
        get: vi.fn().mockReturnValue("valid_signature"),
      } as never);
      vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
        type: "checkout.session.completed",
        data: {
          object: {
            subscription: "sub_123",
          },
        },
      });
      vi.mocked(stripe.subscriptions.retrieve).mockResolvedValue({
        id: "sub_123",
        status: "active",
      });

      const request = createRequest("{}");
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);
      expect(vi.mocked(stripe.subscriptions.retrieve)).toHaveBeenCalledWith("sub_123");
      expect(syncSubscription).toHaveBeenCalled();
    });

    it("should handle customer.subscription.created event", async () => {
      vi.mocked(headers).mockResolvedValue({
        get: vi.fn().mockReturnValue("valid_signature"),
      } as never);
      vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
        type: "customer.subscription.created",
        data: {
          object: {
            id: "sub_123",
            status: "active",
          },
        },
      });

      const request = createRequest("{}");
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);
      expect(syncSubscription).toHaveBeenCalled();
    });

    it("should handle customer.subscription.updated event", async () => {
      vi.mocked(headers).mockResolvedValue({
        get: vi.fn().mockReturnValue("valid_signature"),
      } as never);
      vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
        type: "customer.subscription.updated",
        data: {
          object: {
            id: "sub_123",
            status: "active",
          },
        },
      });

      const request = createRequest("{}");
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);
      expect(syncSubscription).toHaveBeenCalled();
    });

    it("should handle customer.subscription.deleted event", async () => {
      vi.mocked(headers).mockResolvedValue({
        get: vi.fn().mockReturnValue("valid_signature"),
      } as never);
      vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
        type: "customer.subscription.deleted",
        data: {
          object: {
            id: "sub_123",
            metadata: { tenantId: "tenant-1" },
          },
        },
      });
      vi.mocked(db.query.pricingPlans.findFirst).mockResolvedValue({
        id: "free-plan",
        slug: "free",
      });

      const mockWhere = vi.fn();
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      vi.mocked(db.update).mockReturnValue({ set: mockSet } as never);

      const request = createRequest("{}");
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);
      expect(db.update).toHaveBeenCalled();
    });

    it("should handle invoice.paid event", async () => {
      vi.mocked(headers).mockResolvedValue({
        get: vi.fn().mockReturnValue("valid_signature"),
      } as never);
      vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
        type: "invoice.paid",
        data: {
          object: {
            id: "inv_123",
            customer: "cus_123",
            amount_paid: 1000,
            currency: "usd",
            invoice_pdf: "https://stripe.com/pdf",
            hosted_invoice_url: "https://stripe.com/invoice",
          },
        },
      });
      vi.mocked(db.query.tenants.findFirst).mockResolvedValue({
        id: "tenant-1",
        stripeCustomerId: "cus_123",
      });

      const mockValues = vi.fn();
      vi.mocked(db.insert).mockReturnValue({ values: mockValues } as never);

      const request = createRequest("{}");
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);
      expect(db.insert).toHaveBeenCalled();
    });

    it("should handle invoice.payment_failed event", async () => {
      vi.mocked(headers).mockResolvedValue({
        get: vi.fn().mockReturnValue("valid_signature"),
      } as never);
      vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
        type: "invoice.payment_failed",
        data: {
          object: {
            id: "inv_123",
            customer: "cus_123",
          },
        },
      });
      vi.mocked(db.query.tenants.findFirst).mockResolvedValue({
        id: "tenant-1",
        stripeCustomerId: "cus_123",
      });

      const mockWhere = vi.fn();
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      vi.mocked(db.update).mockReturnValue({ set: mockSet } as never);

      const request = createRequest("{}");
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);
      expect(db.update).toHaveBeenCalled();
    });

    it("should return success for unknown event types", async () => {
      vi.mocked(headers).mockResolvedValue({
        get: vi.fn().mockReturnValue("valid_signature"),
      } as never);
      vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
        type: "unknown.event.type",
        data: { object: {} },
      });

      const request = createRequest("{}");
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);
    });
  });

  describe("Error handling", () => {
    it("should return 500 on handler error", async () => {
      vi.mocked(headers).mockResolvedValue({
        get: vi.fn().mockReturnValue("valid_signature"),
      } as never);
      vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
        type: "customer.subscription.created",
        data: { object: {} },
      });
      vi.mocked(syncSubscription).mockRejectedValue(new Error("Sync error"));

      const request = createRequest("{}");
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Webhook handler failed");
    });
  });
});
