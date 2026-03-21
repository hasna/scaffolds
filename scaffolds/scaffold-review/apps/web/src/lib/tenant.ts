import { db } from "@scaffold-review/database/client";
import * as schema from "@scaffold-review/database/schema";
import { eq, and, isNull, count, gte } from "drizzle-orm";
import { type Session } from "next-auth";
import type { PlanLimits } from "@scaffold-review/database/schema";

/**
 * Get tenant by ID
 */
export async function getTenant(tenantId: string) {
  return db.query.tenants.findFirst({
    where: eq(schema.tenants.id, tenantId),
    with: {
      plan: true,
      subscription: true,
    },
  });
}

/**
 * Get tenant by slug
 */
export async function getTenantBySlug(slug: string) {
  return db.query.tenants.findFirst({
    where: eq(schema.tenants.slug, slug),
    with: {
      plan: true,
      subscription: true,
    },
  });
}

/**
 * Get user's team membership for a tenant
 */
export async function getTeamMember(tenantId: string, userId: string) {
  return db.query.teamMembers.findFirst({
    where: and(
      eq(schema.teamMembers.tenantId, tenantId),
      eq(schema.teamMembers.userId, userId)
    ),
  });
}

/**
 * Get all team members for a tenant
 */
export async function getTeamMembers(tenantId: string) {
  return db.query.teamMembers.findMany({
    where: eq(schema.teamMembers.tenantId, tenantId),
    with: {
      user: {
        columns: {
          id: true,
          email: true,
          name: true,
          avatarUrl: true,
        },
      },
    },
    orderBy: (tm, { asc }) => [asc(tm.joinedAt)],
  });
}

/**
 * Get user's tenants (teams they belong to)
 */
export async function getUserTenants(userId: string) {
  const memberships = await db.query.teamMembers.findMany({
    where: eq(schema.teamMembers.userId, userId),
    with: {
      tenant: {
        with: {
          plan: true,
        },
      },
    },
    orderBy: (tm, { desc }) => [desc(tm.joinedAt)],
  });

  return memberships.map((m) => ({
    ...m.tenant,
    role: m.role,
  }));
}

export type Permission =
  | "team:read"
  | "team:write"
  | "team:delete"
  | "team:invite"
  | "billing:read"
  | "billing:write"
  | "settings:read"
  | "settings:write"
  | "api_keys:read"
  | "api_keys:write"
  | "webhooks:read"
  | "webhooks:write";

/**
 * Check if user has permission in tenant
 */
export function hasPermission(
  session: Session | null,
  permission: Permission
): boolean {
  if (!session?.user?.tenantRole) return false;
  const roles = PERMISSIONS[permission];
  if (!roles) return false;
  return roles.includes(session.user.tenantRole);
}

type TenantRole = "member" | "manager" | "owner";

const PERMISSIONS: Record<string, readonly TenantRole[]> = {
  "team:read": ["member", "manager", "owner"],
  "team:write": ["manager", "owner"],
  "team:delete": ["owner"],
  "team:invite": ["manager", "owner"],
  "billing:read": ["owner"],
  "billing:write": ["owner"],
  "settings:read": ["member", "manager", "owner"],
  "settings:write": ["manager", "owner"],
  "api_keys:read": ["manager", "owner"],
  "api_keys:write": ["manager", "owner"],
  "webhooks:read": ["manager", "owner"],
  "webhooks:write": ["manager", "owner"],
};

/**
 * Update tenant settings
 */
export async function updateTenantSettings(
  tenantId: string,
  settings: Partial<schema.TenantSettings>
) {
  const tenant = await getTenant(tenantId);
  if (!tenant) throw new Error("Tenant not found");

  const [updated] = await db
    .update(schema.tenants)
    .set({
      settings: { ...tenant.settings, ...settings },
      updatedAt: new Date(),
    })
    .where(eq(schema.tenants.id, tenantId))
    .returning();

  return updated;
}

/**
 * Invite team member
 */
export async function inviteTeamMember(
  tenantId: string,
  email: string,
  role: "member" | "manager",
  invitedBy: string
) {
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const [invitation] = await db
    .insert(schema.teamInvitations)
    .values({
      tenantId,
      email: email as unknown as string,
      role,
      token,
      invitedBy,
      expiresAt,
    })
    .returning();

  return invitation;
}

/**
 * Accept team invitation
 */
export async function acceptTeamInvitation(token: string, userId: string) {
  const invitation = await db.query.teamInvitations.findFirst({
    where: eq(schema.teamInvitations.token, token),
  });

  if (!invitation || invitation.expiresAt < new Date() || invitation.acceptedAt) {
    throw new Error("Invalid or expired invitation");
  }

  // Add user to team
  await db.insert(schema.teamMembers).values({
    tenantId: invitation.tenantId,
    userId,
    role: invitation.role,
    invitedBy: invitation.invitedBy,
  });

  // Mark invitation as accepted
  await db
    .update(schema.teamInvitations)
    .set({ acceptedAt: new Date() })
    .where(eq(schema.teamInvitations.id, invitation.id));

  return invitation;
}

/**
 * Remove team member
 */
export async function removeTeamMember(tenantId: string, userId: string) {
  const member = await getTeamMember(tenantId, userId);
  if (!member) throw new Error("Member not found");
  if (member.role === "owner") throw new Error("Cannot remove owner");

  await db
    .delete(schema.teamMembers)
    .where(
      and(
        eq(schema.teamMembers.tenantId, tenantId),
        eq(schema.teamMembers.userId, userId)
      )
    );
}

