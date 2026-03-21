// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock api-context
vi.mock("@/lib/api-context", () => ({
  getApiContext: vi.fn(),
  isTenantOwner: vi.fn(),
  hasTenantAdminAccess: vi.fn(),
}));

// Mock database
vi.mock("@scaffold-landing-pages/database/client", () => ({
  db: {
    query: {
      teamMembers: { findMany: vi.fn(), findFirst: vi.fn() },
    },
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(),
        })),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(),
    })),
  },
}));

// Mock schema
vi.mock("@scaffold-landing-pages/database/schema", () => ({
  teamMembers: {
    id: "id",
    tenantId: "tenant_id",
    role: "role",
  },
}));

import { GET, PATCH, DELETE } from "./route";
import { getApiContext, isTenantOwner, hasTenantAdminAccess } from "@/lib/api-context";
import { db } from "@scaffold-landing-pages/database/client";
import { NextRequest } from "next/server";

function createRequest(
  method: string,
  body?: unknown,
  searchParams?: Record<string, string>
): NextRequest {
  const url = new URL("http://localhost:3000/api/v1/team/members");
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }
  return new NextRequest(url.toString(), {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { "Content-Type": "application/json" } : undefined,
  });
}

const mockMembers = [
  {
    id: "member-1",
    tenantId: "tenant-1",
    userId: "user-1",
    role: "owner",
    joinedAt: new Date("2024-01-01"),
    user: {
      id: "user-1",
      email: "owner@example.com",
      name: "Owner User",
      avatarUrl: null,
    },
  },
  {
    id: "member-2",
    tenantId: "tenant-1",
    userId: "user-2",
    role: "manager",
    joinedAt: new Date("2024-01-15"),
    user: {
      id: "user-2",
      email: "manager@example.com",
      name: "Manager User",
      avatarUrl: null,
    },
  },
  {
    id: "member-3",
    tenantId: "tenant-1",
    userId: "user-3",
    role: "member",
    joinedAt: new Date("2024-01-20"),
    user: {
      id: "user-3",
      email: "member@example.com",
      name: "Member User",
      avatarUrl: null,
    },
  },
];

