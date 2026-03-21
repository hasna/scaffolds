import Stripe from "stripe";
import { db } from "@scaffold-review/database/client";
import * as schema from "@scaffold-review/database/schema";
import { eq } from "drizzle-orm";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2025-02-24.acacia",
  typescript: true,
});

/**
 * Create a Stripe customer for a tenant
 */
export async function createStripeCustomer(tenantId: string, email: string, name?: string) {
  const customer = await stripe.customers.create({
    email,
    name: name ?? undefined,
    metadata: { tenantId },
  });

  await db
    .update(schema.tenants)
    .set({ stripeCustomerId: customer.id })
    .where(eq(schema.tenants.id, tenantId));

  return customer;
}

/**
 * Get or create Stripe customer
 */
export async function getOrCreateStripeCustomer(
  tenantId: string,
  email: string,
  name?: string
): Promise<Stripe.Customer> {
  const tenant = await db.query.tenants.findFirst({
    where: eq(schema.tenants.id, tenantId),
  });

  if (tenant?.stripeCustomerId) {
    const customer = await stripe.customers.retrieve(tenant.stripeCustomerId);
    if (!customer.deleted) {
      return customer as Stripe.Customer;
    }
  }

  return createStripeCustomer(tenantId, email, name);
}

/**
 * Create a checkout session
 */
export async function createCheckoutSession(
  tenantId: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string,
  customerId: string
) {
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { tenantId },
    subscription_data: {
      metadata: { tenantId },
    },
    allow_promotion_codes: true,
  });

  return session;
}

/**
 * Create a billing portal session
 */
export async function createBillingPortalSession(customerId: string, returnUrl: string) {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return session;
}

/**
 * Get subscription by tenant ID
 */
export async function getSubscription(tenantId: string) {
  const subscription = await db.query.subscriptions.findFirst({
    where: eq(schema.subscriptions.tenantId, tenantId),
    with: { plan: true },
  });

  return subscription;
}

/**
 * Sync subscription from Stripe
 */
export async function syncSubscription(stripeSubscription: Stripe.Subscription) {
  const tenantId = stripeSubscription.metadata.tenantId;
  if (!tenantId) return null;

  // Find the plan by Stripe price ID
  const priceId = stripeSubscription.items.data[0]?.price.id;
  const plan = await db.query.pricingPlans.findFirst({
    where: (plans, { or, eq }) =>
      or(
        eq(plans.stripePriceIdMonthly, priceId ?? ""),
        eq(plans.stripePriceIdYearly, priceId ?? "")
      ),
  });

  if (!plan) return null;

  const status = mapStripeStatus(stripeSubscription.status);

  const [subscription] = await db
    .insert(schema.subscriptions)
    .values({
      tenantId,
      planId: plan.id,
      stripeSubscriptionId: stripeSubscription.id,
      status,
      currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
      currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
      cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
    })
    .onConflictDoUpdate({
      target: schema.subscriptions.tenantId,
      set: {
        planId: plan.id,
        stripeSubscriptionId: stripeSubscription.id,
        status,
        currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
        cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
      },
    })
    .returning();

  // Update tenant's plan
  await db
    .update(schema.tenants)
    .set({
      planId: plan.id,
      stripeSubscriptionId: stripeSubscription.id,
    })
    .where(eq(schema.tenants.id, tenantId));

  return subscription;
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(subscriptionId: string, atPeriodEnd = true) {
  if (atPeriodEnd) {
    return stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
  }
  return stripe.subscriptions.cancel(subscriptionId);
}

/**
 * Reactivate subscription
 */
export async function reactivateSubscription(subscriptionId: string) {
  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  });
}

function mapStripeStatus(status: Stripe.Subscription.Status): schema.SubscriptionStatus {
  switch (status) {
    case "active":
      return "active";
    case "canceled":
      return "canceled";
    case "past_due":
      return "past_due";
    case "trialing":
      return "trialing";
    default:
      return "incomplete";
  }
}

/**
 * Get all pricing plans
 */
export async function getPricingPlans() {
  return db.query.pricingPlans.findMany({
    where: eq(schema.pricingPlans.isActive, true),
    orderBy: (plans, { asc }) => [asc(plans.sortOrder)],
  });
}

/**
 * Get invoices for a customer
 */
export async function getInvoices(customerId: string, limit = 10) {
  const invoices = await stripe.invoices.list({
    customer: customerId,
    limit,
  });

  return invoices.data.map((invoice) => ({
    id: invoice.id,
    number: invoice.number,
    status: invoice.status,
    amountDue: invoice.amount_due,
    amountPaid: invoice.amount_paid,
    currency: invoice.currency,
    created: new Date(invoice.created * 1000),
    hostedInvoiceUrl: invoice.hosted_invoice_url,
    invoicePdf: invoice.invoice_pdf,
    description: invoice.description ?? invoice.lines.data[0]?.description ?? "Subscription",
  }));
}

export type Invoice = Awaited<ReturnType<typeof getInvoices>>[number];
