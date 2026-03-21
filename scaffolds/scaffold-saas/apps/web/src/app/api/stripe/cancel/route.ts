import { NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@scaffold-saas/database/client";
import * as schema from "@scaffold-saas/database/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth-utils";

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

export async function POST() {
  try {
    const session = await requireAuth();

    if (!session.user.tenantId) {
      return NextResponse.json(
        { error: "No active team" },
        { status: 400 }
      );
    }

    if (!stripe) {
      return NextResponse.json(
        { error: "Stripe not configured" },
        { status: 500 }
      );
    }

    const subscription = await db.query.subscriptions.findFirst({
      where: eq(schema.subscriptions.tenantId, session.user.tenantId),
    });

    if (!subscription?.stripeSubscriptionId) {
      return NextResponse.json(
        { error: "No active subscription" },
        { status: 400 }
      );
    }

    // Cancel at period end (not immediately)
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    // Update local subscription
    await db
      .update(schema.subscriptions)
      .set({
        cancelAtPeriodEnd: true,
        updatedAt: new Date(),
      })
      .where(eq(schema.subscriptions.id, subscription.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Cancel subscription error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
