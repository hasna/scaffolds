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

  describe("tenants schema", () => {
    it("should export tenants table", () => {
      expect(schema.tenants).toBeDefined();
    });

    it("should export tenantsRelations", () => {
      expect(schema.tenantsRelations).toBeDefined();
    });
  });

  describe("team-members schema", () => {
    it("should export teamMembers table", () => {
      expect(schema.teamMembers).toBeDefined();
    });

    it("should export teamInvitations table", () => {
      expect(schema.teamInvitations).toBeDefined();
    });

    it("should export teamMembersRelations", () => {
      expect(schema.teamMembersRelations).toBeDefined();
    });

    it("should export teamRoleEnum", () => {
      expect(schema.teamRoleEnum).toBeDefined();
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

    it("should export accountsRelations", () => {
      expect(schema.accountsRelations).toBeDefined();
    });

    it("should export sessionsRelations", () => {
      expect(schema.sessionsRelations).toBeDefined();
    });

    it("should export apiKeysRelations", () => {
      expect(schema.apiKeysRelations).toBeDefined();
    });
  });

  describe("billing schema", () => {
    it("should export pricingPlans table", () => {
      expect(schema.pricingPlans).toBeDefined();
    });

    it("should export subscriptions table", () => {
      expect(schema.subscriptions).toBeDefined();
    });

    it("should export invoices table", () => {
      expect(schema.invoices).toBeDefined();
    });

    it("should export subscriptionStatusEnum", () => {
      expect(schema.subscriptionStatusEnum).toBeDefined();
    });

    it("should export pricingPlansRelations", () => {
      expect(schema.pricingPlansRelations).toBeDefined();
    });

    it("should export subscriptionsRelations", () => {
      expect(schema.subscriptionsRelations).toBeDefined();
    });

    it("should export invoicesRelations", () => {
      expect(schema.invoicesRelations).toBeDefined();
    });
  });

  describe("webhooks schema", () => {
    it("should export webhooks table", () => {
      expect(schema.webhooks).toBeDefined();
    });

    it("should export webhookDeliveries table", () => {
      expect(schema.webhookDeliveries).toBeDefined();
    });

    it("should export webhookEvents table", () => {
      expect(schema.webhookEvents).toBeDefined();
    });

    it("should export webhookDeliveryStatusEnum", () => {
      expect(schema.webhookDeliveryStatusEnum).toBeDefined();
    });

    it("should export webhooksRelations", () => {
      expect(schema.webhooksRelations).toBeDefined();
    });

    it("should export webhookDeliveriesRelations", () => {
      expect(schema.webhookDeliveriesRelations).toBeDefined();
    });
  });

  describe("assistant schema", () => {
    it("should export assistantThreads table", () => {
      expect(schema.assistantThreads).toBeDefined();
    });

    it("should export assistantMessages table", () => {
      expect(schema.assistantMessages).toBeDefined();
    });

    it("should export assistantUsage table", () => {
      expect(schema.assistantUsage).toBeDefined();
    });

    it("should export assistantThreadsRelations", () => {
      expect(schema.assistantThreadsRelations).toBeDefined();
    });

    it("should export assistantMessagesRelations", () => {
      expect(schema.assistantMessagesRelations).toBeDefined();
    });

    it("should export assistantUsageRelations", () => {
      expect(schema.assistantUsageRelations).toBeDefined();
    });
  });

  describe("assistant-config schema", () => {
    it("should export assistantConfig table", () => {
      expect(schema.assistantConfig).toBeDefined();
    });

    it("should export assistantConfigRelations", () => {
      expect(schema.assistantConfigRelations).toBeDefined();
    });
  });

  describe("audit schema", () => {
    it("should export auditLogs table", () => {
      expect(schema.auditLogs).toBeDefined();
    });

    it("should export notifications table", () => {
      expect(schema.notifications).toBeDefined();
    });

    it("should export auditLogsRelations", () => {
      expect(schema.auditLogsRelations).toBeDefined();
    });

    it("should export notificationsRelations", () => {
      expect(schema.notificationsRelations).toBeDefined();
    });
  });

  describe("feature-flags schema", () => {
    it("should export featureFlags table", () => {
      expect(schema.featureFlags).toBeDefined();
    });

    it("should export planFeatures table", () => {
      expect(schema.planFeatures).toBeDefined();
    });

    it("should export featureFlagsRelations", () => {
      expect(schema.featureFlagsRelations).toBeDefined();
    });

    it("should export planFeaturesRelations", () => {
      expect(schema.planFeaturesRelations).toBeDefined();
    });
  });

  describe("cms schema", () => {
    it("should export cmsPages table", () => {
      expect(schema.cmsPages).toBeDefined();
    });

    it("should export cmsSections table", () => {
      expect(schema.cmsSections).toBeDefined();
    });

    it("should export cmsImages table", () => {
      expect(schema.cmsImages).toBeDefined();
    });

    it("should export blogPosts table", () => {
      expect(schema.blogPosts).toBeDefined();
    });

    it("should export blogCategories table", () => {
      expect(schema.blogCategories).toBeDefined();
    });

    it("should export changelogEntries table", () => {
      expect(schema.changelogEntries).toBeDefined();
    });

    it("should export docsPages table", () => {
      expect(schema.docsPages).toBeDefined();
    });

    it("should export cmsPagesRelations", () => {
      expect(schema.cmsPagesRelations).toBeDefined();
    });

    it("should export cmsSectionsRelations", () => {
      expect(schema.cmsSectionsRelations).toBeDefined();
    });

    it("should export blogPostsRelations", () => {
      expect(schema.blogPostsRelations).toBeDefined();
    });

    it("should export docsPagesRelations", () => {
      expect(schema.docsPagesRelations).toBeDefined();
    });

    it("should export cms enums", () => {
      expect(schema.cmsPageStatusEnum).toBeDefined();
      expect(schema.blogPostStatusEnum).toBeDefined();
      expect(schema.changelogTypeEnum).toBeDefined();
    });
  });
});

describe("Schema Enums", () => {
  describe("userRoleEnum", () => {
    it("should have user role", () => {
      expect(schema.userRoleEnum).toBeDefined();
    });
  });

  describe("teamRoleEnum", () => {
    it("should have team role", () => {
      expect(schema.teamRoleEnum).toBeDefined();
    });
  });

  describe("subscriptionStatusEnum", () => {
    it("should have subscription status", () => {
      expect(schema.subscriptionStatusEnum).toBeDefined();
    });
  });

  describe("webhookDeliveryStatusEnum", () => {
    it("should have webhook delivery status", () => {
      expect(schema.webhookDeliveryStatusEnum).toBeDefined();
    });
  });
});

describe("Schema Tables Structure", () => {
  it("should have all core tables", () => {
    const coreTables = [
      "users",
      "tenants",
      "teamMembers",
      "accounts",
      "sessions",
      "pricingPlans",
      "subscriptions",
      "webhooks",
      "auditLogs",
    ];

    coreTables.forEach((tableName) => {
      expect(schema[tableName as keyof typeof schema]).toBeDefined();
    });
  });

  it("should have all relation exports", () => {
    const relations = [
      "usersRelations",
      "tenantsRelations",
      "teamMembersRelations",
      "accountsRelations",
      "sessionsRelations",
      "webhooksRelations",
    ];

    relations.forEach((relationName) => {
      expect(schema[relationName as keyof typeof schema]).toBeDefined();
    });
  });
});
