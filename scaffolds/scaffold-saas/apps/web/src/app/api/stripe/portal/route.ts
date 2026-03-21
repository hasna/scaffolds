import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getTenant } from "@/lib/tenant";
import { createBillingPortalSession } from "@/lib/stripe";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = session.user.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant" }, { status: 400 });
    }

    const tenant = await getTenant(tenantId);
    if (!tenant?.stripeCustomerId) {
      return NextResponse.json({ error: "No customer" }, { status: 400 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:5900";
    const portalSession = await createBillingPortalSession(
      tenant.stripeCustomerId,
      `${baseUrl}/dashboard/billing`
    );

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    console.error("Portal error:", error);
    return NextResponse.json({ error: "Failed to create portal" }, { status: 500 });
  }
}
