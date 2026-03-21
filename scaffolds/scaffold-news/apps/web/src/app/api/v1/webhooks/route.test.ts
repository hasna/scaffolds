// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock auth
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

// Mock webhooks
vi.mock("@/lib/webhooks", () => ({
  createWebhook: vi.fn(),
}));

// Mock tenant
vi.mock("@/lib/tenant", () => ({
  checkWebhookLimit: vi.fn(),
}));

// Mock database
vi.mock("@scaffold-news/database/client", () => ({
  db: {
    query: {
      webhooks: { findMany: vi.fn() },
    },
  },
}));

// Mock schema
vi.mock("@scaffold-news/database/schema", () => ({
  webhooks: {
    tenantId: "tenant_id",
    createdAt: "created_at",
    name: "name",
    isActive: "is_active",
  },
}));

import { GET, POST } from "./route";
import { auth } from "@/lib/auth";
import { createWebhook } from "@/lib/webhooks";
import { checkWebhookLimit } from "@/lib/tenant";
import { db } from "@scaffold-news/database/client";

function createRequest(
  method: string,
  body?: unknown,
  searchParams?: Record<string, string>
): Request {
  const url = new URL("http://localhost:3000/api/v1/webhooks");
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }
  return new Request(url.toString(), {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { "Content-Type": "application/json" } : undefined,
  });
}

const mockWebhooks = [
  {
    id: "webhook-1",
    tenantId: "tenant-1",
    name: "Test Webhook 1",
    url: "https://example.com/webhook1",
    events: ["user.created"],
    secret: "whsec_test123456789abcdef",
    headers: {},
    isActive: true,
    createdAt: new Date("2024-01-15"),
  },
  {
    id: "webhook-2",
    tenantId: "tenant-1",
    name: "Test Webhook 2",
    url: "https://example.com/webhook2",
    events: ["user.updated"],
    secret: "whsec_test987654321fedcba",
    headers: {},
    isActive: false,
    createdAt: new Date("2024-01-01"),
  },
];

