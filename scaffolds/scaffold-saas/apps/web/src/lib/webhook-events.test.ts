// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock database
vi.mock("@scaffold-saas/database/client", () => ({
  db: {
    query: {
      webhooks: { findMany: vi.fn() },
    },
    insert: vi.fn(() => ({
      values: vi.fn(),
    })),
  },
}));

// Mock schema
vi.mock("@scaffold-saas/database/schema", () => ({
  webhooks: {
    tenantId: "tenant_id",
  },
  webhookDeliveries: {},
}));

import { db } from "@scaffold-saas/database/client";
import {
  emitWebhookEvent,
  emitUserCreated,
  emitUserUpdated,
  emitUserDeleted,
  emitTeamMemberAdded,
  emitTeamMemberRemoved,
  emitSubscriptionCreated,
  emitSubscriptionUpdated,
  emitSubscriptionCanceled,
  emitInvoicePaid,
  emitInvoicePaymentFailed,
} from "./webhook-events";

const mockWebhooks = [
  {
    id: "webhook-1",
    tenantId: "tenant-1",
    url: "https://example.com/webhook",
    events: ["user.created", "user.updated", "user.deleted"],
    isActive: true,
  },
  {
    id: "webhook-2",
    tenantId: "tenant-1",
    url: "https://example2.com/webhook",
    events: ["subscription.created", "subscription.updated"],
    isActive: true,
  },
  {
    id: "webhook-3",
    tenantId: "tenant-1",
    url: "https://inactive.com/webhook",
    events: ["user.created"],
    isActive: false,
  },
];

describe("webhook-events", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("emitWebhookEvent", () => {
    it("should not create deliveries when no webhooks exist", async () => {
      vi.mocked(db.query.webhooks.findMany).mockResolvedValue([]);

      await emitWebhookEvent("tenant-1", "user.created", { userId: "user-1" });

      expect(db.insert).not.toHaveBeenCalled();
    });

    it("should not create deliveries when no webhooks subscribe to the event", async () => {
      vi.mocked(db.query.webhooks.findMany).mockResolvedValue(mockWebhooks);

      await emitWebhookEvent("tenant-1", "team.deleted", { teamId: "team-1" });

      expect(db.insert).not.toHaveBeenCalled();
    });

    it("should not create deliveries for inactive webhooks", async () => {
      vi.mocked(db.query.webhooks.findMany).mockResolvedValue([mockWebhooks[2]]);

      await emitWebhookEvent("tenant-1", "user.created", { userId: "user-1" });

      expect(db.insert).not.toHaveBeenCalled();
    });

    it("should create delivery for subscribed active webhook", async () => {
      vi.mocked(db.query.webhooks.findMany).mockResolvedValue([mockWebhooks[0]]);
      const mockValues = vi.fn();
      vi.mocked(db.insert).mockReturnValue({ values: mockValues } as never);

      await emitWebhookEvent("tenant-1", "user.created", { userId: "user-1" });

      expect(db.insert).toHaveBeenCalled();
      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          webhookId: "webhook-1",
          eventType: "user.created",
          status: "pending",
        })
      );
    });

    it("should create multiple deliveries for multiple subscribed webhooks", async () => {
      vi.mocked(db.query.webhooks.findMany).mockResolvedValue([
        { ...mockWebhooks[0], events: ["user.created"] },
        {
          id: "webhook-4",
          tenantId: "tenant-1",
          url: "https://other.com/webhook",
          events: ["user.created"],
          isActive: true,
        },
      ]);
      const mockValues = vi.fn();
      vi.mocked(db.insert).mockReturnValue({ values: mockValues } as never);

      await emitWebhookEvent("tenant-1", "user.created", { userId: "user-1" });

      expect(db.insert).toHaveBeenCalledTimes(2);
    });
  });

  describe("user events", () => {
    beforeEach(() => {
      vi.mocked(db.query.webhooks.findMany).mockResolvedValue([mockWebhooks[0]]);
      const mockValues = vi.fn();
      vi.mocked(db.insert).mockReturnValue({ values: mockValues } as never);
    });

    it("should emit user.created event", async () => {
      await emitUserCreated("tenant-1", {
        id: "user-1",
        email: "test@test.com",
        name: "Test User",
      });

      expect(db.insert).toHaveBeenCalled();
    });

    it("should emit user.updated event", async () => {
      await emitUserUpdated(
        "tenant-1",
        { id: "user-1", email: "test@test.com", name: "Test User" },
        ["name", "email"]
      );

      expect(db.insert).toHaveBeenCalled();
    });

    it("should emit user.deleted event", async () => {
      await emitUserDeleted("tenant-1", "user-1");

      expect(db.insert).toHaveBeenCalled();
    });
  });

  describe("team events", () => {
    beforeEach(() => {
      vi.mocked(db.query.webhooks.findMany).mockResolvedValue([
        { ...mockWebhooks[0], events: ["team.member_added", "team.member_removed"] },
      ]);
      const mockValues = vi.fn();
      vi.mocked(db.insert).mockReturnValue({ values: mockValues } as never);
    });

    it("should emit team.member_added event", async () => {
      await emitTeamMemberAdded("tenant-1", {
        userId: "user-1",
        email: "test@test.com",
        role: "member",
      });

      expect(db.insert).toHaveBeenCalled();
    });

    it("should emit team.member_removed event", async () => {
      await emitTeamMemberRemoved("tenant-1", "user-1", "test@test.com");

      expect(db.insert).toHaveBeenCalled();
    });
  });

  describe("subscription events", () => {
    beforeEach(() => {
      vi.mocked(db.query.webhooks.findMany).mockResolvedValue([mockWebhooks[1]]);
      const mockValues = vi.fn();
      vi.mocked(db.insert).mockReturnValue({ values: mockValues } as never);
    });

    it("should emit subscription.created event", async () => {
      await emitSubscriptionCreated("tenant-1", {
        id: "sub-1",
        planId: "plan-pro",
        status: "active",
      });

      expect(db.insert).toHaveBeenCalled();
    });

    it("should emit subscription.updated event", async () => {
      await emitSubscriptionUpdated(
        "tenant-1",
        { id: "sub-1", planId: "plan-pro", status: "active" },
        ["planId"]
      );

      expect(db.insert).toHaveBeenCalled();
    });

    it("should emit subscription.canceled event", async () => {
      vi.mocked(db.query.webhooks.findMany).mockResolvedValue([
        { ...mockWebhooks[1], events: ["subscription.canceled"] },
      ]);

      await emitSubscriptionCanceled("tenant-1", "sub-1");

      expect(db.insert).toHaveBeenCalled();
    });
  });

  describe("invoice events", () => {
    beforeEach(() => {
      vi.mocked(db.query.webhooks.findMany).mockResolvedValue([
        {
          id: "webhook-5",
          tenantId: "tenant-1",
          url: "https://billing.com/webhook",
          events: ["invoice.paid", "invoice.payment_failed"],
          isActive: true,
        },
      ]);
      const mockValues = vi.fn();
      vi.mocked(db.insert).mockReturnValue({ values: mockValues } as never);
    });

    it("should emit invoice.paid event", async () => {
      await emitInvoicePaid("tenant-1", {
        id: "inv-1",
        amount: 1000,
        currency: "usd",
      });

      expect(db.insert).toHaveBeenCalled();
    });

    it("should emit invoice.payment_failed event", async () => {
      await emitInvoicePaymentFailed(
        "tenant-1",
        { id: "inv-1", amount: 1000, currency: "usd" },
        "Card declined"
      );

      expect(db.insert).toHaveBeenCalled();
    });
  });
});