describe("Team Members route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/v1/team/members - Authorization", () => {
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

  describe("GET /api/v1/team/members - Happy paths", () => {
    it("should return list of team members", async () => {
      vi.mocked(getApiContext).mockResolvedValue({
        success: true,
        context: {
          userId: "user-1",
          tenantId: "tenant-1",
          tenantRole: "owner",
        },
      });
      vi.mocked(db.query.teamMembers.findMany).mockResolvedValue(mockMembers);

      const request = createRequest("GET");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(3);
      expect(data.data[0].user.email).toBe("owner@example.com");
    });

    it("should return empty array when no members", async () => {
      vi.mocked(getApiContext).mockResolvedValue({
        success: true,
        context: {
          userId: "user-1",
          tenantId: "tenant-1",
          tenantRole: "owner",
        },
      });
      vi.mocked(db.query.teamMembers.findMany).mockResolvedValue([]);

      const request = createRequest("GET");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(0);
    });

    it("should include user details in response", async () => {
      vi.mocked(getApiContext).mockResolvedValue({
        success: true,
        context: {
          userId: "user-1",
          tenantId: "tenant-1",
          tenantRole: "member",
        },
      });
      vi.mocked(db.query.teamMembers.findMany).mockResolvedValue(mockMembers);

      const request = createRequest("GET");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data[0].user).toHaveProperty("id");
      expect(data.data[0].user).toHaveProperty("email");
      expect(data.data[0].user).toHaveProperty("name");
      expect(data.data[0].user).toHaveProperty("avatarUrl");
    });

    it("should return 500 on internal error", async () => {
      vi.mocked(getApiContext).mockResolvedValue({
        success: true,
        context: {
          userId: "user-1",
          tenantId: "tenant-1",
          tenantRole: "owner",
        },
      });
      vi.mocked(db.query.teamMembers.findMany).mockRejectedValue(
        new Error("Database error")
      );

      const request = createRequest("GET");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal error");
    });
  });

  describe("PATCH /api/v1/team/members - Authorization", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getApiContext).mockResolvedValue({
        success: false,
        error: "Unauthorized",
        status: 401,
      });

      const request = createRequest("PATCH", {
        memberId: "member-2",
        role: "member",
      });
      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 403 when not owner", async () => {
      vi.mocked(getApiContext).mockResolvedValue({
        success: true,
        context: {
          userId: "user-2",
          tenantId: "tenant-1",
          tenantRole: "manager",
        },
      });
      vi.mocked(isTenantOwner).mockReturnValue(false);

      const request = createRequest("PATCH", {
        memberId: "member-3",
        role: "manager",
      });
      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Only owners can update roles");
    });
  });

  describe("PATCH /api/v1/team/members - Validation", () => {
    it("should return 400 for missing memberId", async () => {
      vi.mocked(getApiContext).mockResolvedValue({
        success: true,
        context: {
          userId: "user-1",
          tenantId: "tenant-1",
          tenantRole: "owner",
        },
      });
      vi.mocked(isTenantOwner).mockReturnValue(true);

      const request = createRequest("PATCH", { role: "member" });
      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid input");
    });

    it("should return 400 for missing role", async () => {
      vi.mocked(getApiContext).mockResolvedValue({
        success: true,
        context: {
          userId: "user-1",
          tenantId: "tenant-1",
          tenantRole: "owner",
        },
      });
      vi.mocked(isTenantOwner).mockReturnValue(true);

      const request = createRequest("PATCH", { memberId: "member-2" });
      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid input");
    });

    it("should return 400 for invalid role value", async () => {
      vi.mocked(getApiContext).mockResolvedValue({
        success: true,
        context: {
          userId: "user-1",
          tenantId: "tenant-1",
          tenantRole: "owner",
        },
      });
      vi.mocked(isTenantOwner).mockReturnValue(true);

      const request = createRequest("PATCH", {
        memberId: "member-2",
        role: "invalid-role",
      });
      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid input");
    });

    it("should return 404 when member not found", async () => {
      vi.mocked(getApiContext).mockResolvedValue({
        success: true,
        context: {
          userId: "user-1",
          tenantId: "tenant-1",
          tenantRole: "owner",
        },
      });
      vi.mocked(isTenantOwner).mockReturnValue(true);
      vi.mocked(db.query.teamMembers.findFirst).mockResolvedValue(null);

      const request = createRequest("PATCH", {
        memberId: "non-existent",
        role: "member",
      });
      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Member not found");
    });

    it("should return 400 when trying to change owner's role", async () => {
      vi.mocked(getApiContext).mockResolvedValue({
        success: true,
        context: {
          userId: "user-1",
          tenantId: "tenant-1",
          tenantRole: "owner",
        },
      });
      vi.mocked(isTenantOwner).mockReturnValue(true);
      vi.mocked(db.query.teamMembers.findFirst).mockResolvedValue(mockMembers[0]);

      const request = createRequest("PATCH", {
        memberId: "member-1",
        role: "member",
      });
      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Cannot change owner's role");
    });
  });

  describe("PATCH /api/v1/team/members - Happy paths", () => {
    it("should update member role successfully", async () => {
      vi.mocked(getApiContext).mockResolvedValue({
        success: true,
        context: {
          userId: "user-1",
          tenantId: "tenant-1",
          tenantRole: "owner",
        },
      });
      vi.mocked(isTenantOwner).mockReturnValue(true);
      vi.mocked(db.query.teamMembers.findFirst).mockResolvedValue(mockMembers[2]);

      const updatedMember = { ...mockMembers[2], role: "manager" };

      const mockReturning = vi.fn().mockResolvedValue([updatedMember]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      vi.mocked(db.update).mockReturnValue({ set: mockSet } as never);

      const request = createRequest("PATCH", {
        memberId: "member-3",
        role: "manager",
      });
      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.role).toBe("manager");
    });

    it("should demote manager to member", async () => {
      vi.mocked(getApiContext).mockResolvedValue({
        success: true,
        context: {
          userId: "user-1",
          tenantId: "tenant-1",
          tenantRole: "owner",
        },
      });
      vi.mocked(isTenantOwner).mockReturnValue(true);
      vi.mocked(db.query.teamMembers.findFirst).mockResolvedValue(mockMembers[1]);

      const updatedMember = { ...mockMembers[1], role: "member" };

      const mockReturning = vi.fn().mockResolvedValue([updatedMember]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      vi.mocked(db.update).mockReturnValue({ set: mockSet } as never);

      const request = createRequest("PATCH", {
        memberId: "member-2",
        role: "member",
      });
      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.role).toBe("member");
    });
  });

  describe("DELETE /api/v1/team/members - Authorization", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(getApiContext).mockResolvedValue({
        success: false,
        error: "Unauthorized",
        status: 401,
      });

      const request = createRequest("DELETE", undefined, { memberId: "member-2" });
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 403 when not admin", async () => {
      vi.mocked(getApiContext).mockResolvedValue({
        success: true,
        context: {
          userId: "user-3",
          tenantId: "tenant-1",
          tenantRole: "member",
        },
      });
      vi.mocked(hasTenantAdminAccess).mockReturnValue(false);

      const request = createRequest("DELETE", undefined, { memberId: "member-2" });
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });
  });

  describe("DELETE /api/v1/team/members - Validation", () => {
    it("should return 400 when memberId is missing", async () => {
      vi.mocked(getApiContext).mockResolvedValue({
        success: true,
        context: {
          userId: "user-1",
          tenantId: "tenant-1",
          tenantRole: "owner",
        },
      });
      vi.mocked(hasTenantAdminAccess).mockReturnValue(true);

      const request = createRequest("DELETE");
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Member ID required");
    });

    it("should return 404 when member not found", async () => {
      vi.mocked(getApiContext).mockResolvedValue({
        success: true,
        context: {
          userId: "user-1",
          tenantId: "tenant-1",
          tenantRole: "owner",
        },
      });
      vi.mocked(hasTenantAdminAccess).mockReturnValue(true);
      vi.mocked(db.query.teamMembers.findFirst).mockResolvedValue(null);

      const request = createRequest("DELETE", undefined, { memberId: "non-existent" });
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Member not found");
    });

    it("should return 400 when trying to remove owner", async () => {
      vi.mocked(getApiContext).mockResolvedValue({
        success: true,
        context: {
          userId: "user-1",
          tenantId: "tenant-1",
          tenantRole: "owner",
        },
      });
      vi.mocked(hasTenantAdminAccess).mockReturnValue(true);
      vi.mocked(db.query.teamMembers.findFirst).mockResolvedValue(mockMembers[0]);

      const request = createRequest("DELETE", undefined, { memberId: "member-1" });
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Cannot remove owner");
    });

    it("should return 403 when manager tries to remove another manager", async () => {
      vi.mocked(getApiContext).mockResolvedValue({
        success: true,
        context: {
          userId: "user-2",
          tenantId: "tenant-1",
          tenantRole: "manager",
        },
      });
      vi.mocked(hasTenantAdminAccess).mockReturnValue(true);
      vi.mocked(db.query.teamMembers.findFirst).mockResolvedValue({
        id: "member-4",
        tenantId: "tenant-1",
        userId: "user-4",
        role: "manager",
      });

      const request = createRequest("DELETE", undefined, { memberId: "member-4" });
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Managers cannot remove other managers");
    });
  });

  describe("DELETE /api/v1/team/members - Happy paths", () => {
    it("should delete member successfully as owner", async () => {
      vi.mocked(getApiContext).mockResolvedValue({
        success: true,
        context: {
          userId: "user-1",
          tenantId: "tenant-1",
          tenantRole: "owner",
        },
      });
      vi.mocked(hasTenantAdminAccess).mockReturnValue(true);
      vi.mocked(db.query.teamMembers.findFirst).mockResolvedValue(mockMembers[2]);

      const mockWhere = vi.fn().mockResolvedValue(undefined);
      vi.mocked(db.delete).mockReturnValue({ where: mockWhere } as never);

      const request = createRequest("DELETE", undefined, { memberId: "member-3" });
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("should allow manager to remove regular member", async () => {
      vi.mocked(getApiContext).mockResolvedValue({
        success: true,
        context: {
          userId: "user-2",
          tenantId: "tenant-1",
          tenantRole: "manager",
        },
      });
      vi.mocked(hasTenantAdminAccess).mockReturnValue(true);
      vi.mocked(db.query.teamMembers.findFirst).mockResolvedValue(mockMembers[2]);

      const mockWhere = vi.fn().mockResolvedValue(undefined);
      vi.mocked(db.delete).mockReturnValue({ where: mockWhere } as never);

      const request = createRequest("DELETE", undefined, { memberId: "member-3" });
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("should allow owner to remove manager", async () => {
      vi.mocked(getApiContext).mockResolvedValue({
        success: true,
        context: {
          userId: "user-1",
          tenantId: "tenant-1",
          tenantRole: "owner",
        },
      });
      vi.mocked(hasTenantAdminAccess).mockReturnValue(true);
      vi.mocked(db.query.teamMembers.findFirst).mockResolvedValue(mockMembers[1]);

      const mockWhere = vi.fn().mockResolvedValue(undefined);
      vi.mocked(db.delete).mockReturnValue({ where: mockWhere } as never);

      const request = createRequest("DELETE", undefined, { memberId: "member-2" });
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
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
      vi.mocked(isTenantOwner).mockReturnValue(true);
      vi.mocked(db.query.teamMembers.findFirst).mockRejectedValue(
        new Error("Database error")
      );

      const request = createRequest("PATCH", {
        memberId: "member-2",
        role: "member",
      });
      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal error");
    });

    it("DELETE should return 500 on internal error", async () => {
      vi.mocked(getApiContext).mockResolvedValue({
        success: true,
        context: {
          userId: "user-1",
          tenantId: "tenant-1",
          tenantRole: "owner",
        },
      });
      vi.mocked(hasTenantAdminAccess).mockReturnValue(true);
      vi.mocked(db.query.teamMembers.findFirst).mockRejectedValue(
        new Error("Database error")
      );

      const request = createRequest("DELETE", undefined, { memberId: "member-2" });
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal error");
    });
  });
});
