// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock auth
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

// Mock webhooks
vi.mock("@/lib/webhooks", () => ({
  updateWebhook: vi.fn(),
  deleteWebhook: vi.fn(),
}));

import { PATCH, DELETE } from "./route";
import { auth } from "@/lib/auth";
import { updateWebhook, deleteWebhook } from "@/lib/webhooks";

function createRequest(
  method: string,
  body?: unknown
): Request {
  const url = new URL("http://localhost:3000/api/v1/webhooks/webhook-1");
  return new Request(url.toString(), {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { "Content-Type": "application/json" } : undefined,
  });
}

const mockWebhook = {
  id: "webhook-1",
  tenantId: "tenant-1",
  name: "Test Webhook",
  url: "https://example.com/webhook",
  events: ["user.created", "user.updated"],
  headers: { "X-Custom-Header": "value" },
  isActive: true,
  createdAt: new Date("2024-01-01"),
};

describe("Webhooks [webhookId] route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("PATCH /api/v1/webhooks/[webhookId] - Authorization", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null as any);

      const request = createRequest("PATCH", { name: "Updated Name" });
      const response = await PATCH(request, {
        params: Promise.resolve({ webhookId: "webhook-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 400 when no tenant", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" },
        expires: new Date().toISOString(),
      });

      const request = createRequest("PATCH", { name: "Updated Name" });
      const response = await PATCH(request, {
        params: Promise.resolve({ webhookId: "webhook-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("No tenant");
    });

    it("should return 403 when not owner or manager", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "user-1",
          email: "test@example.com",
          tenantId: "tenant-1",
          tenantRole: "member",
        },
        expires: new Date().toISOString(),
      });

      const request = createRequest("PATCH", { name: "Updated Name" });
      const response = await PATCH(request, {
        params: Promise.resolve({ webhookId: "webhook-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });
  });

  describe("PATCH /api/v1/webhooks/[webhookId] - Validation", () => {
    it("should return 400 for invalid URL", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "user-1",
          email: "test@example.com",
          tenantId: "tenant-1",
          tenantRole: "owner",
        },
        expires: new Date().toISOString(),
      });

      const request = createRequest("PATCH", { url: "not-a-valid-url" });
      const response = await PATCH(request, {
        params: Promise.resolve({ webhookId: "webhook-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid input");
    });

    it("should return 400 for empty events array", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "user-1",
          email: "test@example.com",
          tenantId: "tenant-1",
          tenantRole: "owner",
        },
        expires: new Date().toISOString(),
      });

      const request = createRequest("PATCH", { events: [] });
      const response = await PATCH(request, {
        params: Promise.resolve({ webhookId: "webhook-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid input");
    });

    it("should return 400 for short name", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "user-1",
          email: "test@example.com",
          tenantId: "tenant-1",
          tenantRole: "owner",
        },
        expires: new Date().toISOString(),
      });

      const request = createRequest("PATCH", { name: "A" });
      const response = await PATCH(request, {
        params: Promise.resolve({ webhookId: "webhook-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid input");
    });

    it("should return 404 when webhook not found", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "user-1",
          email: "test@example.com",
          tenantId: "tenant-1",
          tenantRole: "owner",
        },
        expires: new Date().toISOString(),
      });
      vi.mocked(updateWebhook).mockResolvedValue(null);

      const request = createRequest("PATCH", { name: "Updated Name" });
      const response = await PATCH(request, {
        params: Promise.resolve({ webhookId: "non-existent" }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Webhook not found");
    });
  });

  describe("PATCH /api/v1/webhooks/[webhookId] - Happy paths", () => {
    it("should update webhook name successfully", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "user-1",
          email: "test@example.com",
          tenantId: "tenant-1",
          tenantRole: "owner",
        },
        expires: new Date().toISOString(),
      });
      vi.mocked(updateWebhook).mockResolvedValue({
        ...mockWebhook,
        name: "Updated Name",
      } as never);

      const request = createRequest("PATCH", { name: "Updated Name" });
      const response = await PATCH(request, {
        params: Promise.resolve({ webhookId: "webhook-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.name).toBe("Updated Name");
    });

    it("should update webhook URL", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "user-1",
          email: "test@example.com",
          tenantId: "tenant-1",
          tenantRole: "owner",
        },
        expires: new Date().toISOString(),
      });
      vi.mocked(updateWebhook).mockResolvedValue({
        ...mockWebhook,
        url: "https://new-url.com/webhook",
      } as never);

      const request = createRequest("PATCH", {
        url: "https://new-url.com/webhook",
      });
      const response = await PATCH(request, {
        params: Promise.resolve({ webhookId: "webhook-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.url).toBe("https://new-url.com/webhook");
    });

    it("should update webhook events", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "user-1",
          email: "test@example.com",
          tenantId: "tenant-1",
          tenantRole: "owner",
        },
        expires: new Date().toISOString(),
      });
      vi.mocked(updateWebhook).mockResolvedValue({
        ...mockWebhook,
        events: ["user.deleted"],
      } as never);

      const request = createRequest("PATCH", { events: ["user.deleted"] });
      const response = await PATCH(request, {
        params: Promise.resolve({ webhookId: "webhook-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.events).toEqual(["user.deleted"]);
    });

    it("should toggle webhook active status", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "user-1",
          email: "test@example.com",
          tenantId: "tenant-1",
          tenantRole: "owner",
        },
        expires: new Date().toISOString(),
      });
      vi.mocked(updateWebhook).mockResolvedValue({
        ...mockWebhook,
        isActive: false,
      } as never);

      const request = createRequest("PATCH", { isActive: false });
      const response = await PATCH(request, {
        params: Promise.resolve({ webhookId: "webhook-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.isActive).toBe(false);
    });

    it("should allow manager to update webhook", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "user-2",
          email: "manager@example.com",
          tenantId: "tenant-1",
          tenantRole: "manager",
        },
        expires: new Date().toISOString(),
      });
      vi.mocked(updateWebhook).mockResolvedValue({
        ...mockWebhook,
        name: "Manager Updated",
      } as never);

      const request = createRequest("PATCH", { name: "Manager Updated" });
      const response = await PATCH(request, {
        params: Promise.resolve({ webhookId: "webhook-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.name).toBe("Manager Updated");
    });
  });

  describe("DELETE /api/v1/webhooks/[webhookId] - Authorization", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null as any);

      const request = createRequest("DELETE");
      const response = await DELETE(request, {
        params: Promise.resolve({ webhookId: "webhook-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 400 when no tenant", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" },
        expires: new Date().toISOString(),
      });

      const request = createRequest("DELETE");
      const response = await DELETE(request, {
        params: Promise.resolve({ webhookId: "webhook-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("No tenant");
    });

    it("should return 403 when not owner or manager", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "user-1",
          email: "test@example.com",
          tenantId: "tenant-1",
          tenantRole: "member",
        },
        expires: new Date().toISOString(),
      });

      const request = createRequest("DELETE");
      const response = await DELETE(request, {
        params: Promise.resolve({ webhookId: "webhook-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });
  });

  describe("DELETE /api/v1/webhooks/[webhookId] - Happy paths", () => {
    it("should delete webhook successfully as owner", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "user-1",
          email: "test@example.com",
          tenantId: "tenant-1",
          tenantRole: "owner",
        },
        expires: new Date().toISOString(),
      });
      vi.mocked(deleteWebhook).mockResolvedValue(undefined);

      const request = createRequest("DELETE");
      const response = await DELETE(request, {
        params: Promise.resolve({ webhookId: "webhook-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(deleteWebhook).toHaveBeenCalledWith("webhook-1", "tenant-1");
    });

    it("should allow manager to delete webhook", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "user-2",
          email: "manager@example.com",
          tenantId: "tenant-1",
          tenantRole: "manager",
        },
        expires: new Date().toISOString(),
      });
      vi.mocked(deleteWebhook).mockResolvedValue(undefined);

      const request = createRequest("DELETE");
      const response = await DELETE(request, {
        params: Promise.resolve({ webhookId: "webhook-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe("Error handling", () => {
    it("PATCH should return 500 on internal error", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "user-1",
          email: "test@example.com",
          tenantId: "tenant-1",
          tenantRole: "owner",
        },
        expires: new Date().toISOString(),
      });
      vi.mocked(updateWebhook).mockRejectedValue(new Error("Database error"));

      const request = createRequest("PATCH", { name: "Updated Name" });
      const response = await PATCH(request, {
        params: Promise.resolve({ webhookId: "webhook-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal error");
    });

    it("DELETE should return 500 on internal error", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "user-1",
          email: "test@example.com",
          tenantId: "tenant-1",
          tenantRole: "owner",
        },
        expires: new Date().toISOString(),
      });
      vi.mocked(deleteWebhook).mockRejectedValue(new Error("Database error"));

      const request = createRequest("DELETE");
      const response = await DELETE(request, {
        params: Promise.resolve({ webhookId: "webhook-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal error");
    });
  });
});