describe("Webhooks route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/v1/webhooks - Authorization", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null as any);

      const request = createRequest("GET");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error.code).toBe("UNAUTHORIZED");
    });

    it("should return 400 when no tenant", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" },
        expires: new Date().toISOString(),
      });

      const request = createRequest("GET");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe("NO_TENANT");
    });
  });

  describe("GET /api/v1/webhooks - Happy paths", () => {
    it("should return list of webhooks", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "user-1",
          email: "test@example.com",
          tenantId: "tenant-1",
          tenantRole: "owner",
        },
        expires: new Date().toISOString(),
      });
      vi.mocked(db.query.webhooks.findMany).mockResolvedValue(mockWebhooks);

      const request = createRequest("GET");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(2);
      expect(data.data[0].name).toBe("Test Webhook 1");
    });

    it("should hide webhook secrets", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "user-1",
          email: "test@example.com",
          tenantId: "tenant-1",
          tenantRole: "owner",
        },
        expires: new Date().toISOString(),
      });
      vi.mocked(db.query.webhooks.findMany).mockResolvedValue(mockWebhooks);

      const request = createRequest("GET");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data[0].secret).toContain("...");
      expect(data.data[0].secret).not.toBe("whsec_test123456789abcdef");
    });

    it("should return empty array when no webhooks", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "user-1",
          email: "test@example.com",
          tenantId: "tenant-1",
          tenantRole: "member",
        },
        expires: new Date().toISOString(),
      });
      vi.mocked(db.query.webhooks.findMany).mockResolvedValue([]);

      const request = createRequest("GET");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(0);
    });

    it("should return 500 on internal error", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "user-1",
          email: "test@example.com",
          tenantId: "tenant-1",
          tenantRole: "owner",
        },
        expires: new Date().toISOString(),
      });
      vi.mocked(db.query.webhooks.findMany).mockRejectedValue(
        new Error("Database error")
      );

      const request = createRequest("GET");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error.code).toBe("INTERNAL_ERROR");
    });
  });

  describe("POST /api/v1/webhooks - Authorization", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null as any);

      const request = createRequest("POST", {
        name: "New Webhook",
        url: "https://example.com/webhook",
        events: ["user.created"],
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error.code).toBe("UNAUTHORIZED");
    });

    it("should return 400 when no tenant", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" },
        expires: new Date().toISOString(),
      });

      const request = createRequest("POST", {
        name: "New Webhook",
        url: "https://example.com/webhook",
        events: ["user.created"],
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe("NO_TENANT");
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

      const request = createRequest("POST", {
        name: "New Webhook",
        url: "https://example.com/webhook",
        events: ["user.created"],
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error.code).toBe("FORBIDDEN");
    });
  });

  describe("POST /api/v1/webhooks - Validation", () => {
    it("should return 400 for missing name", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "user-1",
          email: "test@example.com",
          tenantId: "tenant-1",
          tenantRole: "owner",
        },
        expires: new Date().toISOString(),
      });

      const request = createRequest("POST", {
        url: "https://example.com/webhook",
        events: ["user.created"],
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe("VALIDATION_ERROR");
    });

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

      const request = createRequest("POST", {
        name: "New Webhook",
        url: "not-a-valid-url",
        events: ["user.created"],
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe("VALIDATION_ERROR");
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

      const request = createRequest("POST", {
        name: "New Webhook",
        url: "https://example.com/webhook",
        events: [],
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe("VALIDATION_ERROR");
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

      const request = createRequest("POST", {
        name: "A",
        url: "https://example.com/webhook",
        events: ["user.created"],
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("POST /api/v1/webhooks - Limits", () => {
    it("should return 403 when webhook limit reached", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "user-1",
          email: "test@example.com",
          tenantId: "tenant-1",
          tenantRole: "owner",
        },
        expires: new Date().toISOString(),
      });
      vi.mocked(checkWebhookLimit).mockResolvedValue({
        allowed: false,
        current: 5,
        limit: 5,
      });

      const request = createRequest("POST", {
        name: "New Webhook",
        url: "https://example.com/webhook",
        events: ["user.created"],
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error.code).toBe("UPGRADE_REQUIRED");
      expect(data.error.details.current).toBe(5);
      expect(data.error.details.limit).toBe(5);
    });
  });

  describe("POST /api/v1/webhooks - Happy paths", () => {
    it("should create webhook successfully", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "user-1",
          email: "test@example.com",
          tenantId: "tenant-1",
          tenantRole: "owner",
        },
        expires: new Date().toISOString(),
      });
      vi.mocked(checkWebhookLimit).mockResolvedValue({
        allowed: true,
        current: 2,
        limit: 10,
      });

      const newWebhook = {
        id: "webhook-new",
        tenantId: "tenant-1",
        name: "New Webhook",
        url: "https://example.com/webhook",
        events: ["user.created"],
        secret: "whsec_newwebhook",
        isActive: true,
      };

      vi.mocked(createWebhook).mockResolvedValue(newWebhook as never);

      const request = createRequest("POST", {
        name: "New Webhook",
        url: "https://example.com/webhook",
        events: ["user.created"],
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data.id).toBe("webhook-new");
      expect(data.data.name).toBe("New Webhook");
    });

    it("should accept optional headers", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "user-1",
          email: "test@example.com",
          tenantId: "tenant-1",
          tenantRole: "owner",
        },
        expires: new Date().toISOString(),
      });
      vi.mocked(checkWebhookLimit).mockResolvedValue({
        allowed: true,
        current: 0,
        limit: 10,
      });

      const newWebhook = {
        id: "webhook-new",
        tenantId: "tenant-1",
        name: "New Webhook",
        url: "https://example.com/webhook",
        events: ["user.created"],
        headers: { "X-Custom": "value" },
        secret: "whsec_newwebhook",
        isActive: true,
      };

      vi.mocked(createWebhook).mockResolvedValue(newWebhook as never);

      const request = createRequest("POST", {
        name: "New Webhook",
        url: "https://example.com/webhook",
        events: ["user.created"],
        headers: { "X-Custom": "value" },
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data.headers).toEqual({ "X-Custom": "value" });
    });

    it("should allow manager to create webhook", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "user-2",
          email: "manager@example.com",
          tenantId: "tenant-1",
          tenantRole: "manager",
        },
        expires: new Date().toISOString(),
      });
      vi.mocked(checkWebhookLimit).mockResolvedValue({
        allowed: true,
        current: 1,
        limit: 10,
      });

      const newWebhook = {
        id: "webhook-new",
        tenantId: "tenant-1",
        name: "Manager Webhook",
        url: "https://example.com/webhook",
        events: ["user.created"],
        secret: "whsec_newwebhook",
        isActive: true,
      };

      vi.mocked(createWebhook).mockResolvedValue(newWebhook as never);

      const request = createRequest("POST", {
        name: "Manager Webhook",
        url: "https://example.com/webhook",
        events: ["user.created"],
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data.name).toBe("Manager Webhook");
    });
  });

  describe("Error handling", () => {
    it("POST should return 500 on internal error", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "user-1",
          email: "test@example.com",
          tenantId: "tenant-1",
          tenantRole: "owner",
        },
        expires: new Date().toISOString(),
      });
      vi.mocked(checkWebhookLimit).mockRejectedValue(new Error("Database error"));

      const request = createRequest("POST", {
        name: "New Webhook",
        url: "https://example.com/webhook",
        events: ["user.created"],
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error.code).toBe("INTERNAL_ERROR");
    });
  });
});
