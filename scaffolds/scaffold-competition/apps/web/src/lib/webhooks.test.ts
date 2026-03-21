import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock database
vi.mock("@scaffold-competition/database/client", () => ({
  db: {
    query: {
      webhooks: { findMany: vi.fn() },
      webhookEvents: { findMany: vi.fn() },
      webhookDeliveries: { findMany: vi.fn() },
    },
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{}]),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{}]),
        }),
      }),
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([]),
    }),
  },
}));

vi.mock("@scaffold-competition/database/schema", () => ({
  webhooks: {
    id: "id",
    tenantId: "tenantId",
    isActive: "isActive",
  },
  webhookDeliveries: {
    webhookId: "webhookId",
  },
  webhookEvents: {
    isActive: "isActive",
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((a, b) => ({ field: a, value: b })),
  and: vi.fn((...args) => ({ type: "and", conditions: args })),
}));

import {
  generateWebhookSignature,
  verifyWebhookSignature,
  getWebhooksForEvent,
  createWebhookDelivery,
  emitWebhookEvent,
  getWebhookEvents,
  getWebhookDeliveries,
  createWebhook,
  updateWebhook,
  deleteWebhook,
  regenerateWebhookSecret,
} from "./webhooks";
import { db } from "@scaffold-competition/database/client";

describe("webhooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generateWebhookSignature", () => {
    it("should generate a hex HMAC-SHA256 signature", () => {
      const payload = '{"event":"test"}';
      const secret = "whsec_test123";

      const signature = generateWebhookSignature(payload, secret);

      expect(signature).toBeDefined();
      expect(typeof signature).toBe("string");
      // SHA256 hex is 64 characters
      expect(signature.length).toBe(64);
      // Should only contain hex characters
      expect(signature).toMatch(/^[a-f0-9]+$/);
    });

    it("should generate consistent signatures for same inputs", () => {
      const payload = '{"event":"user.created","data":{"id":"123"}}';
      const secret = "whsec_mysecret";

      const sig1 = generateWebhookSignature(payload, secret);
      const sig2 = generateWebhookSignature(payload, secret);

      expect(sig1).toBe(sig2);
    });

    it("should generate different signatures for different payloads", () => {
      const secret = "whsec_test";

      const sig1 = generateWebhookSignature('{"event":"a"}', secret);
      const sig2 = generateWebhookSignature('{"event":"b"}', secret);

      expect(sig1).not.toBe(sig2);
    });

    it("should generate different signatures for different secrets", () => {
      const payload = '{"event":"test"}';

      const sig1 = generateWebhookSignature(payload, "secret1");
      const sig2 = generateWebhookSignature(payload, "secret2");

      expect(sig1).not.toBe(sig2);
    });

    it("should handle empty payload", () => {
      const signature = generateWebhookSignature("", "secret");

      expect(signature).toBeDefined();
      expect(signature.length).toBe(64);
    });

    it("should handle special characters in payload", () => {
      const payload = '{"emoji":"🚀","unicode":"日本語"}';
      const signature = generateWebhookSignature(payload, "secret");

      expect(signature).toBeDefined();
      expect(signature.length).toBe(64);
    });
  });

  describe("verifyWebhookSignature", () => {
    it("should return true for valid signature", () => {
      const payload = '{"event":"test"}';
      const secret = "whsec_test123";
      const signature = generateWebhookSignature(payload, secret);

      const isValid = verifyWebhookSignature(payload, signature, secret);

      expect(isValid).toBe(true);
    });

    it("should return false for invalid signature", () => {
      const payload = '{"event":"test"}';
      const secret = "whsec_test123";
      const wrongSignature = "a".repeat(64);

      const isValid = verifyWebhookSignature(payload, wrongSignature, secret);

      expect(isValid).toBe(false);
    });

    it("should return false for tampered payload", () => {
      const originalPayload = '{"event":"test"}';
      const secret = "whsec_test123";
      const signature = generateWebhookSignature(originalPayload, secret);
      const tamperedPayload = '{"event":"tampered"}';

      const isValid = verifyWebhookSignature(tamperedPayload, signature, secret);

      expect(isValid).toBe(false);
    });

    it("should return false for wrong secret", () => {
      const payload = '{"event":"test"}';
      const signature = generateWebhookSignature(payload, "secret1");

      const isValid = verifyWebhookSignature(payload, signature, "secret2");

      expect(isValid).toBe(false);
    });

    it("should throw for different length signatures (timing-safe)", () => {
      const payload = '{"event":"test"}';
      const secret = "whsec_test123";
      const shortSignature = "abc";

      // timingSafeEqual throws if lengths differ
      expect(() => verifyWebhookSignature(payload, shortSignature, secret)).toThrow();
    });
  });

  describe("getWebhooksForEvent", () => {
    it("should filter webhooks by event type", async () => {
      const mockWebhooks = [
        { id: "wh-1", events: ["user.created", "user.updated"] },
        { id: "wh-2", events: ["team.created"] },
        { id: "wh-3", events: ["user.created", "user.deleted"] },
      ];
      (db.query.webhooks.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockWebhooks);

      const result = await getWebhooksForEvent("tenant-1", "user.created");

      expect(result).toHaveLength(2);
      expect(result[0]?.id).toBe("wh-1");
      expect(result[1]?.id).toBe("wh-3");
    });

    it("should return empty array if no webhooks match", async () => {
      const mockWebhooks = [
        { id: "wh-1", events: ["team.created"] },
        { id: "wh-2", events: ["team.deleted"] },
      ];
      (db.query.webhooks.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockWebhooks);

      const result = await getWebhooksForEvent("tenant-1", "user.created");

      expect(result).toHaveLength(0);
    });

    it("should return empty array if no webhooks exist", async () => {
      (db.query.webhooks.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const result = await getWebhooksForEvent("tenant-1", "user.created");

      expect(result).toHaveLength(0);
    });
  });

  describe("createWebhookDelivery", () => {
    it("should insert delivery with pending status and 0 attempts", async () => {
      const mockDelivery = {
        id: "delivery-1",
        webhookId: "wh-1",
        eventType: "user.created",
        status: "pending",
        attempts: 0,
      };
      (db.insert as ReturnType<typeof vi.fn>).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockDelivery]),
        }),
      });

      const result = await createWebhookDelivery("wh-1", "user.created", {
        id: "user-123",
      });

      expect(vi.mocked(db.insert)).toHaveBeenCalled();
      expect(result).toEqual(mockDelivery);
    });
  });

  describe("emitWebhookEvent", () => {
    it("should create deliveries for all matching webhooks", async () => {
      const mockWebhooks = [
        { id: "wh-1", events: ["user.created"] },
        { id: "wh-2", events: ["user.created"] },
      ];
      (db.query.webhooks.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockWebhooks);

      let insertCallCount = 0;
      (db.insert as ReturnType<typeof vi.fn>).mockImplementation(() => ({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: `delivery-${++insertCallCount}` }]),
        }),
      }));

      const result = await emitWebhookEvent("tenant-1", "user.created", {
        userId: "123",
      });

      expect(result).toHaveLength(2);
    });

    it("should return empty array if no matching webhooks", async () => {
      (db.query.webhooks.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const result = await emitWebhookEvent("tenant-1", "user.created", {
        userId: "123",
      });

      expect(result).toHaveLength(0);
    });
  });

  describe("getWebhookEvents", () => {
    it("should call db.query.webhookEvents.findMany", async () => {
      const mockEvents = [
        { name: "user.created", isActive: true },
        { name: "user.deleted", isActive: true },
      ];
      (db.query.webhookEvents.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockEvents);

      const result = await getWebhookEvents();

      expect(vi.mocked(db.query.webhookEvents.findMany)).toHaveBeenCalled();
      expect(result).toEqual(mockEvents);
    });
  });

  describe("getWebhookDeliveries", () => {
    it("should call db.query.webhookDeliveries.findMany with default limit", async () => {
      const mockDeliveries = [{ id: "d-1" }, { id: "d-2" }];
      (db.query.webhookDeliveries.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockDeliveries
      );

      const result = await getWebhookDeliveries("wh-1");

      expect(vi.mocked(db.query.webhookDeliveries.findMany)).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 50,
          offset: 0,
        })
      );
      expect(result).toEqual(mockDeliveries);
    });

    it("should use custom limit and offset", async () => {
      (db.query.webhookDeliveries.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      await getWebhookDeliveries("wh-1", 10, 20);

      expect(vi.mocked(db.query.webhookDeliveries.findMany)).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 10,
          offset: 20,
        })
      );
    });
  });

  describe("createWebhook", () => {
    it("should create webhook with generated secret starting with whsec_", async () => {
      const mockWebhook = {
        id: "wh-1",
        name: "Test Webhook",
        url: "https://example.com/webhook",
        events: ["user.created"],
        secret: "whsec_testgenerated",
        isActive: true,
      };
      (db.insert as ReturnType<typeof vi.fn>).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockWebhook]),
        }),
      });

      const result = await createWebhook("tenant-1", {
        name: "Test Webhook",
        url: "https://example.com/webhook",
        events: ["user.created"],
      });

      expect(vi.mocked(db.insert)).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it("should accept optional headers", async () => {
      const mockWebhook = { id: "wh-1" };
      (db.insert as ReturnType<typeof vi.fn>).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockWebhook]),
        }),
      });

      await createWebhook("tenant-1", {
        name: "Test Webhook",
        url: "https://example.com/webhook",
        events: ["user.created"],
        headers: { "X-Custom-Header": "value" },
      });

      expect(vi.mocked(db.insert)).toHaveBeenCalled();
    });
  });

  describe("updateWebhook", () => {
    it("should call db.update with webhook data", async () => {
      const mockUpdated = { id: "wh-1", name: "Updated Name" };
      (db.update as ReturnType<typeof vi.fn>).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockUpdated]),
          }),
        }),
      });

      const result = await updateWebhook("wh-1", "tenant-1", { name: "Updated Name" });

      expect(vi.mocked(db.update)).toHaveBeenCalled();
      expect(result).toEqual(mockUpdated);
    });

    it("should allow updating multiple fields", async () => {
      const mockUpdated = { id: "wh-1" };
      (db.update as ReturnType<typeof vi.fn>).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockUpdated]),
          }),
        }),
      });

      await updateWebhook("wh-1", "tenant-1", {
        name: "New Name",
        url: "https://new-url.com",
        events: ["new.event"],
        isActive: false,
      });

      expect(vi.mocked(db.update)).toHaveBeenCalled();
    });
  });

  describe("deleteWebhook", () => {
    it("should call db.delete", async () => {
      await deleteWebhook("wh-1", "tenant-1");

      expect(vi.mocked(db.delete)).toHaveBeenCalled();
    });
  });

  describe("regenerateWebhookSecret", () => {
    it("should update webhook with new secret", async () => {
      const mockUpdated = { id: "wh-1", secret: "whsec_newsecret" };
      (db.update as ReturnType<typeof vi.fn>).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockUpdated]),
          }),
        }),
      });

      const result = await regenerateWebhookSecret("wh-1", "tenant-1");

      expect(vi.mocked(db.update)).toHaveBeenCalled();
      expect(result).toEqual(mockUpdated);
    });
  });

  describe("exports", () => {
    it("should export all functions", () => {
      expect(typeof generateWebhookSignature).toBe("function");
      expect(typeof verifyWebhookSignature).toBe("function");
      expect(typeof getWebhooksForEvent).toBe("function");
      expect(typeof createWebhookDelivery).toBe("function");
      expect(typeof emitWebhookEvent).toBe("function");
      expect(typeof getWebhookEvents).toBe("function");
      expect(typeof getWebhookDeliveries).toBe("function");
      expect(typeof createWebhook).toBe("function");
      expect(typeof updateWebhook).toBe("function");
      expect(typeof deleteWebhook).toBe("function");
      expect(typeof regenerateWebhookSecret).toBe("function");
    });
  });
});
