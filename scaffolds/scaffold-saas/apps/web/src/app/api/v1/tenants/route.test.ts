// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock auth
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

// Mock tenant utilities
vi.mock("@/lib/tenant", () => ({
  getUserTenants: vi.fn(),
}));

// Mock database
vi.mock("@scaffold-saas/database/client", () => ({
  db: {
    query: {
      tenants: { findFirst: vi.fn() },
    },
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(),
      })),
    })),
  },
}));

// Mock schema
vi.mock("@scaffold-saas/database/schema", () => ({
  tenants: {
    slug: "slug",
  },
  teamMembers: {},
}));

import { GET, POST } from "./route";
import { auth } from "@/lib/auth";
import { getUserTenants } from "@/lib/tenant";
import { db } from "@scaffold-saas/database/client";
import { NextRequest } from "next/server";

function createRequest(
  method: string,
  body?: unknown
): NextRequest {
  const url = new URL("http://localhost:3000/api/v1/tenants");
  return new NextRequest(url.toString(), {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { "Content-Type": "application/json" } : undefined,
  });
}

const mockTenants = [
  {
    id: "tenant-1",
    name: "First Tenant",
    slug: "first-tenant",
    avatarUrl: null,
    plan: {
      id: "plan-1",
      name: "Pro",
      slug: "pro",
    },
    role: "owner",
    createdAt: new Date("2024-01-01"),
  },
  {
    id: "tenant-2",
    name: "Second Tenant",
    slug: "second-tenant",
    avatarUrl: "https://example.com/avatar.png",
    plan: null,
    role: "member",
    createdAt: new Date("2024-01-15"),
  },
];

describe("Tenants route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/v1/tenants - Authorization", () => {
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

  describe("GET /api/v1/tenants - Happy paths", () => {
    it("should return list of user tenants", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" },
        expires: new Date().toISOString(),
      });
      vi.mocked(getUserTenants).mockResolvedValue(mockTenants as never);

      const request = createRequest("GET");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.tenants).toHaveLength(2);
      expect(data.tenants[0].name).toBe("First Tenant");
      expect(data.tenants[0].plan.name).toBe("Pro");
      expect(data.tenants[0].role).toBe("owner");
    });

    it("should return empty array when user has no tenants", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" },
        expires: new Date().toISOString(),
      });
      vi.mocked(getUserTenants).mockResolvedValue([]);

      const request = createRequest("GET");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.tenants).toHaveLength(0);
    });

    it("should return tenant with null plan", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" },
        expires: new Date().toISOString(),
      });
      vi.mocked(getUserTenants).mockResolvedValue([mockTenants[1]] as never);

      const request = createRequest("GET");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.tenants[0].plan).toBeNull();
      expect(data.tenants[0].avatarUrl).toBe("https://example.com/avatar.png");
    });

    it("should return 500 on internal error", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" },
        expires: new Date().toISOString(),
      });
      vi.mocked(getUserTenants).mockRejectedValue(new Error("Database error"));

      const request = createRequest("GET");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to fetch tenants");
    });
  });

  describe("POST /api/v1/tenants - Authorization", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null as any);

      const request = createRequest("POST", {
        name: "New Tenant",
        slug: "new-tenant",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });
  });

  describe("POST /api/v1/tenants - Validation", () => {
    it("should return 400 for missing name", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" },
        expires: new Date().toISOString(),
      });

      const request = createRequest("POST", { slug: "new-tenant" });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid request");
    });

    it("should return 400 for missing slug", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" },
        expires: new Date().toISOString(),
      });

      const request = createRequest("POST", { name: "New Tenant" });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid request");
    });

    it("should return 400 for short name", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" },
        expires: new Date().toISOString(),
      });

      const request = createRequest("POST", {
        name: "A",
        slug: "new-tenant",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid request");
    });

    it("should return 400 for short slug", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" },
        expires: new Date().toISOString(),
      });

      const request = createRequest("POST", {
        name: "New Tenant",
        slug: "n",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid request");
    });

    it("should return 400 for invalid slug format", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" },
        expires: new Date().toISOString(),
      });

      const request = createRequest("POST", {
        name: "New Tenant",
        slug: "Invalid Slug!",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid request");
    });

    it("should return 400 for slug with uppercase letters", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" },
        expires: new Date().toISOString(),
      });

      const request = createRequest("POST", {
        name: "New Tenant",
        slug: "New-Tenant",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid request");
    });

    it("should return 400 when slug is already taken", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" },
        expires: new Date().toISOString(),
      });
      vi.mocked(db.query.tenants.findFirst).mockResolvedValue({
        id: "tenant-existing",
        slug: "taken-slug",
      });

      const request = createRequest("POST", {
        name: "New Tenant",
        slug: "taken-slug",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("This team URL is already taken");
    });
  });

  describe("POST /api/v1/tenants - Happy paths", () => {
    it("should create new tenant successfully", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" },
        expires: new Date().toISOString(),
      });
      vi.mocked(db.query.tenants.findFirst).mockResolvedValue(null);

      const newTenant = {
        id: "tenant-new",
        name: "New Tenant",
        slug: "new-tenant",
        avatarUrl: null,
        createdAt: new Date(),
      };

      const mockReturning = vi.fn().mockResolvedValue([newTenant]);
      const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
      vi.mocked(db.insert).mockReturnValue({ values: mockValues } as never);

      const request = createRequest("POST", {
        name: "New Tenant",
        slug: "new-tenant",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.tenant.id).toBe("tenant-new");
      expect(data.tenant.name).toBe("New Tenant");
      expect(data.tenant.slug).toBe("new-tenant");
      expect(data.tenant.role).toBe("owner");
    });

    it("should accept valid slug with numbers and hyphens", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" },
        expires: new Date().toISOString(),
      });
      vi.mocked(db.query.tenants.findFirst).mockResolvedValue(null);

      const newTenant = {
        id: "tenant-new",
        name: "Team 2024",
        slug: "team-2024-abc",
        avatarUrl: null,
        createdAt: new Date(),
      };

      const mockReturning = vi.fn().mockResolvedValue([newTenant]);
      const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
      vi.mocked(db.insert).mockReturnValue({ values: mockValues } as never);

      const request = createRequest("POST", {
        name: "Team 2024",
        slug: "team-2024-abc",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.tenant.slug).toBe("team-2024-abc");
    });
  });

  describe("Error handling", () => {
    it("POST should return 500 on internal error", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" },
        expires: new Date().toISOString(),
      });
      vi.mocked(db.query.tenants.findFirst).mockRejectedValue(
        new Error("Database error")
      );

      const request = createRequest("POST", {
        name: "New Tenant",
        slug: "new-tenant",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to create team");
    });
  });
});
