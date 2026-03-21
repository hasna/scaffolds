import { Job } from "bullmq";
import Stripe from "stripe";
import { db } from "@scaffold-saas/database/client";
import * as schema from "@scaffold-saas/database/schema";
import { eq, and, lt } from "drizzle-orm";
import { logger } from "../lib/logger";
import { emailQueue } from "../queues";

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

interface SyncSubscriptionData {
  type: "sync-subscription";
  subscriptionId: string;
}

interface CancelExpiredTrialsData {
  type: "cancel-expired-trials";
}

interface UsageReportData {
  type: "usage-report";
  tenantId: string;
  metric: string;
  quantity: number;
}

export type BillingJobData =
  | SyncSubscriptionData
  | CancelExpiredTrialsData
  | UsageReportData;

export async function processBillingJob(job: Job<BillingJobData>) {
  const { data } = job;

  logger.info("Processing billing job", { type: data.type });

  switch (data.type) {
    case "sync-subscription":
      return await syncSubscription(data.subscriptionId);

    case "cancel-expired-trials":
      return await cancelExpiredTrials();

    case "usage-report":
      return await reportUsage(data.tenantId, data.metric, data.quantity);
  }
}

async function syncSubscription(subscriptionId: string) {
  if (!stripe) {
    logger.warn("Stripe not configured");
    return { skipped: true };
  }

  const subscription = await db.query.subscriptions.findFirst({
    where: eq(schema.subscriptions.id, subscriptionId),
  });

  if (!subscription?.stripeSubscriptionId) {
    logger.warn("Subscription not found or no Stripe ID", { subscriptionId });
    return { skipped: true };
  }

  const stripeSubscription = await stripe.subscriptions.retrieve(
    subscription.stripeSubscriptionId
  );

  // Map Stripe status to our supported values
  const statusMap: Record<string, "active" | "canceled" | "past_due" | "trialing" | "incomplete"> = {
    active: "active",
    canceled: "canceled",
    past_due: "past_due",
    trialing: "trialing",
    incomplete: "incomplete",
    incomplete_expired: "canceled",
    paused: "canceled",
    unpaid: "past_due",
  };
  const mappedStatus = statusMap[stripeSubscription.status] ?? "canceled";

  await db
    .update(schema.subscriptions)
    .set({
      status: mappedStatus,
      currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
      currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
      cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
      canceledAt: stripeSubscription.canceled_at
        ? new Date(stripeSubscription.canceled_at * 1000)
        : null,
      updatedAt: new Date(),
    })
    .where(eq(schema.subscriptions.id, subscriptionId));

  logger.info("Subscription synced", { subscriptionId });
  return { synced: true };
}

async function cancelExpiredTrials() {
  if (!stripe) {
    logger.warn("Stripe not configured");
    return { skipped: true };
  }

  const expiredTrials = await db.query.subscriptions.findMany({
    where: and(
      eq(schema.subscriptions.status, "trialing"),
      lt(schema.subscriptions.trialEnd, new Date())
    ),
    with: {
      tenant: {
        with: {
          teamMembers: {
            where: eq(schema.teamMembers.role, "owner"),
            with: { user: true },
          },
        },
      },
    },
  });

  let cancelled = 0;

  for (const subscription of expiredTrials) {
    if (!subscription.stripeSubscriptionId) continue;

    try {
      await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);

      await db
        .update(schema.subscriptions)
        .set({
          status: "canceled",
          canceledAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(schema.subscriptions.id, subscription.id));

      // Notify owner
      const owner = subscription.tenant?.teamMembers[0]?.user;
      if (owner?.email) {
        await emailQueue.add("trial-expired", {
          type: "subscription-cancelled",
          to: owner.email,
          planName: "Trial",
        });
      }

      cancelled++;
    } catch (error) {
      logger.error("Failed to cancel expired trial", {
        subscriptionId: subscription.id,
        error: String(error),
      });
    }
  }

  logger.info("Expired trials processed", { cancelled });
  return { cancelled };
}

async function reportUsage(tenantId: string, metric: string, quantity: number) {
  if (!stripe) {
    logger.warn("Stripe not configured");
    return { skipped: true };
  }

  const subscription = await db.query.subscriptions.findFirst({
    where: eq(schema.subscriptions.tenantId, tenantId),
  });

  if (!subscription?.stripeSubscriptionId) {
    logger.warn("No active subscription for tenant", { tenantId });
    return { skipped: true };
  }

  const stripeSubscription = await stripe.subscriptions.retrieve(
    subscription.stripeSubscriptionId
  );

  const meteredItem = stripeSubscription.items.data.find(
    (item) => item.price.billing_scheme === "tiered" || item.price.recurring?.usage_type === "metered"
  );

  if (!meteredItem) {
    logger.warn("No metered item found in subscription", { tenantId });
    return { skipped: true };
  }

  await stripe.subscriptionItems.createUsageRecord(meteredItem.id, {
    quantity,
    timestamp: Math.floor(Date.now() / 1000),
    action: "increment",
  });

  logger.info("Usage reported", { tenantId, metric, quantity });
  return { reported: true };
}