/**
 * Update team member role
 */
export async function updateTeamMemberRole(
  tenantId: string,
  userId: string,
  role: "member" | "manager"
) {
  const member = await getTeamMember(tenantId, userId);
  if (!member) throw new Error("Member not found");
  if (member.role === "owner") throw new Error("Cannot change owner role");

  const [updated] = await db
    .update(schema.teamMembers)
    .set({ role })
    .where(
      and(
        eq(schema.teamMembers.tenantId, tenantId),
        eq(schema.teamMembers.userId, userId)
      )
    )
    .returning();

  return updated;
}

export interface LimitCheck {
  allowed: boolean;
  current: number;
  limit: number | null;
}

export interface TeamLimitCheck extends LimitCheck {
  pendingInvitations: number;
}

/**
 * Check if tenant can add more team members
 * Returns current count, limit, and whether adding another is allowed
 */
export async function checkTeamMemberLimit(
  tenantId: string
): Promise<TeamLimitCheck> {
  const tenant = await getTenant(tenantId);
  if (!tenant) {
    throw new Error("Tenant not found");
  }

  // Get current member count
  const memberCountResult = await db
    .select({ count: count() })
    .from(schema.teamMembers)
    .where(eq(schema.teamMembers.tenantId, tenantId));
  const currentMembers = memberCountResult[0]?.count ?? 0;

  // Get pending invitations count
  const invitationCountResult = await db
    .select({ count: count() })
    .from(schema.teamInvitations)
    .where(
      and(
        eq(schema.teamInvitations.tenantId, tenantId),
        isNull(schema.teamInvitations.acceptedAt)
      )
    );
  const pendingInvitations = invitationCountResult[0]?.count ?? 0;

  // Get limit from plan
  const limits = (tenant.plan?.limits as PlanLimits | null) ?? {};
  const teamMemberLimit = limits.teamMembers ?? null;

  // If no limit, allow unlimited
  if (teamMemberLimit === null) {
    return {
      allowed: true,
      current: currentMembers,
      limit: null,
      pendingInvitations,
    };
  }

  // Check if within limit (including pending invitations)
  const totalPotential = currentMembers + pendingInvitations;
  return {
    allowed: totalPotential < teamMemberLimit,
    current: currentMembers,
    limit: teamMemberLimit,
    pendingInvitations,
  };
}

/**
 * Check if tenant can create more API keys
 */
export async function checkApiKeyLimit(
  tenantId: string
): Promise<LimitCheck> {
  const tenant = await getTenant(tenantId);
  if (!tenant) {
    throw new Error("Tenant not found");
  }

  // Get current API key count
  const keyCountResult = await db
    .select({ count: count() })
    .from(schema.apiKeys)
    .where(eq(schema.apiKeys.tenantId, tenantId));
  const currentKeys = keyCountResult[0]?.count ?? 0;

  // Get limit from plan
  const limits = (tenant.plan?.limits as PlanLimits | null) ?? {};
  const apiKeyLimit = limits.apiKeys ?? null;

  // If no limit, allow unlimited
  if (apiKeyLimit === null) {
    return {
      allowed: true,
      current: currentKeys,
      limit: null,
    };
  }

  return {
    allowed: currentKeys < apiKeyLimit,
    current: currentKeys,
    limit: apiKeyLimit,
  };
}

/**
 * Check if tenant can create more webhooks
 */
export async function checkWebhookLimit(
  tenantId: string
): Promise<LimitCheck> {
  const tenant = await getTenant(tenantId);
  if (!tenant) {
    throw new Error("Tenant not found");
  }

  // Get current webhook count
  const webhookCountResult = await db
    .select({ count: count() })
    .from(schema.webhooks)
    .where(eq(schema.webhooks.tenantId, tenantId));
  const currentWebhooks = webhookCountResult[0]?.count ?? 0;

  // Get limit from plan
  const limits = (tenant.plan?.limits as PlanLimits | null) ?? {};
  const webhookLimit = limits.webhooks ?? null;

  // If no limit, allow unlimited
  if (webhookLimit === null) {
    return {
      allowed: true,
      current: currentWebhooks,
      limit: null,
    };
  }

  return {
    allowed: currentWebhooks < webhookLimit,
    current: currentWebhooks,
    limit: webhookLimit,
  };
}

/**
 * Check if tenant can send more assistant messages today
 */
export async function checkAssistantMessageLimit(
  tenantId: string
): Promise<LimitCheck> {
  const tenant = await getTenant(tenantId);
  if (!tenant) {
    throw new Error("Tenant not found");
  }

  // Get today's start (midnight UTC)
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  // Count today's messages for this tenant
  const usageResult = await db
    .select({ count: count() })
    .from(schema.assistantUsage)
    .where(
      and(
        eq(schema.assistantUsage.tenantId, tenantId),
        gte(schema.assistantUsage.createdAt, todayStart)
      )
    );
  const todayMessages = usageResult[0]?.count ?? 0;

  // Get limit from plan
  const limits = (tenant.plan?.limits as PlanLimits | null) ?? {};
  const messageLimit = limits.assistantMessages ?? null;

  // If no limit, allow unlimited
  if (messageLimit === null) {
    return {
      allowed: true,
      current: todayMessages,
      limit: null,
    };
  }

  return {
    allowed: todayMessages < messageLimit,
    current: todayMessages,
    limit: messageLimit,
  };
}
