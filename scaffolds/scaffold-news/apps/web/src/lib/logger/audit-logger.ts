/**
 * Audit logging for tracking important user actions
 * Used for compliance, security monitoring, and debugging
 */

import { logger } from "./index";

export type AuditAction =
  // Authentication
  | "auth.login"
  | "auth.logout"
  | "auth.register"
  | "auth.password_reset_request"
  | "auth.password_reset_complete"
  | "auth.2fa_enable"
  | "auth.2fa_disable"
  | "auth.2fa_verify"
  | "auth.session_revoke"
  // User management
  | "user.create"
  | "user.update"
  | "user.delete"
  | "user.invite"
  | "user.role_change"
  // Team management
  | "team.create"
  | "team.update"
  | "team.delete"
  | "team.member_add"
  | "team.member_remove"
  | "team.member_role_change"
  // Billing
  | "billing.subscription_create"
  | "billing.subscription_update"
  | "billing.subscription_cancel"
  | "billing.payment_method_add"
  | "billing.payment_method_remove"
  | "billing.invoice_paid"
  // API
  | "api.key_create"
  | "api.key_revoke"
  | "api.webhook_create"
  | "api.webhook_update"
  | "api.webhook_delete"
  // Data
  | "data.export"
  | "data.import"
  | "data.delete"
  // Settings
  | "settings.update"
  | "settings.feature_flag_toggle"
  // Admin
  | "admin.user_impersonate"
  | "admin.config_change";

export type AuditStatus = "success" | "failure" | "pending";

interface AuditLogEntry {
  action: AuditAction;
  status: AuditStatus;
  userId?: string;
  targetId?: string;
  targetType?: string;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, unknown>;
  reason?: string;
}

const auditLogger = logger.child({ type: "audit" });

/**
 * Log an audit event
 */
export function audit(entry: AuditLogEntry): void {
  const { action, status, ...rest } = entry;

  const level = status === "failure" ? "warn" : "info";

  auditLogger[level](`[AUDIT] ${action} - ${status}`, {
    auditAction: action,
    auditStatus: status,
    ...rest,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Convenience methods for common audit events
 */
export const auditLog = {
  // Authentication
  loginSuccess: (userId: string, ipAddress?: string, userAgent?: string) =>
    audit({
      action: "auth.login",
      status: "success",
      userId,
      ipAddress,
      userAgent,
    }),

  loginFailure: (email: string, reason: string, ipAddress?: string) =>
    audit({
      action: "auth.login",
      status: "failure",
      details: { email },
      reason,
      ipAddress,
    }),

  logout: (userId: string) =>
    audit({
      action: "auth.logout",
      status: "success",
      userId,
    }),

  register: (userId: string, email: string) =>
    audit({
      action: "auth.register",
      status: "success",
      userId,
      details: { email },
    }),

  passwordResetRequest: (email: string, ipAddress?: string) =>
    audit({
      action: "auth.password_reset_request",
      status: "success",
      details: { email },
      ipAddress,
    }),

  passwordResetComplete: (userId: string) =>
    audit({
      action: "auth.password_reset_complete",
      status: "success",
      userId,
    }),

  twoFactorEnable: (userId: string) =>
    audit({
      action: "auth.2fa_enable",
      status: "success",
      userId,
    }),

  twoFactorDisable: (userId: string) =>
    audit({
      action: "auth.2fa_disable",
      status: "success",
      userId,
    }),

  // User management
  userCreate: (adminId: string, targetUserId: string, details?: Record<string, unknown>) =>
    audit({
      action: "user.create",
      status: "success",
      userId: adminId,
      targetId: targetUserId,
      targetType: "user",
      details,
    }),

  userUpdate: (userId: string, targetUserId: string, changes: Record<string, unknown>) =>
    audit({
      action: "user.update",
      status: "success",
      userId,
      targetId: targetUserId,
      targetType: "user",
      details: { changes },
    }),

  userDelete: (adminId: string, targetUserId: string) =>
    audit({
      action: "user.delete",
      status: "success",
      userId: adminId,
      targetId: targetUserId,
      targetType: "user",
    }),

  userRoleChange: (adminId: string, targetUserId: string, oldRole: string, newRole: string) =>
    audit({
      action: "user.role_change",
      status: "success",
      userId: adminId,
      targetId: targetUserId,
      targetType: "user",
      details: { oldRole, newRole },
    }),

  // Team management
  teamCreate: (userId: string, teamId: string, teamName: string) =>
    audit({
      action: "team.create",
      status: "success",
      userId,
      targetId: teamId,
      targetType: "team",
      details: { teamName },
    }),

  teamMemberAdd: (userId: string, teamId: string, memberId: string, role: string) =>
    audit({
      action: "team.member_add",
      status: "success",
      userId,
      targetId: teamId,
      targetType: "team",
      details: { memberId, role },
    }),

  teamMemberRemove: (userId: string, teamId: string, memberId: string) =>
    audit({
      action: "team.member_remove",
      status: "success",
      userId,
      targetId: teamId,
      targetType: "team",
      details: { memberId },
    }),

  // Billing
  subscriptionCreate: (userId: string, planId: string, subscriptionId: string) =>
    audit({
      action: "billing.subscription_create",
      status: "success",
      userId,
      targetId: subscriptionId,
      targetType: "subscription",
      details: { planId },
    }),

  subscriptionCancel: (userId: string, subscriptionId: string, reason?: string) =>
    audit({
      action: "billing.subscription_cancel",
      status: "success",
      userId,
      targetId: subscriptionId,
      targetType: "subscription",
      reason,
    }),

  // API
  apiKeyCreate: (userId: string, keyId: string, keyName: string) =>
    audit({
      action: "api.key_create",
      status: "success",
      userId,
      targetId: keyId,
      targetType: "api_key",
      details: { keyName },
    }),

  apiKeyRevoke: (userId: string, keyId: string) =>
    audit({
      action: "api.key_revoke",
      status: "success",
      userId,
      targetId: keyId,
      targetType: "api_key",
    }),

  // Data
  dataExport: (userId: string, exportType: string, details?: Record<string, unknown>) =>
    audit({
      action: "data.export",
      status: "success",
      userId,
      details: { exportType, ...details },
    }),

  // Settings
  settingsUpdate: (userId: string, settingKey: string, oldValue: unknown, newValue: unknown) =>
    audit({
      action: "settings.update",
      status: "success",
      userId,
      details: { settingKey, oldValue, newValue },
    }),

  featureFlagToggle: (adminId: string, flagKey: string, enabled: boolean) =>
    audit({
      action: "settings.feature_flag_toggle",
      status: "success",
      userId: adminId,
      details: { flagKey, enabled },
    }),

  // Admin
  userImpersonate: (adminId: string, targetUserId: string) =>
    audit({
      action: "admin.user_impersonate",
      status: "success",
      userId: adminId,
      targetId: targetUserId,
      targetType: "user",
    }),
};
