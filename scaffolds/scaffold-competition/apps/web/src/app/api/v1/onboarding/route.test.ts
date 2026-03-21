// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock auth
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

// Mock database
vi.mock("@scaffold-competition/database/client", () => ({
  db: {
    query: {
      teamMembers: { findFirst: vi.fn() },
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
vi.mock("@scaffold-competition/database/schema", () => ({
  teamMembers: {
    userId: "user_id",
  },
  tenants: {
    slug: "slug",
  },
}));

import { POST } from "./route";
import { auth } from "@/lib/auth";
import { db } from "@scaffold-competition/database/client";

function createRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/v1/onboarding", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

const mockTenant = {
  id: "tenant-1",
  name: "Acme Inc",
  slug: "acme",
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

describe("Onboarding route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/v1/onboarding - Authorization", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null as any);

      const request = createRequest({ teamName: "Acme Inc", slug: "acme" });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 401 when session has no user", async () => {
      vi.mocked(auth).mockResolvedValue({ user: null } as never);

      const request = createRequest({ teamName: "Acme Inc", slug: "acme" });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 400 when user already has a team", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1" },
      } as never);
      vi.mocked(db.query.teamMembers.findFirst).mockResolvedValue({
        id: "member-1",
        userId: "user-1",
        tenantId: "tenant-1",
        role: "owner",
      });

      const request = createRequest({ teamName: "Acme Inc", slug: "acme" });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Already part of a team");
    });
  });

  describe("POST /api/v1/onboarding - Validation", () => {
    it("should return 400 when teamName is missing", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1" },
      } as never);
      vi.mocked(db.query.teamMembers.findFirst).mockResolvedValue(null);

      const request = createRequest({ slug: "acme" });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid input");
    });

    it("should return 400 when slug is missing", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1" },
      } as never);
      vi.mocked(db.query.teamMembers.findFirst).mockResolvedValue(null);

      const request = createRequest({ teamName: "Acme Inc" });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid input");
    });

    it("should return 400 when teamName is too short", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1" },
      } as never);
      vi.mocked(db.query.teamMembers.findFirst).mockResolvedValue(null);

      const request = createRequest({ teamName: "A", slug: "acme" });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid input");
    });

    it("should return 400 when slug is too short", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1" },
      } as never);
      vi.mocked(db.query.teamMembers.findFirst).mockResolvedValue(null);

      const request = createRequest({ teamName: "Acme Inc", slug: "a" });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid input");
    });

    it("should return 400 when slug has invalid format", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1" },
      } as never);
      vi.mocked(db.query.teamMembers.findFirst).mockResolvedValue(null);

      const request = createRequest({
        teamName: "Acme Inc",
        slug: "Invalid Slug!",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid input");
    });

    it("should return 400 when slug contains uppercase", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1" },
      } as never);
      vi.mocked(db.query.teamMembers.findFirst).mockResolvedValue(null);

      const request = createRequest({ teamName: "Acme Inc", slug: "Acme" });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid input");
    });

    it("should return 400 when slug already exists", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1" },
      } as never);
      vi.mocked(db.query.teamMembers.findFirst).mockResolvedValue(null);
      vi.mocked(db.query.tenants.findFirst).mockResolvedValue(mockTenant);

      const request = createRequest({ teamName: "New Acme", slug: "acme" });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Team URL already taken");
    });
  });

  describe("POST /api/v1/onboarding - Happy paths", () => {
    it("should create team successfully", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1" },
      } as never);
      vi.mocked(db.query.teamMembers.findFirst).mockResolvedValue(null);
      vi.mocked(db.query.tenants.findFirst).mockResolvedValue(null);

      const mockReturning = vi.fn().mockResolvedValue([mockTenant]);
      const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
      vi.mocked(db.insert).mockReturnValue({ values: mockValues } as never);

      const request = createRequest({ teamName: "Acme Inc", slug: "acme" });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data.name).toBe("Acme Inc");
      expect(data.data.slug).toBe("acme");
    });

    it("should accept valid slug with hyphens", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1" },
      } as never);
      vi.mocked(db.query.teamMembers.findFirst).mockResolvedValue(null);
      vi.mocked(db.query.tenants.findFirst).mockResolvedValue(null);

      const tenant = { ...mockTenant, slug: "acme-corp" };
      const mockReturning = vi.fn().mockResolvedValue([tenant]);
      const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
      vi.mocked(db.insert).mockReturnValue({ values: mockValues } as never);

      const request = createRequest({
        teamName: "Acme Corporation",
        slug: "acme-corp",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data.slug).toBe("acme-corp");
    });

    it("should accept valid slug with numbers", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1" },
      } as never);
      vi.mocked(db.query.teamMembers.findFirst).mockResolvedValue(null);
      vi.mocked(db.query.tenants.findFirst).mockResolvedValue(null);

      const tenant = { ...mockTenant, slug: "team123" };
      const mockReturning = vi.fn().mockResolvedValue([tenant]);
      const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
      vi.mocked(db.insert).mockReturnValue({ values: mockValues } as never);

      const request = createRequest({ teamName: "Team 123", slug: "team123" });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data.slug).toBe("team123");
    });
  });

  describe("Error handling", () => {
    it("should return 500 on internal error", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1" },
      } as never);
      vi.mocked(db.query.teamMembers.findFirst).mockRejectedValue(
        new Error("Database error")
      );

      const request = createRequest({ teamName: "Acme Inc", slug: "acme" });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal error");
    });
  });
});
