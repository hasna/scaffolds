import { describe, it, expect } from "vitest";
import * as schema from "./index";

describe("Database Schema", () => {
  describe("users schema", () => {
    it("should export users table", () => {
      expect(schema.users).toBeDefined();
    });

    it("should export usersRelations", () => {
      expect(schema.usersRelations).toBeDefined();
    });

    it("should export userRoleEnum", () => {
      expect(schema.userRoleEnum).toBeDefined();
    });
  });

  describe("auth schema", () => {
    it("should export accounts table", () => {
      expect(schema.accounts).toBeDefined();
    });

    it("should export sessions table", () => {
      expect(schema.sessions).toBeDefined();
    });

    it("should export verificationTokens table", () => {
      expect(schema.verificationTokens).toBeDefined();
    });

    it("should export passwordResetTokens table", () => {
      expect(schema.passwordResetTokens).toBeDefined();
    });

    it("should export apiKeys table", () => {
      expect(schema.apiKeys).toBeDefined();
    });
  });

  describe("competition schema", () => {
    it("should export competitions table", () => {
      expect(schema.competitions).toBeDefined();
    });

    it("should export teams table", () => {
      expect(schema.teams).toBeDefined();
    });

    it("should export teamMembers table", () => {
      expect(schema.teamMembers).toBeDefined();
    });

    it("should export submissions table", () => {
      expect(schema.submissions).toBeDefined();
    });

    it("should export judges table", () => {
      expect(schema.judges).toBeDefined();
    });

    it("should export scores table", () => {
      expect(schema.scores).toBeDefined();
    });

    it("should export competition status enum", () => {
      expect(schema.competitionStatusEnum).toBeDefined();
    });

    it("should export submission status enum", () => {
      expect(schema.submissionStatusEnum).toBeDefined();
    });

    it("should export team member role enum", () => {
      expect(schema.teamMemberRoleEnum).toBeDefined();
    });

    it("should export competition relations", () => {
      expect(schema.competitionsRelations).toBeDefined();
      expect(schema.teamsRelations).toBeDefined();
      expect(schema.teamMembersRelations).toBeDefined();
      expect(schema.submissionsRelations).toBeDefined();
      expect(schema.judgesRelations).toBeDefined();
      expect(schema.scoresRelations).toBeDefined();
    });
  });

  describe("audit schema", () => {
    it("should export auditLogs table", () => {
      expect(schema.auditLogs).toBeDefined();
    });

    it("should export notifications table", () => {
      expect(schema.notifications).toBeDefined();
    });
  });

  describe("webhooks schema", () => {
    it("should export webhooks table", () => {
      expect(schema.webhooks).toBeDefined();
    });

    it("should export webhookDeliveries table", () => {
      expect(schema.webhookDeliveries).toBeDefined();
    });

    it("should export webhookDeliveryStatusEnum", () => {
      expect(schema.webhookDeliveryStatusEnum).toBeDefined();
    });
  });

  describe("feature-flags schema", () => {
    it("should export featureFlags table", () => {
      expect(schema.featureFlags).toBeDefined();
    });
  });
});

describe("Schema Tables Structure", () => {
  it("should have all core tables", () => {
    const coreTables = [
      "users",
      "accounts",
      "sessions",
      "competitions",
      "teams",
      "teamMembers",
      "submissions",
      "judges",
      "scores",
      "webhooks",
      "auditLogs",
    ];

    coreTables.forEach((tableName) => {
      expect(schema[tableName as keyof typeof schema]).toBeDefined();
    });
  });
});
