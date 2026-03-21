import { Job } from "bullmq";
import { db } from "@scaffold-saas/database/client";
import * as schema from "@scaffold-saas/database/schema";
import { lt, and, eq, isNull } from "drizzle-orm";
import { logger } from "../lib/logger";

interface CleanupExpiredTokensData {
  type: "cleanup-expired-tokens";
}

interface CleanupOldDeliveriesData {
  type: "cleanup-old-deliveries";
  retentionDays: number;
}

interface CleanupOldAuditLogsData {
  type: "cleanup-old-audit-logs";
  retentionDays: number;
}

interface CleanupUnverifiedUsersData {
  type: "cleanup-unverified-users";
  olderThanDays: number;
}

export type CleanupJobData =
  | CleanupExpiredTokensData
  | CleanupOldDeliveriesData
  | CleanupOldAuditLogsData
  | CleanupUnverifiedUsersData;

export async function processCleanupJob(job: Job<CleanupJobData>) {
  const { data } = job;

  logger.info("Processing cleanup job", { type: data.type });

  switch (data.type) {
    case "cleanup-expired-tokens":
      return await cleanupExpiredTokens();

    case "cleanup-old-deliveries":
      return await cleanupOldDeliveries(data.retentionDays);

    case "cleanup-old-audit-logs":
      return await cleanupOldAuditLogs(data.retentionDays);

    case "cleanup-unverified-users":
      return await cleanupUnverifiedUsers(data.olderThanDays);
  }
}

async function cleanupExpiredTokens() {
  const now = new Date();

  // Cleanup expired password reset tokens
  const passwordTokens = await db
    .delete(schema.passwordResetTokens)
    .where(lt(schema.passwordResetTokens.expiresAt, now))
    .returning({ id: schema.passwordResetTokens.id });

  // Cleanup expired verification tokens
  const verificationTokens = await db
    .delete(schema.verificationTokens)
    .where(lt(schema.verificationTokens.expiresAt, now))
    .returning({ identifier: schema.verificationTokens.identifier });

  // Cleanup expired team invitations (only pending ones - those not yet accepted)
  const invitations = await db
    .delete(schema.teamInvitations)
    .where(
      and(
        lt(schema.teamInvitations.expiresAt, now),
        isNull(schema.teamInvitations.acceptedAt)
      )
    )
    .returning({ id: schema.teamInvitations.id });

  logger.info("Expired tokens cleaned up", {
    passwordTokens: passwordTokens.length,
    verificationTokens: verificationTokens.length,
    invitations: invitations.length,
  });

  return {
    passwordTokens: passwordTokens.length,
    verificationTokens: verificationTokens.length,
    invitations: invitations.length,
  };
}

async function cleanupOldDeliveries(retentionDays: number) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  const deleted = await db
    .delete(schema.webhookDeliveries)
    .where(lt(schema.webhookDeliveries.createdAt, cutoffDate))
    .returning({ id: schema.webhookDeliveries.id });

  logger.info("Old webhook deliveries cleaned up", {
    deleted: deleted.length,
    retentionDays,
  });

  return { deleted: deleted.length };
}

async function cleanupOldAuditLogs(retentionDays: number) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  const deleted = await db
    .delete(schema.auditLogs)
    .where(lt(schema.auditLogs.createdAt, cutoffDate))
    .returning({ id: schema.auditLogs.id });

  logger.info("Old audit logs cleaned up", {
    deleted: deleted.length,
    retentionDays,
  });

  return { deleted: deleted.length };
}

async function cleanupUnverifiedUsers(olderThanDays: number) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

  // Find unverified users older than cutoff
  const unverifiedUsers = await db.query.users.findMany({
    where: and(
      isNull(schema.users.emailVerifiedAt),
      lt(schema.users.createdAt, cutoffDate)
    ),
    columns: { id: true, email: true },
  });

  let deleted = 0;

  for (const user of unverifiedUsers) {
    try {
      // Delete user's sessions
      await db.delete(schema.sessions).where(eq(schema.sessions.userId, user.id));

      // Delete user's accounts
      await db.delete(schema.accounts).where(eq(schema.accounts.userId, user.id));

      // Delete user
      await db.delete(schema.users).where(eq(schema.users.id, user.id));

      deleted++;
    } catch (error) {
      logger.error("Failed to delete unverified user", {
        userId: user.id,
        error: String(error),
      });
    }
  }

  logger.info("Unverified users cleaned up", {
    deleted,
    olderThanDays,
  });

  return { deleted };
}
