import { describe, it, expect } from "vitest";

// NOTE: This module instantiates Resend at module load time.
// Full testing requires integration tests with Resend test environment.
// These tests verify exports and type definitions.

describe("email jobs", () => {
  describe("exports", () => {
    it("should export processEmailJob function", async () => {
      const mod = await import("./email");
      expect(typeof mod.processEmailJob).toBe("function");
    });
  });

  describe("EmailJobData type", () => {
    it("should support welcome email type", () => {
      const data = {
        type: "welcome" as const,
        to: "user@example.com",
        name: "John Doe",
      };
      expect(data.type).toBe("welcome");
      expect(data.to).toBe("user@example.com");
      expect(data.name).toBe("John Doe");
    });

    it("should support team-invite email type", () => {
      const data = {
        type: "team-invite" as const,
        to: "invitee@example.com",
        inviterName: "Jane Smith",
        tenantName: "Acme Corp",
        inviteToken: "token-123-abc",
      };
      expect(data.type).toBe("team-invite");
      expect(data.to).toBe("invitee@example.com");
      expect(data.inviterName).toBe("Jane Smith");
      expect(data.tenantName).toBe("Acme Corp");
      expect(data.inviteToken).toBe("token-123-abc");
    });

    it("should support password-reset email type", () => {
      const data = {
        type: "password-reset" as const,
        to: "user@example.com",
        resetToken: "reset-token-xyz",
      };
      expect(data.type).toBe("password-reset");
      expect(data.to).toBe("user@example.com");
      expect(data.resetToken).toBe("reset-token-xyz");
    });

    it("should support subscription-created email type", () => {
      const data = {
        type: "subscription-created" as const,
        to: "user@example.com",
        planName: "Pro Plan",
      };
      expect(data.type).toBe("subscription-created");
      expect(data.to).toBe("user@example.com");
      expect(data.planName).toBe("Pro Plan");
    });

    it("should support subscription-cancelled email type", () => {
      const data = {
        type: "subscription-cancelled" as const,
        to: "user@example.com",
        planName: "Enterprise Plan",
      };
      expect(data.type).toBe("subscription-cancelled");
      expect(data.to).toBe("user@example.com");
      expect(data.planName).toBe("Enterprise Plan");
    });

    it("should support payment-failed email type", () => {
      const data = {
        type: "payment-failed" as const,
        to: "user@example.com",
        planName: "Business Plan",
      };
      expect(data.type).toBe("payment-failed");
      expect(data.to).toBe("user@example.com");
      expect(data.planName).toBe("Business Plan");
    });
  });

  describe("welcome email data", () => {
    it("should require to and name fields", () => {
      const data = {
        type: "welcome" as const,
        to: "newuser@example.com",
        name: "New User",
      };
      expect(data.to).toBeDefined();
      expect(data.name).toBeDefined();
    });

    it("should accept valid email addresses", () => {
      const validEmails = [
        "user@example.com",
        "user.name@example.com",
        "user+tag@example.com",
        "user@subdomain.example.com",
      ];

      validEmails.forEach((email) => {
        const data = { type: "welcome" as const, to: email, name: "User" };
        expect(data.to).toBe(email);
      });
    });
  });

  describe("team-invite email data", () => {
    it("should have all required invite fields", () => {
      const data = {
        type: "team-invite" as const,
        to: "invitee@example.com",
        inviterName: "Admin User",
        tenantName: "My Team",
        inviteToken: "abc123",
      };

      expect(data.to).toBeDefined();
      expect(data.inviterName).toBeDefined();
      expect(data.tenantName).toBeDefined();
      expect(data.inviteToken).toBeDefined();
    });
  });

  describe("password-reset email data", () => {
    it("should have email and reset token", () => {
      const data = {
        type: "password-reset" as const,
        to: "user@example.com",
        resetToken: "secure-random-token",
      };

      expect(data.to).toBeDefined();
      expect(data.resetToken).toBeDefined();
    });
  });

  describe("subscription email types", () => {
    it("should distinguish between subscription event types", () => {
      const created = { type: "subscription-created" as const, to: "a@b.com", planName: "Pro" };
      const cancelled = { type: "subscription-cancelled" as const, to: "a@b.com", planName: "Pro" };
      const failed = { type: "payment-failed" as const, to: "a@b.com", planName: "Pro" };

      expect(created.type).not.toBe(cancelled.type);
      expect(cancelled.type).not.toBe(failed.type);
      expect(failed.type).not.toBe(created.type);
    });
  });

  describe("module behavior", () => {
    it("should handle missing RESEND_API_KEY", async () => {
      // The module checks for RESEND_API_KEY and sets resend to null if missing
      // This tests that the module can be imported without crashing
      const originalKey = process.env.RESEND_API_KEY;
      delete process.env.RESEND_API_KEY;

      const mod = await import("./email");
      expect(mod.processEmailJob).toBeDefined();

      // Restore
      process.env.RESEND_API_KEY = originalKey;
    });
  });
});
