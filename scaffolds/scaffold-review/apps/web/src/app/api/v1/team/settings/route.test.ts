// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock api-context
vi.mock("@/lib/api-context", () => ({
  getApiContext: vi.fn(),
  hasTenantAdminAccess: vi.fn(),
}));

// Mock database
vi.mock("@scaffold-review/database/client", () => ({
  db: {
    query: {
      tenants: { findFirst: vi.fn() },
    },
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(),
        })),
      })),
    })),
  },
}));

// Mock schema
vi.mock("@scaffold-review/database/schema", () => ({
  tenants: {
    id: "id",
    slug: "slug",
    updatedAt: "updated_at",
  },
}));

import { GET, PATCH } from "./route";
import { getApiContext, hasTenantAdminAccess } from "@/lib/api-context";
import { db } from "@scaffold-review/database/client";
import { NextRequest } from "next/server";

function createRequest(
  method: string,
  body?: unknown
): NextRequest {
  const url = new URL("http://localhost:3000/api/v1/team/settings");
  return new NextRequest(url.toString(), {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { "Content-Type": "application/json" } : undefined,
  });
}

const mockTenant = {
  id: "tenant-1",
  name: "Test Tenant",
  slug: "test-tenant",
  stripeCustomerId: null,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

describe("Team Settings route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/v1/team/settings - Authorization", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getApiContext).mockResolvedValue({
        success: false,
        error: "Unauthorized",
        status: 401,
      });

      const request = createRequest("GET");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 400 when no tenant", async () => {
      vi.mocked(getApiContext).mockResolvedValue({
        success: false,
        error: "No tenant",
        status: 400,
      });

      const request = createRequest("GET");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("No tenant");
    });
  });

  describe("GET /api/v1/team/settings - Happy paths", () => {
    it("should return tenant settings", async () => {
      vi.mocked(getApiContext).mockResolvedValue({
        success: true,
        context: {
          userId: "user-1",
          tenantId: "tenant-1",
          tenantRole: "member",
        },
      });
      vi.mocked(db.query.tenants.findFirst).mockResolvedValue(mockTenant);

      const request = createRequest("GET");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.id).toBe("tenant-1");
      expect(data.data.name).toBe("Test Tenant");
      expect(data.data.slug).toBe("test-tenant");
    });

    it("should return null when tenant not found", async () => {
      vi.mocked(getApiContext).mockResolvedValue({
        success: true,
        context: {
          userId: "user-1",
          tenantId: "tenant-1",
          tenantRole: "member",
        },
      });
      vi.mocked(db.query.tenants.findFirst).mockResolvedValue(null);

      const request = createRequest("GET");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toBeNull();
    });

    it("should return 500 on internal error", async () => {
      vi.mocked(getApiContext).mockResolvedValue({
        success: true,
        context: {
          userId: "user-1",
          tenantId: "tenant-1",
          tenantRole: "member",
        },
      });
      vi.mocked(db.query.tenants.findFirst).mockRejectedValue(
        new Error("Database error")
      );

      const request = createRequest("GET");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal error");
    });
  });

  describe("PATCH /api/v1/team/settings - Authorization", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getApiContext).mockResolvedValue({
        success: false,
        error: "Unauthorized",
        status: 401,
      });

      const request = createRequest("PATCH", {
        name: "Updated Name",
        slug: "updated-slug",
      });
      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 403 when not admin", async () => {
      vi.mocked(getApiContext).mockResolvedValue({
        success: true,
        context: {
          userId: "user-1",
          tenantId: "tenant-1",
          tenantRole: "member",
        },
      });
      vi.mocked(hasTenantAdminAccess).mockReturnValue(false);

      const request = createRequest("PATCH", {
        name: "Updated Name",
        slug: "updated-slug",
      });
      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });
  });

  describe("PATCH /api/v1/team/settings - Validation", () => {
    it("should return 400 for missing name", async () => {
      vi.mocked(getApiContext).mockResolvedValue({
        success: true,
        context: {
          userId: "user-1",
          tenantId: "tenant-1",
          tenantRole: "owner",
        },
      });
      vi.mocked(hasTenantAdminAccess).mockReturnValue(true);

      const request = createRequest("PATCH", { slug: "test-slug" });
      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid input");
    });

    it("should return 400 for missing slug", async () => {
      vi.mocked(getApiContext).mockResolvedValue({
        success: true,
        context: {
          userId: "user-1",
          tenantId: "tenant-1",
          tenantRole: "owner",
        },
      });
      vi.mocked(hasTenantAdminAccess).mockReturnValue(true);

      const request = createRequest("PATCH", { name: "Test Name" });
      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid input");
    });

    it("should return 400 for short name", async () => {
      vi.mocked(getApiContext).mockResolvedValue({
        success: true,
        context: {
          userId: "user-1",
          tenantId: "tenant-1",
          tenantRole: "owner",
        },
      });
      vi.mocked(hasTenantAdminAccess).mockReturnValue(true);

      const request = createRequest("PATCH", {
        name: "A",
        slug: "test-slug",
      });
      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid input");
    });

    it("should return 400 for short slug", async () => {
      vi.mocked(getApiContext).mockResolvedValue({
        success: true,
        context: {
          userId: "user-1",
          tenantId: "tenant-1",
          tenantRole: "owner",
        },
      });
      vi.mocked(hasTenantAdminAccess).mockReturnValue(true);

      const request = createRequest("PATCH", {
        name: "Test Name",
        slug: "t",
      });
      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid input");
    });

    it("should return 400 for invalid slug format", async () => {
      vi.mocked(getApiContext).mockResolvedValue({
        success: true,
        context: {
          userId: "user-1",
          tenantId: "tenant-1",
          tenantRole: "owner",
        },
      });
      vi.mocked(hasTenantAdminAccess).mockReturnValue(true);

      const request = createRequest("PATCH", {
        name: "Test Name",
        slug: "Invalid Slug!",
      });
      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid input");
    });

    it("should return 400 when slug is taken by another tenant", async () => {
      vi.mocked(getApiContext).mockResolvedValue({
        success: true,
        context: {
          userId: "user-1",
          tenantId: "tenant-1",
          tenantRole: "owner",
        },
      });
      vi.mocked(hasTenantAdminAccess).mockReturnValue(true);
      vi.mocked(db.query.tenants.findFirst).mockResolvedValue({
        ...mockTenant,
        id: "tenant-2",
        slug: "taken-slug",
      });

      const request = createRequest("PATCH", {
        name: "Test Name",
        slug: "taken-slug",
      });
      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Slug already taken");
    });
  });

  describe("PATCH /api/v1/team/settings - Happy paths", () => {
    it("should update team settings successfully", async () => {
      vi.mocked(getApiContext).mockResolvedValue({
        success: true,
        context: {
          userId: "user-1",
          tenantId: "tenant-1",
          tenantRole: "owner",
        },
      });
      vi.mocked(hasTenantAdminAccess).mockReturnValue(true);
      vi.mocked(db.query.tenants.findFirst).mockResolvedValue(null);

      const updatedTenant = {
        ...mockTenant,
        name: "Updated Name",
        slug: "updated-slug",
      };

      const mockReturning = vi.fn().mockResolvedValue([updatedTenant]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      vi.mocked(db.update).mockReturnValue({ set: mockSet } as never);

      const request = createRequest("PATCH", {
        name: "Updated Name",
        slug: "updated-slug",
      });
      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.name).toBe("Updated Name");
      expect(data.data.slug).toBe("updated-slug");
    });

    it("should allow keeping the same slug", async () => {
      vi.mocked(getApiContext).mockResolvedValue({
        success: true,
        context: {
          userId: "user-1",
          tenantId: "tenant-1",
          tenantRole: "owner",
        },
      });
      vi.mocked(hasTenantAdminAccess).mockReturnValue(true);
      // Return current tenant (same id means it's OK to keep the slug)
      vi.mocked(db.query.tenants.findFirst).mockResolvedValue(mockTenant);

      const updatedTenant = {
        ...mockTenant,
        name: "Updated Name",
      };

      const mockReturning = vi.fn().mockResolvedValue([updatedTenant]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      vi.mocked(db.update).mockReturnValue({ set: mockSet } as never);

      const request = createRequest("PATCH", {
        name: "Updated Name",
        slug: "test-tenant",
      });
      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.name).toBe("Updated Name");
    });

    it("should allow manager to update settings", async () => {
      vi.mocked(getApiContext).mockResolvedValue({
        success: true,
        context: {
          userId: "user-2",
          tenantId: "tenant-1",
          tenantRole: "manager",
        },
      });
      vi.mocked(hasTenantAdminAccess).mockReturnValue(true);
      vi.mocked(db.query.tenants.findFirst).mockResolvedValue(null);

      const updatedTenant = {
        ...mockTenant,
        name: "Manager Updated",
        slug: "manager-slug",
      };

      const mockReturning = vi.fn().mockResolvedValue([updatedTenant]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      vi.mocked(db.update).mockReturnValue({ set: mockSet } as never);

      const request = createRequest("PATCH", {
        name: "Manager Updated",
        slug: "manager-slug",
      });
      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.name).toBe("Manager Updated");
    });
  });

  describe("Error handling", () => {
    it("PATCH should return 500 on internal error", async () => {
      vi.mocked(getApiContext).mockResolvedValue({
        success: true,
        context: {
          userId: "user-1",
          tenantId: "tenant-1",
          tenantRole: "owner",
        },
      });
      vi.mocked(hasTenantAdminAccess).mockReturnValue(true);
      vi.mocked(db.query.tenants.findFirst).mockRejectedValue(
        new Error("Database error")
      );

      const request = createRequest("PATCH", {
        name: "Test Name",
        slug: "test-slug",
      });
      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal error");
    });
  });
});
