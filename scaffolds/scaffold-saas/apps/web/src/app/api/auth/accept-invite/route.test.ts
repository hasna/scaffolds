// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock auth
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

// Mock tenant limit check
vi.mock("@/lib/tenant", () => ({
  checkTeamMemberLimit: vi.fn(),
}));

// Mock cookies
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve({
    set: vi.fn(),
  })),
}));

// Mock bcryptjs
vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn(() => Promise.resolve("hashed_password")),
  },
}));

// Mock database
vi.mock("@scaffold-saas/database/client", () => ({
  db: {
    query: {
      teamInvitations: { findFirst: vi.fn() },
      users: { findFirst: vi.fn() },
      teamMembers: { findFirst: vi.fn() },
      tenants: { findFirst: vi.fn() },
    },
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(),
      })),
    })),
  },
}));

// Mock schema
vi.mock("@scaffold-saas/database/schema", () => ({
  teamInvitations: {
    id: "id",
    token: "token",
    acceptedAt: "accepted_at",
    expiresAt: "expires_at",
  },
  users: {
    id: "id",
    email: "email",
  },
  teamMembers: {
    tenantId: "tenant_id",
    userId: "user_id",
  },
  tenants: {
    id: "id",
  },
}));

import { POST } from "./route";
import { auth } from "@/lib/auth";
import { checkTeamMemberLimit } from "@/lib/tenant";
import { db } from "@scaffold-saas/database/client";

function createRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/auth/accept-invite", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

const mockInvitation = {
  id: "invite-1",
  email: "user@example.com",
  token: "valid-token",
  tenantId: "tenant-1",
  role: "member",
  invitedBy: "inviter-1",
  expiresAt: new Date("2030-01-01"),
  acceptedAt: null,
};

const mockTenant = {
  id: "tenant-1",
  name: "Acme Inc",
  slug: "acme",
};

