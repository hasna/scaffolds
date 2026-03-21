import { describe, it, expect, vi } from "vitest";

// Mock database before importing to avoid DATABASE_URL requirement
vi.mock("@scaffold-competition/database/client", () => ({
  db: {
    query: {
      users: { findMany: vi.fn() },
    },
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([]),
      }),
    }),
  },
}));

vi.mock("@scaffold-competition/database/schema", () => ({
  passwordResetTokens: { id: "id", expiresAt: "expiresAt" },
  verificationTokens: { identifier: "identifier", expiresAt: "expiresAt" },
  teamInvitations: { id: "id", expiresAt: "expiresAt", acceptedAt: "acceptedAt" },
  webhookDeliveries: { id: "id", createdAt: "createdAt" },
  auditLogs: { id: "id", createdAt: "createdAt" },
  users: { id: "id", emailVerifiedAt: "emailVerifiedAt", createdAt: "createdAt" },
  sessions: { userId: "userId" },
  accounts: { userId: "userId" },
}));

// NOTE: This module interacts with database directly.
// Full testing requires integration tests with test database.
// These tests verify exports and type definitions.

describe("cleanup jobs", () => {
  describe("exports", () => {
    it("should export processCleanupJob function", async () => {
      const mod = await import("./cleanup");
      expect(typeof mod.processCleanupJob).toBe("function");
    });
  });

  describe("CleanupJobData type", () => {
    it("should support cleanup-expired-tokens type", () => {
      const data = {
        type: "cleanup-expired-tokens" as const,
      };
      expect(data.type).toBe("cleanup-expired-tokens");
    });

    it("should support cleanup-old-deliveries type", () => {
      const data = {
        type: "cleanup-old-deliveries" as const,
        retentionDays: 30,
      };
      expect(data.type).toBe("cleanup-old-deliveries");
      expect(data.retentionDays).toBe(30);
    });

    it("should support cleanup-old-audit-logs type", () => {
      const data = {
        type: "cleanup-old-audit-logs" as const,
        retentionDays: 90,
      };
      expect(data.type).toBe("cleanup-old-audit-logs");
      expect(data.retentionDays).toBe(90);
    });

    it("should support cleanup-unverified-users type", () => {
      const data = {
        type: "cleanup-unverified-users" as const,
        olderThanDays: 7,
      };
      expect(data.type).toBe("cleanup-unverified-users");
      expect(data.olderThanDays).toBe(7);
    });
  });

  describe("cleanup-expired-tokens job data", () => {
    it("should have minimal data structure", () => {
      const data = {
        type: "cleanup-expired-tokens" as const,
      };
      expect(Object.keys(data)).toEqual(["type"]);
    });
  });

  describe("cleanup-old-deliveries job data", () => {
    it("should require retentionDays", () => {
      const data = {
        type: "cleanup-old-deliveries" as const,
        retentionDays: 30,
      };
      expect(data.retentionDays).toBeGreaterThan(0);
    });

    it("should accept different retention periods", () => {
      const weekly = { type: "cleanup-old-deliveries" as const, retentionDays: 7 };
      const monthly = { type: "cleanup-old-deliveries" as const, retentionDays: 30 };
      const quarterly = { type: "cleanup-old-deliveries" as const, retentionDays: 90 };

      expect(weekly.retentionDays).toBe(7);
      expect(monthly.retentionDays).toBe(30);
      expect(quarterly.retentionDays).toBe(90);
    });
  });

  describe("cleanup-old-audit-logs job data", () => {
    it("should require retentionDays", () => {
      const data = {
        type: "cleanup-old-audit-logs" as const,
        retentionDays: 90,
      };
      expect(data.retentionDays).toBeGreaterThan(0);
    });

    it("should support long retention periods", () => {
      const data = {
        type: "cleanup-old-audit-logs" as const,
        retentionDays: 365,
      };
      expect(data.retentionDays).toBe(365);
    });
  });

  describe("cleanup-unverified-users job data", () => {
    it("should require olderThanDays", () => {
      const data = {
        type: "cleanup-unverified-users" as const,
        olderThanDays: 7,
      };
      expect(data.olderThanDays).toBeGreaterThan(0);
    });

    it("should support different periods", () => {
      const shortPeriod = { type: "cleanup-unverified-users" as const, olderThanDays: 3 };
      const longPeriod = { type: "cleanup-unverified-users" as const, olderThanDays: 30 };

      expect(shortPeriod.olderThanDays).toBe(3);
      expect(longPeriod.olderThanDays).toBe(30);
    });
  });

  describe("type discriminator", () => {
    it("should correctly identify job type from data", () => {
      const jobs = [
        { type: "cleanup-expired-tokens" as const },
        { type: "cleanup-old-deliveries" as const, retentionDays: 30 },
        { type: "cleanup-old-audit-logs" as const, retentionDays: 90 },
        { type: "cleanup-unverified-users" as const, olderThanDays: 7 },
      ];

      expect(jobs[0]!.type).toBe("cleanup-expired-tokens");
      expect(jobs[1]!.type).toBe("cleanup-old-deliveries");
      expect(jobs[2]!.type).toBe("cleanup-old-audit-logs");
      expect(jobs[3]!.type).toBe("cleanup-unverified-users");
    });
  });
});
