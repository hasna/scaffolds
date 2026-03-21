import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@scaffold-review/database/client";
import * as schema from "@scaffold-review/database/schema";
import { sql, gte, eq } from "drizzle-orm";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    // User stats
    const [totalUsers] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.users);

    const [usersThisWeek] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.users)
      .where(gte(schema.users.createdAt, oneWeekAgo));

    const [usersThisMonth] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.users)
      .where(gte(schema.users.createdAt, oneMonthAgo));

    const [usersLastMonth] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.users)
      .where(sql`${schema.users.createdAt} >= ${twoMonthsAgo.toISOString()} AND ${schema.users.createdAt} < ${oneMonthAgo.toISOString()}`);

    // Tenant stats
    const [totalTenants] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.tenants);

    const [tenantsThisWeek] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.tenants)
      .where(gte(schema.tenants.createdAt, oneWeekAgo));

    const [tenantsThisMonth] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.tenants)
      .where(gte(schema.tenants.createdAt, oneMonthAgo));

    const [tenantsLastMonth] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.tenants)
      .where(sql`${schema.tenants.createdAt} >= ${twoMonthsAgo.toISOString()} AND ${schema.tenants.createdAt} < ${oneMonthAgo.toISOString()}`);

    // Subscription stats
    const [activeSubscriptions] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.subscriptions)
      .where(eq(schema.subscriptions.status, "active"));

    const [trialingSubscriptions] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.subscriptions)
      .where(eq(schema.subscriptions.status, "trialing"));

    const [canceledSubscriptions] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.subscriptions)
      .where(eq(schema.subscriptions.status, "canceled"));

    // Calculate MRR from active subscriptions
    const mrrResult = await db
      .select({
        mrr: sql<number>`COALESCE(SUM(${schema.pricingPlans.priceMonthly}), 0)`,
      })
      .from(schema.subscriptions)
      .innerJoin(schema.pricingPlans, eq(schema.subscriptions.planId, schema.pricingPlans.id))
      .where(eq(schema.subscriptions.status, "active"));

    // Activity stats
    const [activeUsersCount] = await db
      .select({ count: sql<number>`count(DISTINCT ${schema.sessions.userId})` })
      .from(schema.sessions)
      .where(gte(schema.sessions.expiresAt, now));

    const [apiCallsCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.auditLogs)
      .where(gte(schema.auditLogs.createdAt, oneWeekAgo));

    const [aiMessagesCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.assistantMessages)
      .where(gte(schema.assistantMessages.createdAt, oneWeekAgo));

    // Calculate trends
    const userTrend = Number(usersLastMonth?.count) > 0
      ? Math.round(((Number(usersThisMonth?.count) - Number(usersLastMonth?.count)) / Number(usersLastMonth?.count)) * 100)
      : 0;

    const tenantTrend = Number(tenantsLastMonth?.count) > 0
      ? Math.round(((Number(tenantsThisMonth?.count) - Number(tenantsLastMonth?.count)) / Number(tenantsLastMonth?.count)) * 100)
      : 0;

    return NextResponse.json({
      users: {
        total: Number(totalUsers?.count || 0),
        newThisWeek: Number(usersThisWeek?.count || 0),
        newThisMonth: Number(usersThisMonth?.count || 0),
        trend: userTrend,
      },
      tenants: {
        total: Number(totalTenants?.count || 0),
        newThisWeek: Number(tenantsThisWeek?.count || 0),
        newThisMonth: Number(tenantsThisMonth?.count || 0),
        trend: tenantTrend,
      },
      subscriptions: {
        active: Number(activeSubscriptions?.count || 0),
        trialing: Number(trialingSubscriptions?.count || 0),
        canceled: Number(canceledSubscriptions?.count || 0),
        mrr: Number(mrrResult[0]?.mrr || 0),
      },
      activity: {
        activeUsers: Number(activeUsersCount?.count || 0),
        apiCalls: Number(apiCallsCount?.count || 0),
        aiMessages: Number(aiMessagesCount?.count || 0),
      },
    });
  } catch (error) {
    console.error("Admin analytics error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
