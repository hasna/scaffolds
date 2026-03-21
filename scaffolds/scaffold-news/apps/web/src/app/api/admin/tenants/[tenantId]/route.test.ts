// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock auth
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

// Mock database
vi.mock("@scaffold-news/database/client", () => {
  return {
    db: {
      query: {
        tenants: {
          findFirst: vi.fn(),
        },
        webhooks: {
          findMany: vi.fn(),
        },
        assistantThreads: {
          findMany: vi.fn(),
        },
      },
      delete: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve()),
      })),
    },
  };
});

// Mock schema
vi.mock("@scaffold-news/database/schema", () => ({
  tenants: { id: "id" },
  webhooks: { tenantId: "tenant_id" },
  webhookDeliveries: { webhookId: "webhook_id" },
  assistantThreads: { tenantId: "tenant_id" },
  assistantMessages: { threadId: "thread_id" },
  assistantUsage: { tenantId: "tenant_id" },
  assistantConfig: { tenantId: "tenant_id" },
  invoices: { tenantId: "tenant_id" },
  subscriptions: { tenantId: "tenant_id" },
  teamInvitations: { tenantId: "tenant_id" },
  teamMembers: { tenantId: "tenant_id" },
  apiKeys: { tenantId: "tenant_id" },
  auditLogs: { tenantId: "tenant_id" },
}));

import { DELETE } from "./route";
import { auth } from "@/lib/auth";
import { db } from "@scaffold-news/database/client";

function createRequest(): Request {
  return new Request("http://localhost:3000/api/admin/tenants/tenant-1", {
    method: "DELETE",
  });
}

describe("Admin tenants [tenantId] route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock return values
    vi.mocked(db.query.webhooks.findMany).mockResolvedValue([]);
    vi.mocked(db.query.assistantThreads.findMany).mockResolvedValue([]);
  });

  describe("DELETE /api/admin/tenants/[tenantId] - Authorization", () => {
    it("should return 403 when user is not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null as any);

      const request = createRequest();
      const response = await DELETE(request, { params: Promise.resolve({ tenantId: "tenant-1" }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });

    it("should return 403 when session has no user id", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "", email: "test@example.com", role: "admin" },
        expires: new Date().toISOString(),
      });

      const request = createRequest();
      const response = await DELETE(request, { params: Promise.resolve({ tenantId: "tenant-1" }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });

    it("should return 403 when user is not an admin", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", email: "user@example.com", role: "user" },
        expires: new Date().toISOString(),
      });

      const request = createRequest();
      const response = await DELETE(request, { params: Promise.resolve({ tenantId: "tenant-1" }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });

    it("should return 403 for super_admin (only admin role allowed)", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "super-1", email: "super@example.com", role: "super_admin" },
        expires: new Date().toISOString(),
      });

      const request = createRequest();
      const response = await DELETE(request, { params: Promise.resolve({ tenantId: "tenant-1" }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });
  });

  describe("DELETE /api/admin/tenants/[tenantId] - Tenant validation", () => {
    it("should return 404 when tenant does not exist", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin-1", email: "admin@example.com", role: "admin" },
        expires: new Date().toISOString(),
      });
      vi.mocked(db.query.tenants.findFirst).mockResolvedValue(undefined);

      const request = createRequest();
      const response = await DELETE(request, { params: Promise.resolve({ tenantId: "nonexistent" }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Tenant not found");
    });
  });

  describe("DELETE /api/admin/tenants/[tenantId] - Happy paths", () => {
    it("should delete tenant and all related data successfully", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin-1", email: "admin@example.com", role: "admin" },
        expires: new Date().toISOString(),
      });
      vi.mocked(db.query.tenants.findFirst).mockResolvedValue({
        id: "tenant-1",
        name: "Test Tenant",
        slug: "test-tenant",
      });
      vi.mocked(db.query.webhooks.findMany).mockResolvedValue([]);
      vi.mocked(db.query.assistantThreads.findMany).mockResolvedValue([]);

      const request = createRequest();
      const response = await DELETE(request, { params: Promise.resolve({ tenantId: "tenant-1" }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(db.delete).toHaveBeenCalled();
    });

    it("should delete webhook deliveries when webhooks exist", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin-1", email: "admin@example.com", role: "admin" },
        expires: new Date().toISOString(),
      });
      vi.mocked(db.query.tenants.findFirst).mockResolvedValue({
        id: "tenant-1",
        name: "Test Tenant",
        slug: "test-tenant",
      });
      vi.mocked(db.query.webhooks.findMany).mockResolvedValue([
        { id: "webhook-1" },
        { id: "webhook-2" },
      ]);
      vi.mocked(db.query.assistantThreads.findMany).mockResolvedValue([]);

      const request = createRequest();
      const response = await DELETE(request, { params: Promise.resolve({ tenantId: "tenant-1" }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("should delete assistant messages when threads exist", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin-1", email: "admin@example.com", role: "admin" },
        expires: new Date().toISOString(),
      });
      vi.mocked(db.query.tenants.findFirst).mockResolvedValue({
        id: "tenant-1",
        name: "Test Tenant",
        slug: "test-tenant",
      });
      vi.mocked(db.query.webhooks.findMany).mockResolvedValue([]);
      vi.mocked(db.query.assistantThreads.findMany).mockResolvedValue([
        { id: "thread-1" },
        { id: "thread-2" },
      ]);

      const request = createRequest();
      const response = await DELETE(request, { params: Promise.resolve({ tenantId: "tenant-1" }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe("DELETE /api/admin/tenants/[tenantId] - Error handling", () => {
    it("should return 500 on internal error", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin-1", email: "admin@example.com", role: "admin" },
        expires: new Date().toISOString(),
      });
      vi.mocked(db.query.tenants.findFirst).mockRejectedValue(new Error("Database error"));

      const request = createRequest();
      const response = await DELETE(request, { params: Promise.resolve({ tenantId: "tenant-1" }) });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal error");
    });
  });
});
