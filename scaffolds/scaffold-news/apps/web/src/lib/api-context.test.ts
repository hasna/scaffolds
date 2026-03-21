// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import {
  isTenantOwner,
  hasTenantAdminAccess,
  isSystemAdmin,
  isSuperAdmin,
  tenantScope,
  type ApiContext,
} from "./api-context";

// Mock auth and validateApiKey for later tests
vi.mock("./auth", () => ({
  auth: vi.fn(),
}));

vi.mock("./api-auth", () => ({
  validateApiKey: vi.fn(),
}));

describe("api-context", () => {
  describe("isTenantOwner", () => {
    it("should return true for session auth with owner role", () => {
      const context: ApiContext = {
        userId: "user-1",
        tenantId: "tenant-1",
        tenantRole: "owner",
        userRole: "user",
        authSource: "session",
      };
      expect(isTenantOwner(context)).toBe(true);
    });

    it("should return false for session auth with manager role", () => {
      const context: ApiContext = {
        userId: "user-1",
        tenantId: "tenant-1",
        tenantRole: "manager",
        userRole: "user",
        authSource: "session",
      };
      expect(isTenantOwner(context)).toBe(false);
    });

    it("should return false for session auth with member role", () => {
      const context: ApiContext = {
        userId: "user-1",
        tenantId: "tenant-1",
        tenantRole: "member",
        userRole: "user",
        authSource: "session",
      };
      expect(isTenantOwner(context)).toBe(false);
    });

    it("should return false for API key auth", () => {
      const context: ApiContext = {
        userId: "user-1",
        tenantId: "tenant-1",
        keyId: "key-1",
        authSource: "apikey",
      };
      expect(isTenantOwner(context)).toBe(false);
    });
  });

  describe("hasTenantAdminAccess", () => {
    it("should return true for owner role", () => {
      const context: ApiContext = {
        userId: "user-1",
        tenantId: "tenant-1",
        tenantRole: "owner",
        authSource: "session",
      };
      expect(hasTenantAdminAccess(context)).toBe(true);
    });

    it("should return true for manager role", () => {
      const context: ApiContext = {
        userId: "user-1",
        tenantId: "tenant-1",
        tenantRole: "manager",
        authSource: "session",
      };
      expect(hasTenantAdminAccess(context)).toBe(true);
    });

    it("should return false for member role", () => {
      const context: ApiContext = {
        userId: "user-1",
        tenantId: "tenant-1",
        tenantRole: "member",
        authSource: "session",
      };
      expect(hasTenantAdminAccess(context)).toBe(false);
    });

    it("should return true for API key auth", () => {
      const context: ApiContext = {
        userId: "user-1",
        tenantId: "tenant-1",
        keyId: "key-1",
        authSource: "apikey",
      };
      expect(hasTenantAdminAccess(context)).toBe(true);
    });
  });

  describe("isSystemAdmin", () => {
    it("should return true for admin role", () => {
      const context: ApiContext = {
        userId: "user-1",
        tenantId: "tenant-1",
        tenantRole: "member",
        userRole: "admin",
        authSource: "session",
      };
      expect(isSystemAdmin(context)).toBe(true);
    });

    it("should return true for super_admin role", () => {
      const context: ApiContext = {
        userId: "user-1",
        tenantId: "tenant-1",
        tenantRole: "member",
        userRole: "super_admin",
        authSource: "session",
      };
      expect(isSystemAdmin(context)).toBe(true);
    });

    it("should return false for user role", () => {
      const context: ApiContext = {
        userId: "user-1",
        tenantId: "tenant-1",
        tenantRole: "member",
        userRole: "user",
        authSource: "session",
      };
      expect(isSystemAdmin(context)).toBe(false);
    });

    it("should return false for API key auth", () => {
      const context: ApiContext = {
        userId: "user-1",
        tenantId: "tenant-1",
        keyId: "key-1",
        authSource: "apikey",
      };
      expect(isSystemAdmin(context)).toBe(false);
    });
  });

  describe("isSuperAdmin", () => {
    it("should return true for super_admin role", () => {
      const context: ApiContext = {
        userId: "user-1",
        tenantId: "tenant-1",
        tenantRole: "member",
        userRole: "super_admin",
        authSource: "session",
      };
      expect(isSuperAdmin(context)).toBe(true);
    });

    it("should return false for admin role", () => {
      const context: ApiContext = {
        userId: "user-1",
        tenantId: "tenant-1",
        tenantRole: "member",
        userRole: "admin",
        authSource: "session",
      };
      expect(isSuperAdmin(context)).toBe(false);
    });

    it("should return false for API key auth", () => {
      const context: ApiContext = {
        userId: "user-1",
        tenantId: "tenant-1",
        keyId: "key-1",
        authSource: "apikey",
      };
      expect(isSuperAdmin(context)).toBe(false);
    });
  });

  describe("tenantScope", () => {
    it("should create tenant-scoped where clause", () => {
      const context: ApiContext = {
        userId: "user-1",
        tenantId: "tenant-123",
        authSource: "session",
      };

      const table = { tenantId: "tenantId" };
      const eq = vi.fn().mockReturnValue("eq-result");

      const result = tenantScope(table, context, eq);

      expect(result).toEqual(["eq-result"]);
      expect(eq).toHaveBeenCalledWith("tenantId", "tenant-123");
    });
  });
});
