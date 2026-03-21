// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock auth
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

// Mock tenant utilities
vi.mock("@/lib/tenant", () => ({
  getTeamMember: vi.fn(),
  getTenant: vi.fn(),
}));

// Mock cookies
vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

import { GET, PATCH } from "./route";
import { auth } from "@/lib/auth";
import { getTeamMember, getTenant } from "@/lib/tenant";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

function createRequest(
  method: string,
  body?: unknown
): NextRequest {
  const url = new URL("http://localhost:3000/api/v1/tenants/active");
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
  avatarUrl: null,
  plan: {
    id: "plan-1",
    name: "Pro",
    slug: "pro",
  },
};

const mockMembership = {
  id: "member-1",
  tenantId: "tenant-1",
  userId: "user-1",
  role: "owner",
};

describe("Tenants Active route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/v1/tenants/active - Authorization", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null as any);

      const request = createRequest("GET");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 401 when session has no user id", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: {},
        expires: new Date().toISOString(),
      });

      const request = createRequest("GET");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });
  });

  describe("GET /api/v1/tenants/active - Happy paths", () => {
    it("should return null tenant when no active tenant in session", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" },
        expires: new Date().toISOString(),
      });

      const request = createRequest("GET");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.tenant).toBeNull();
    });

    it("should return null tenant when tenant not found", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "user-1",
          email: "test@example.com",
          tenantId: "tenant-1",
        },
        expires: new Date().toISOString(),
      });
      vi.mocked(getTenant).mockResolvedValue(null);

      const request = createRequest("GET");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.tenant).toBeNull();
    });

    it("should return active tenant with plan info", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "user-1",
          email: "test@example.com",
          tenantId: "tenant-1",
          tenantRole: "owner",
        },
        expires: new Date().toISOString(),
      });
      vi.mocked(getTenant).mockResolvedValue(mockTenant as never);

      const request = createRequest("GET");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.tenant.id).toBe("tenant-1");
      expect(data.tenant.name).toBe("Test Tenant");
      expect(data.tenant.slug).toBe("test-tenant");
      expect(data.tenant.plan.name).toBe("Pro");
      expect(data.tenant.role).toBe("owner");
    });

    it("should return tenant without plan if no plan exists", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "user-1",
          email: "test@example.com",
          tenantId: "tenant-1",
          tenantRole: "member",
        },
        expires: new Date().toISOString(),
      });
      vi.mocked(getTenant).mockResolvedValue({
        ...mockTenant,
        plan: null,
      } as never);

      const request = createRequest("GET");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.tenant.id).toBe("tenant-1");
      expect(data.tenant.plan).toBeNull();
    });

    it("should return 500 on internal error", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "user-1",
          email: "test@example.com",
          tenantId: "tenant-1",
        },
        expires: new Date().toISOString(),
      });
      vi.mocked(getTenant).mockRejectedValue(new Error("Database error"));

      const request = createRequest("GET");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to fetch active tenant");
    });
  });

  describe("PATCH /api/v1/tenants/active - Authorization", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null as any);

      const request = createRequest("PATCH", {
        tenantId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      });
      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 403 when not a member of the tenant", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" },
        expires: new Date().toISOString(),
      });
      vi.mocked(getTeamMember).mockResolvedValue(null);

      const request = createRequest("PATCH", {
        tenantId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      });
      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("You are not a member of this team");
    });
  });

  describe("PATCH /api/v1/tenants/active - Validation", () => {
    it("should return 400 for missing tenantId", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" },
        expires: new Date().toISOString(),
      });

      const request = createRequest("PATCH", {});
      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid request");
    });

    it("should return 400 for invalid tenantId format", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" },
        expires: new Date().toISOString(),
      });

      const request = createRequest("PATCH", {
        tenantId: "invalid-not-uuid",
      });
      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid request");
    });

    it("should return 404 when tenant not found", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" },
        expires: new Date().toISOString(),
      });
      vi.mocked(getTeamMember).mockResolvedValue(mockMembership as never);
      vi.mocked(getTenant).mockResolvedValue(null);

      const request = createRequest("PATCH", {
        tenantId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      });
      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Team not found");
    });
  });

  describe("PATCH /api/v1/tenants/active - Happy paths", () => {
    it("should set active tenant and return tenant info", async () => {
      const mockSet = vi.fn();
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" },
        expires: new Date().toISOString(),
      });
      vi.mocked(getTeamMember).mockResolvedValue(mockMembership as never);
      vi.mocked(getTenant).mockResolvedValue(mockTenant as never);
      vi.mocked(cookies).mockResolvedValue({ set: mockSet } as never);

      const request = createRequest("PATCH", {
        tenantId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      });
      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.tenant.id).toBe("tenant-1");
      expect(data.tenant.name).toBe("Test Tenant");
      expect(data.tenant.role).toBe("owner");
      expect(mockSet).toHaveBeenCalledWith(
        "active-tenant-id",
        "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        expect.objectContaining({
          httpOnly: true,
          sameSite: "lax",
          path: "/",
        })
      );
    });

    it("should return tenant without plan if no plan exists", async () => {
      const mockSet = vi.fn();
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" },
        expires: new Date().toISOString(),
      });
      vi.mocked(getTeamMember).mockResolvedValue({
        ...mockMembership,
        role: "member",
      } as never);
      vi.mocked(getTenant).mockResolvedValue({
        ...mockTenant,
        plan: null,
      } as never);
      vi.mocked(cookies).mockResolvedValue({ set: mockSet } as never);

      const request = createRequest("PATCH", {
        tenantId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      });
      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.tenant.plan).toBeNull();
      expect(data.tenant.role).toBe("member");
    });
  });

  describe("Error handling", () => {
    it("PATCH should return 500 on internal error", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" },
        expires: new Date().toISOString(),
      });
      vi.mocked(getTeamMember).mockRejectedValue(new Error("Database error"));

      const request = createRequest("PATCH", {
        tenantId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      });
      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to set active tenant");
    });
  });
});
