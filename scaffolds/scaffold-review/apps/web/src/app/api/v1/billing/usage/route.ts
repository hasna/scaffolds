import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@scaffold-review/database/client";
import * as schema from "@scaffold-review/database/schema";
import { eq, gte, and, sql } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = session.user.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "30d";

    // Calculate start date based on period
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case "7d":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "90d":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Get AI assistant usage
    const aiUsage = await db.query.assistantUsage.findMany({
      where: and(
        eq(schema.assistantUsage.tenantId, tenantId),
        gte(schema.assistantUsage.createdAt, startDate)
      ),
      orderBy: (u, { asc }) => [asc(u.createdAt)],
    });

    // Aggregate totals
    const totals = aiUsage.reduce(
      (acc, usage) => ({
        inputTokens: acc.inputTokens + usage.inputTokens,
        outputTokens: acc.outputTokens + usage.outputTokens,
        totalTokens: acc.totalTokens + usage.inputTokens + usage.outputTokens,
        requestCount: acc.requestCount + 1,
      }),
      { inputTokens: 0, outputTokens: 0, totalTokens: 0, requestCount: 0 }
    );

    // Get team member count
    const teamMembers = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.teamMembers)
      .where(eq(schema.teamMembers.tenantId, tenantId));

    // Get webhook count
    const webhooks = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.webhooks)
      .where(eq(schema.webhooks.tenantId, tenantId));

    return NextResponse.json({
      data: {
        period,
        ai: {
          totals,
          daily: aiUsage.map((u) => ({
            date: u.createdAt,
            inputTokens: u.inputTokens,
            outputTokens: u.outputTokens,
            totalTokens: u.inputTokens + u.outputTokens,
          })),
        },
        resources: {
          teamMembers: Number(teamMembers[0]?.count || 0),
          webhooks: Number(webhooks[0]?.count || 0),
        },
      },
    });
  } catch (error) {
    console.error("Get usage error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