describe("Accept Invite route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/auth/accept-invite - Validation", () => {
    it("should return 400 when token is missing", async () => {
      const request = createRequest({});
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid input");
    });

    it("should return 400 when token is empty (treated as invalid invitation)", async () => {
      vi.mocked(db.query.teamInvitations.findFirst).mockResolvedValue(null);

      const request = createRequest({ token: "" });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid or expired invitation");
    });
  });

  describe("POST /api/auth/accept-invite - Invalid invitation", () => {
    it("should return 400 when invitation not found", async () => {
      vi.mocked(db.query.teamInvitations.findFirst).mockResolvedValue(null);

      const request = createRequest({ token: "invalid-token" });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid or expired invitation");
    });
  });

  describe("POST /api/auth/accept-invite - Logged in user", () => {
    it("should return 400 when logged in user email doesn't match invitation", async () => {
      vi.mocked(db.query.teamInvitations.findFirst).mockResolvedValue(mockInvitation);
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", email: "different@example.com" },
      } as never);

      const request = createRequest({ token: "valid-token" });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invitation was sent to a different email");
    });

    it("should return success when logged in user is already a member", async () => {
      vi.mocked(db.query.teamInvitations.findFirst).mockResolvedValue(mockInvitation);
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", email: "user@example.com" },
      } as never);
      vi.mocked(db.query.teamMembers.findFirst).mockResolvedValue({
        id: "member-1",
        userId: "user-1",
        tenantId: "tenant-1",
      });

      const request = createRequest({ token: "valid-token" });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe("You are already a member of this team");
    });

    it("should return 403 when team member limit is reached", async () => {
      vi.mocked(db.query.teamInvitations.findFirst).mockResolvedValue(mockInvitation);
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", email: "user@example.com" },
      } as never);
      vi.mocked(db.query.teamMembers.findFirst).mockResolvedValue(null);
      vi.mocked(checkTeamMemberLimit).mockResolvedValue({
        current: 5,
        limit: 5,
        pendingInvitations: 0,
        remaining: 0,
        canAddMember: false,
      });

      const request = createRequest({ token: "valid-token" });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Team member limit reached");
      expect(data.code).toBe("UPGRADE_REQUIRED");
      expect(data.details.current).toBe(5);
      expect(data.details.limit).toBe(5);
    });

    it("should successfully accept invitation for logged in user", async () => {
      vi.mocked(db.query.teamInvitations.findFirst).mockResolvedValue(mockInvitation);
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", email: "user@example.com" },
      } as never);
      vi.mocked(db.query.teamMembers.findFirst).mockResolvedValue(null);
      vi.mocked(checkTeamMemberLimit).mockResolvedValue({
        current: 2,
        limit: 5,
        pendingInvitations: 1,
        remaining: 2,
        canAddMember: true,
      });

      const mockValues = vi.fn().mockReturnValue({ returning: vi.fn() });
      vi.mocked(db.insert).mockReturnValue({ values: mockValues } as never);

      vi.mocked(db.query.tenants.findFirst).mockResolvedValue(mockTenant);

      const request = createRequest({ token: "valid-token" });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.tenant.id).toBe("tenant-1");
      expect(data.tenant.name).toBe("Acme Inc");
      expect(data.tenant.slug).toBe("acme");
      expect(data.tenant.role).toBe("member");
    });
  });

  describe("POST /api/auth/accept-invite - New user", () => {
    it("should return 400 when name is missing for new user", async () => {
      vi.mocked(db.query.teamInvitations.findFirst).mockResolvedValue(mockInvitation);
      vi.mocked(auth).mockResolvedValue(null as any);

      const request = createRequest({ token: "valid-token", password: "password123" });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Name and password required for new users");
    });

    it("should return 400 when password is missing for new user", async () => {
      vi.mocked(db.query.teamInvitations.findFirst).mockResolvedValue(mockInvitation);
      vi.mocked(auth).mockResolvedValue(null as any);

      const request = createRequest({ token: "valid-token", name: "John Doe" });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Name and password required for new users");
    });

    it("should return 400 when name is too short", async () => {
      vi.mocked(db.query.teamInvitations.findFirst).mockResolvedValue(mockInvitation);
      vi.mocked(auth).mockResolvedValue(null as any);

      const request = createRequest({
        token: "valid-token",
        name: "J",
        password: "password123",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid input");
    });

    it("should return 400 when password is too short", async () => {
      vi.mocked(db.query.teamInvitations.findFirst).mockResolvedValue(mockInvitation);
      vi.mocked(auth).mockResolvedValue(null as any);

      const request = createRequest({
        token: "valid-token",
        name: "John Doe",
        password: "short",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid input");
    });

    it("should return 400 when user already exists (prompting sign-in)", async () => {
      vi.mocked(db.query.teamInvitations.findFirst).mockResolvedValue(mockInvitation);
      vi.mocked(auth).mockResolvedValue(null as any);
      vi.mocked(db.query.users.findFirst).mockResolvedValue({
        id: "existing-user",
        email: "user@example.com",
      });

      const request = createRequest({
        token: "valid-token",
        name: "John Doe",
        password: "password123",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Please sign in with your existing account");
    });

    it("should successfully create new user and accept invitation", async () => {
      vi.mocked(db.query.teamInvitations.findFirst).mockResolvedValue(mockInvitation);
      vi.mocked(auth).mockResolvedValue(null as any);
      vi.mocked(db.query.users.findFirst).mockResolvedValue(null);
      vi.mocked(db.query.teamMembers.findFirst).mockResolvedValue(null);
      vi.mocked(checkTeamMemberLimit).mockResolvedValue({
        current: 2,
        limit: 5,
        pendingInvitations: 1,
        remaining: 2,
        canAddMember: true,
      });

      // Mock user creation
      const mockUserReturning = vi.fn().mockResolvedValue([{ id: "new-user-1" }]);
      const mockUserValues = vi.fn().mockReturnValue({ returning: mockUserReturning });

      // Mock team member creation
      const mockMemberValues = vi.fn().mockReturnValue({ returning: vi.fn() });

      vi.mocked(db.insert)
        .mockReturnValueOnce({ values: mockUserValues } as never)
        .mockReturnValueOnce({ values: mockMemberValues } as never);

      vi.mocked(db.query.tenants.findFirst).mockResolvedValue(mockTenant);

      const request = createRequest({
        token: "valid-token",
        name: "John Doe",
        password: "password123",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.tenant.id).toBe("tenant-1");
      expect(data.tenant.name).toBe("Acme Inc");
    });

    it("should return 403 when team limit reached for new user", async () => {
      vi.mocked(db.query.teamInvitations.findFirst).mockResolvedValue(mockInvitation);
      vi.mocked(auth).mockResolvedValue(null as any);
      vi.mocked(db.query.users.findFirst).mockResolvedValue(null);

      const mockUserReturning = vi.fn().mockResolvedValue([{ id: "new-user-1" }]);
      const mockUserValues = vi.fn().mockReturnValue({ returning: mockUserReturning });
      vi.mocked(db.insert).mockReturnValue({ values: mockUserValues } as never);

      vi.mocked(db.query.teamMembers.findFirst).mockResolvedValue(null);
      vi.mocked(checkTeamMemberLimit).mockResolvedValue({
        current: 5,
        limit: 5,
        pendingInvitations: 1,
        remaining: 0,
        canAddMember: false,
      });

      const request = createRequest({
        token: "valid-token",
        name: "John Doe",
        password: "password123",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Team member limit reached");
      expect(data.code).toBe("UPGRADE_REQUIRED");
    });
  });

  describe("POST /api/auth/accept-invite - Unlimited team", () => {
    it("should succeed when team has no limit", async () => {
      vi.mocked(db.query.teamInvitations.findFirst).mockResolvedValue(mockInvitation);
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", email: "user@example.com" },
      } as never);
      vi.mocked(db.query.teamMembers.findFirst).mockResolvedValue(null);
      vi.mocked(checkTeamMemberLimit).mockResolvedValue({
        current: 100,
        limit: null, // No limit
        pendingInvitations: 5,
        remaining: null,
        canAddMember: true,
      });

      const mockValues = vi.fn().mockReturnValue({ returning: vi.fn() });
      vi.mocked(db.insert).mockReturnValue({ values: mockValues } as never);

      vi.mocked(db.query.tenants.findFirst).mockResolvedValue(mockTenant);

      const request = createRequest({ token: "valid-token" });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe("Error handling", () => {
    it("should return 500 on internal error", async () => {
      vi.mocked(db.query.teamInvitations.findFirst).mockRejectedValue(
        new Error("Database error")
      );

      const request = createRequest({ token: "valid-token" });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal error");
    });
  });
});
