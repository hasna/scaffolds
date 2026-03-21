import { db } from "@scaffold-news/database/client";
import * as schema from "@scaffold-news/database/schema";
import { eq } from "drizzle-orm";

export async function emitWebhookEvent(
  tenantId: string,
  event: string,
  data: Record<string, unknown>
) {
  // Find all active webhooks for this tenant that subscribe to this event
  const webhooks = await db.query.webhooks.findMany({
    where: eq(schema.webhooks.tenantId, tenantId),
  });

  const subscribedWebhooks = webhooks.filter((w) => w.isActive && w.events.includes(event));

  if (subscribedWebhooks.length === 0) {
    return;
  }

  const payload: Record<string, unknown> = {
    event,
    timestamp: new Date().toISOString(),
    data,
  };

  // Create delivery records and queue jobs
  for (const webhook of subscribedWebhooks) {
    await db.insert(schema.webhookDeliveries).values({
      webhookId: webhook.id,
      eventType: event,
      payload,
      status: "pending",
    });

    // In a real implementation, this would queue to BullMQ
    // For now, we'll just create the delivery record
    // The worker will pick it up and process it
  }
}

// User events
export async function emitUserCreated(
  tenantId: string,
  user: { id: string; email: string; name: string | null }
) {
  await emitWebhookEvent(tenantId, "user.created", {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
  });
}

export async function emitUserUpdated(
  tenantId: string,
  user: { id: string; email: string; name: string | null },
  changes: string[]
) {
  await emitWebhookEvent(tenantId, "user.updated", {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
    changes,
  });
}

export async function emitUserDeleted(tenantId: string, userId: string) {
  await emitWebhookEvent(tenantId, "user.deleted", {
    userId,
  });
}

// Team events
export async function emitTeamMemberAdded(
  tenantId: string,
  member: { userId: string; email: string; role: string }
) {
  await emitWebhookEvent(tenantId, "team.member_added", {
    member: {
      userId: member.userId,
      email: member.email,
      role: member.role,
    },
  });
}

export async function emitTeamMemberRemoved(tenantId: string, userId: string, email: string) {
  await emitWebhookEvent(tenantId, "team.member_removed", {
    userId,
    email,
  });
}

// Subscription events
export async function emitSubscriptionCreated(
  tenantId: string,
  subscription: {
    id: string;
    planId: string;
    status: string;
  }
) {
  await emitWebhookEvent(tenantId, "subscription.created", {
    subscription: {
      id: subscription.id,
      planId: subscription.planId,
      status: subscription.status,
    },
  });
}

export async function emitSubscriptionUpdated(
  tenantId: string,
  subscription: {
    id: string;
    planId: string;
    status: string;
  },
  changes: string[]
) {
  await emitWebhookEvent(tenantId, "subscription.updated", {
    subscription: {
      id: subscription.id,
      planId: subscription.planId,
      status: subscription.status,
    },
    changes,
  });
}

export async function emitSubscriptionCanceled(tenantId: string, subscriptionId: string) {
  await emitWebhookEvent(tenantId, "subscription.canceled", {
    subscriptionId,
  });
}

// Invoice events
export async function emitInvoicePaid(
  tenantId: string,
  invoice: {
    id: string;
    amount: number;
    currency: string;
  }
) {
  await emitWebhookEvent(tenantId, "invoice.paid", {
    invoice: {
      id: invoice.id,
      amount: invoice.amount,
      currency: invoice.currency,
    },
  });
}

export async function emitInvoicePaymentFailed(
  tenantId: string,
  invoice: {
    id: string;
    amount: number;
    currency: string;
  },
  error: string
) {
  await emitWebhookEvent(tenantId, "invoice.payment_failed", {
    invoice: {
      id: invoice.id,
      amount: invoice.amount,
      currency: invoice.currency,
    },
    error,
  });
}
