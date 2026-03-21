// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock auth
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

// Mock tenant functions
vi.mock("@/lib/tenant", () => ({
  checkTeamMemberLimit: vi.fn(),
}));

// Mock utils
vi.mock("@scaffold-news/utils", () => ({
  generateRandomString: vi.fn(() => "test-token-32chars"),
}));

// Mock database
vi.mock("@scaffold-news/database/client", () => ({
  db: {
    query: {
      teamInvitations: { findMany: vi.fn(), findFirst: vi.fn() },
      users: { findFirst: vi.fn() },
      teamMembers: { findFirst: vi.fn() },
    },
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(),
    })),
  },
}));

// Mock schema
vi.mock("@scaffold-news/database/schema", () => ({
  teamInvitations: {
    id: "id",
    tenantId: "tenant_id",
    email: "email",
    acceptedAt: "accepted_at",
  },
  users: { email: "email" },
  teamMembers: { tenantId: "tenant_id", userId: "user_id" },
}));

import { GET, POST, DELETE } from "./route";
import { auth } from "@/lib/auth";
import { checkTeamMemberLimit } from "@/lib/tenant";
import { db } from "@scaffold-news/database/client";

function createRequest(
  method: string,
  body?: unknown,
  searchParams?: Record<string, string>
): Request {
  const url = new URL("http://localhost:3000/api/v1/team/invitations");
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

const mockInvitations = [
  {
    id: "inv-1",
    tenantId: "tenant-1",
    email: "user@example.com",
    role: "member",
    token: "token123",
    inviter: { id: "user-1", name: "Admin", email: "admin@example.com" },
    createdAt: new Date(),
  },
];

describe("Team Invitations route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/v1/team/invitations - Authorization", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null as any);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 400 when no tenant", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" },
        expires: new Date().toISOString(),
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("No tenant");
    });
  });

  describe("GET /api/v1/team/invitations - Happy paths", () => {
    it("should return list of pending invitations", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "user-1",
          email: "test@example.com",
          tenantId: "tenant-1",
          tenantRole: "member",
        },
        expires: new Date().toISOString(),
      });
      vi.mocked(db.query.teamInvitations.findMany).mockResolvedValue(
        mockInvitations
      );

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].email).toBe("user@example.com");
    });

    it("should return empty array when no invitations", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "user-1",
          email: "test@example.com",
          tenantId: "tenant-1",
          tenantRole: "member",
        },
        expires: new Date().toISOString(),
      });
      vi.mocked(db.query.teamInvitations.findMany).mockResolvedValue([]);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(0);
    });
  });

  describe("POST /api/v1/team/invitations - Authorization", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null as any);

      const request = createRequest("POST", { email: "new@example.com" });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 400 when no tenant", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" },
        expires: new Date().toISOString(),
      });

      const request = createRequest("POST", { email: "new@example.com" });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("No tenant");
    });

    it("should return 403 when user is member", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "user-1",
          email: "test@example.com",
          tenantId: "tenant-1",
          tenantRole: "member",
        },
        expires: new Date().toISOString(),
      });

      const request = createRequest("POST", { email: "new@example.com" });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });
  });

  describe("POST /api/v1/team/invitations - Validation", () => {
    it("should return 400 for invalid email", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "user-1",
          email: "test@example.com",
          tenantId: "tenant-1",
          tenantRole: "owner",
        },
        expires: new Date().toISOString(),
      });

      const request = createRequest("POST", { email: "not-an-email" });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid input");
    });

    it("should return 400 when user already in team", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "user-1",
          email: "test@example.com",
          tenantId: "tenant-1",
          tenantRole: "owner",
        },
        expires: new Date().toISOString(),
      });
      vi.mocked(db.query.users.findFirst).mockResolvedValue({
        id: "existing-user",
        email: "existing@example.com",
      });
      vi.mocked(db.query.teamMembers.findFirst).mockResolvedValue({
        id: "member-1",
        tenantId: "tenant-1",
        userId: "existing-user",
      });

      const request = createRequest("POST", { email: "existing@example.com" });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("User already in team");
    });

    it("should return 400 when invitation already pending", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "user-1",
          email: "test@example.com",
          tenantId: "tenant-1",
          tenantRole: "owner",
        },
        expires: new Date().toISOString(),
      });
      vi.mocked(db.query.users.findFirst).mockResolvedValue(null);
      vi.mocked(db.query.teamInvitations.findFirst).mockResolvedValue(
        mockInvitations[0]
      );

      const request = createRequest("POST", { email: "pending@example.com" });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invitation already sent");
    });
  });

  describe("POST /api/v1/team/invitations - Limit check", () => {
    it("should return 403 when team member limit reached", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "user-1",
          email: "test@example.com",
          tenantId: "tenant-1",
          tenantRole: "owner",
        },
        expires: new Date().toISOString(),
      });
      vi.mocked(db.query.users.findFirst).mockResolvedValue(null);
      vi.mocked(db.query.teamInvitations.findFirst).mockResolvedValue(null);
      vi.mocked(checkTeamMemberLimit).mockResolvedValue({
        allowed: false,
        current: 5,
        pendingInvitations: 0,
        limit: 5,
      });

      const request = createRequest("POST", { email: "new@example.com" });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Team member limit reached");
      expect(data.code).toBe("UPGRADE_REQUIRED");
    });
  });

  describe("POST /api/v1/team/invitations - Happy paths", () => {
    it("should create invitation for owner", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "user-1",
          email: "test@example.com",
          tenantId: "tenant-1",
          tenantRole: "owner",
        },
        expires: new Date().toISOString(),
      });
      vi.mocked(db.query.users.findFirst).mockResolvedValue(null);
      vi.mocked(db.query.teamInvitations.findFirst).mockResolvedValue(null);
      vi.mocked(checkTeamMemberLimit).mockResolvedValue({
        allowed: true,
        current: 3,
        pendingInvitations: 0,
        limit: 10,
      });

      const mockReturning = vi.fn().mockResolvedValue([mockInvitations[0]]);
      const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
      vi.mocked(db.insert).mockReturnValue({ values: mockValues } as never);

      const request = createRequest("POST", {
        email: "new@example.com",
        role: "member",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data).toBeDefined();
    });

    it("should create invitation for manager", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "user-1",
          email: "test@example.com",
          tenantId: "tenant-1",
          tenantRole: "manager",
        },
        expires: new Date().toISOString(),
      });
      vi.mocked(db.query.users.findFirst).mockResolvedValue(null);
      vi.mocked(db.query.teamInvitations.findFirst).mockResolvedValue(null);
      vi.mocked(checkTeamMemberLimit).mockResolvedValue({
        allowed: true,
        current: 3,
        pendingInvitations: 0,
        limit: 10,
      });

      const mockReturning = vi.fn().mockResolvedValue([mockInvitations[0]]);
      const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
      vi.mocked(db.insert).mockReturnValue({ values: mockValues } as never);

      const request = createRequest("POST", {
        email: "new@example.com",
        role: "manager",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
    });

    it("should default role to member", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "user-1",
          email: "test@example.com",
          tenantId: "tenant-1",
          tenantRole: "owner",
        },
        expires: new Date().toISOString(),
      });
      vi.mocked(db.query.users.findFirst).mockResolvedValue(null);
      vi.mocked(db.query.teamInvitations.findFirst).mockResolvedValue(null);
      vi.mocked(checkTeamMemberLimit).mockResolvedValue({
        allowed: true,
        current: 3,
        pendingInvitations: 0,
        limit: 10,
      });

      const mockReturning = vi.fn().mockResolvedValue([mockInvitations[0]]);
      const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
      vi.mocked(db.insert).mockReturnValue({ values: mockValues } as never);

      const request = createRequest("POST", { email: "new@example.com" });
      const response = await POST(request);

      expect(response.status).toBe(201);
    });
  });

  describe("DELETE /api/v1/team/invitations - Authorization", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null as any);

      const request = createRequest("DELETE", undefined, {
        invitationId: "inv-1",
      });
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 403 when user is member", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "user-1",
          email: "test@example.com",
          tenantId: "tenant-1",
          tenantRole: "member",
        },
        expires: new Date().toISOString(),
      });

      const request = createRequest("DELETE", undefined, {
        invitationId: "inv-1",
      });
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });
  });

  describe("DELETE /api/v1/team/invitations - Validation", () => {
    it("should return 400 when invitationId is missing", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "user-1",
          email: "test@example.com",
          tenantId: "tenant-1",
          tenantRole: "owner",
        },
        expires: new Date().toISOString(),
      });

      const request = createRequest("DELETE");
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invitation ID required");
    });
  });

  describe("DELETE /api/v1/team/invitations - Happy paths", () => {
    it("should delete invitation for owner", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "user-1",
          email: "test@example.com",
          tenantId: "tenant-1",
          tenantRole: "owner",
        },
        expires: new Date().toISOString(),
      });

      const mockWhere = vi.fn().mockResolvedValue(undefined);
      vi.mocked(db.delete).mockReturnValue({ where: mockWhere } as never);

      const request = createRequest("DELETE", undefined, {
        invitationId: "inv-1",
      });
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("should delete invitation for manager", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "user-1",
          email: "test@example.com",
          tenantId: "tenant-1",
          tenantRole: "manager",
        },
        expires: new Date().toISOString(),
      });

      const mockWhere = vi.fn().mockResolvedValue(undefined);
      vi.mocked(db.delete).mockReturnValue({ where: mockWhere } as never);

      const request = createRequest("DELETE", undefined, {
        invitationId: "inv-1",
      });
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe("Error handling", () => {
    it("GET should return 500 on internal error", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "user-1",
          email: "test@example.com",
          tenantId: "tenant-1",
          tenantRole: "member",
        },
        expires: new Date().toISOString(),
      });
      vi.mocked(db.query.teamInvitations.findMany).mockRejectedValue(
        new Error("Database error")
      );

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal error");
    });

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
      vi.mocked(db.query.users.findFirst).mockRejectedValue(
        new Error("Database error")
      );

      const request = createRequest("POST", { email: "new@example.com" });
      const response = await POST(request);
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
      vi.mocked(db.delete).mockImplementation(() => {
        throw new Error("Database error");
      });

      const request = createRequest("DELETE", undefined, {
        invitationId: "inv-1",
      });
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal error");
    });
  });
});
