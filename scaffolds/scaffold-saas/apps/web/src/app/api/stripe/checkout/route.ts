import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@scaffold-saas/database/client";
import * as schema from "@scaffold-saas/database/schema";
import { eq } from "drizzle-orm";
import { createCheckoutSession, getOrCreateStripeCustomer } from "@/lib/stripe";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const tenantId = session.user.tenantId;
    if (!tenantId) {
      return NextResponse.redirect(new URL("/onboarding", request.url));
    }

    const { searchParams } = new URL(request.url);
    const planSlug = searchParams.get("plan");
    const interval = searchParams.get("interval") ?? "monthly";

    if (!planSlug) {
      return NextResponse.redirect(new URL("/pricing?error=no-plan", request.url));
    }

    // Get the plan
    const plan = await db.query.pricingPlans.findFirst({
      where: eq(schema.pricingPlans.slug, planSlug),
    });

    if (!plan) {
      return NextResponse.redirect(new URL("/pricing?error=invalid-plan", request.url));
    }

    const priceId = interval === "yearly" ? plan.stripePriceIdYearly : plan.stripePriceIdMonthly;

    if (!priceId) {
      return NextResponse.redirect(new URL("/pricing?error=no-price", request.url));
    }

    // Get or create Stripe customer
    const customer = await getOrCreateStripeCustomer(
      tenantId,
      session.user.email!,
      session.user.name ?? undefined
    );

    // Create checkout session
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:5900";
    const checkoutSession = await createCheckoutSession(
      tenantId,
      priceId,
      `${baseUrl}/dashboard/billing?success=true`,
      `${baseUrl}/dashboard/billing?canceled=true`,
      customer.id
    );

    if (!checkoutSession.url) {
      return NextResponse.redirect(new URL("/pricing?error=checkout-failed", request.url));
    }

    return NextResponse.redirect(checkoutSession.url);
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.redirect(new URL("/pricing?error=checkout-failed", request.url));
  }
}
