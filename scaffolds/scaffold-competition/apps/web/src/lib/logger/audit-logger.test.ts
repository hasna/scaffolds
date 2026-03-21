// @ts-nocheck
import { describe, it, expect } from "vitest";
import { audit, auditLog } from "./audit-logger";

describe("audit-logger", () => {
  describe("audit", () => {
    it("should not throw for success action", () => {
      expect(() =>
        audit({
          action: "auth.login",
          status: "success",
          userId: "user-123",
        })
      ).not.toThrow();
    });

    it("should not throw for failure action", () => {
      expect(() =>
        audit({
          action: "auth.login",
          status: "failure",
          reason: "Invalid password",
        })
      ).not.toThrow();
    });

    it("should not throw for pending action", () => {
      expect(() =>
        audit({
          action: "data.export",
          status: "pending",
          userId: "user-123",
        })
      ).not.toThrow();
    });

    it("should accept all optional fields", () => {
      expect(() =>
        audit({
          action: "user.update",
          status: "success",
          userId: "admin-1",
          targetId: "user-2",
          targetType: "user",
          ipAddress: "192.168.1.1",
          userAgent: "Mozilla/5.0",
          details: { field: "name" },
          reason: "Admin request",
        })
      ).not.toThrow();
    });
  });

  describe("auditLog convenience methods", () => {
    describe("authentication", () => {
      it("loginSuccess should not throw", () => {
        expect(() =>
          auditLog.loginSuccess("user-123", "192.168.1.1", "Chrome")
        ).not.toThrow();
      });

      it("loginFailure should not throw", () => {
        expect(() =>
          auditLog.loginFailure("test@example.com", "Invalid password", "192.168.1.1")
        ).not.toThrow();
      });

      it("logout should not throw", () => {
        expect(() => auditLog.logout("user-123")).not.toThrow();
      });

      it("register should not throw", () => {
        expect(() =>
          auditLog.register("user-123", "test@example.com")
        ).not.toThrow();
      });

      it("passwordResetRequest should not throw", () => {
        expect(() =>
          auditLog.passwordResetRequest("test@example.com", "192.168.1.1")
        ).not.toThrow();
      });

      it("passwordResetComplete should not throw", () => {
        expect(() => auditLog.passwordResetComplete("user-123")).not.toThrow();
      });

      it("twoFactorEnable should not throw", () => {
        expect(() => auditLog.twoFactorEnable("user-123")).not.toThrow();
      });

      it("twoFactorDisable should not throw", () => {
        expect(() => auditLog.twoFactorDisable("user-123")).not.toThrow();
      });
    });

    describe("user management", () => {
      it("userCreate should not throw", () => {
        expect(() =>
          auditLog.userCreate("admin-1", "user-2", { email: "new@example.com" })
        ).not.toThrow();
      });

      it("userUpdate should not throw", () => {
        expect(() =>
          auditLog.userUpdate("user-1", "user-1", { name: "New Name" })
        ).not.toThrow();
      });

      it("userDelete should not throw", () => {
        expect(() => auditLog.userDelete("admin-1", "user-2")).not.toThrow();
      });

      it("userRoleChange should not throw", () => {
        expect(() =>
          auditLog.userRoleChange("admin-1", "user-2", "member", "manager")
        ).not.toThrow();
      });
    });

    describe("team management", () => {
      it("teamCreate should not throw", () => {
        expect(() =>
          auditLog.teamCreate("user-1", "team-1", "My Team")
        ).not.toThrow();
      });

      it("teamMemberAdd should not throw", () => {
        expect(() =>
          auditLog.teamMemberAdd("user-1", "team-1", "user-2", "member")
        ).not.toThrow();
      });

      it("teamMemberRemove should not throw", () => {
        expect(() =>
          auditLog.teamMemberRemove("user-1", "team-1", "user-2")
        ).not.toThrow();
      });
    });

    describe("billing", () => {
      it("subscriptionCreate should not throw", () => {
        expect(() =>
          auditLog.subscriptionCreate("user-1", "plan-pro", "sub-123")
        ).not.toThrow();
      });

      it("subscriptionCancel should not throw", () => {
        expect(() =>
          auditLog.subscriptionCancel("user-1", "sub-123", "Too expensive")
        ).not.toThrow();
      });
    });

    describe("API", () => {
      it("apiKeyCreate should not throw", () => {
        expect(() =>
          auditLog.apiKeyCreate("user-1", "key-123", "Production Key")
        ).not.toThrow();
      });

      it("apiKeyRevoke should not throw", () => {
        expect(() => auditLog.apiKeyRevoke("user-1", "key-123")).not.toThrow();
      });
    });

    describe("data", () => {
      it("dataExport should not throw", () => {
        expect(() =>
          auditLog.dataExport("user-1", "users", { format: "csv" })
        ).not.toThrow();
      });
    });

    describe("settings", () => {
      it("settingsUpdate should not throw", () => {
        expect(() =>
          auditLog.settingsUpdate("user-1", "notifications.email", true, false)
        ).not.toThrow();
      });

      it("featureFlagToggle should not throw", () => {
        expect(() =>
          auditLog.featureFlagToggle("admin-1", "new_dashboard", true)
        ).not.toThrow();
      });
    });

    describe("admin", () => {
      it("userImpersonate should not throw", () => {
        expect(() =>
          auditLog.userImpersonate("admin-1", "user-2")
        ).not.toThrow();
      });
    });
  });
});
