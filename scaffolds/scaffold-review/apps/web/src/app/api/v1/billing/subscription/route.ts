import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@scaffold-review/database/client";
import * as schema from "@scaffold-review/database/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = session.user.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant" }, { status: 400 });
    }

    const subscription = await db.query.subscriptions.findFirst({
      where: eq(schema.subscriptions.tenantId, tenantId),
      with: {
        plan: true,
      },
    });

    if (!subscription) {
      return NextResponse.json({ data: null });
    }

    return NextResponse.json({
      data: {
        id: subscription.id,
        status: subscription.status,
        plan: subscription.plan
          ? {
              id: subscription.plan.id,
              name: subscription.plan.name,
              priceMonthly: subscription.plan.priceMonthly,
              priceYearly: subscription.plan.priceYearly,
            }
          : null,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
      },
    });
  } catch (error) {
    console.error("Get subscription error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
