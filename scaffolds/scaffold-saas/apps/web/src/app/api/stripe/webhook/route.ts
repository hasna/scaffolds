import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { stripe, syncSubscription } from "@/lib/stripe";
import { db } from "@scaffold-saas/database/client";
import * as schema from "@scaffold-saas/database/schema";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.subscription && typeof session.subscription === "string") {
          const subscription = await stripe.subscriptions.retrieve(session.subscription);
          await syncSubscription(subscription);
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await syncSubscription(subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const tenantId = subscription.metadata.tenantId;
        if (tenantId) {
          await db
            .update(schema.subscriptions)
            .set({ status: "canceled" })
            .where(eq(schema.subscriptions.tenantId, tenantId));

          // Reset to free plan
          const freePlan = await db.query.pricingPlans.findFirst({
            where: eq(schema.pricingPlans.slug, "free"),
          });
          if (freePlan) {
            await db
              .update(schema.tenants)
              .set({ planId: freePlan.id, stripeSubscriptionId: null })
              .where(eq(schema.tenants.id, tenantId));
          }
        }
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        const tenant = await db.query.tenants.findFirst({
          where: eq(schema.tenants.stripeCustomerId, customerId),
        });

        if (tenant) {
          await db.insert(schema.invoices).values({
            tenantId: tenant.id,
            stripeInvoiceId: invoice.id,
            amount: invoice.amount_paid,
            currency: invoice.currency,
            status: "paid",
            pdfUrl: invoice.invoice_pdf,
            hostedInvoiceUrl: invoice.hosted_invoice_url,
            paidAt: new Date(),
          });
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        const tenant = await db.query.tenants.findFirst({
          where: eq(schema.tenants.stripeCustomerId, customerId),
        });

        if (tenant) {
          await db
            .update(schema.subscriptions)
            .set({ status: "past_due" })
            .where(eq(schema.subscriptions.tenantId, tenant.id));
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
