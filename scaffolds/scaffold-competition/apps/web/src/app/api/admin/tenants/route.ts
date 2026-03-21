import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@scaffold-competition/database/client";
import * as schema from "@scaffold-competition/database/schema";
import { desc, sql } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");

    const tenants = await db.query.tenants.findMany({
      columns: {
        id: true,
        name: true,
        slug: true,
        stripeCustomerId: true,
        createdAt: true,
      },
      with: {
        subscription: {
          columns: {
            status: true,
          },
          with: {
            plan: {
              columns: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: [desc(schema.tenants.createdAt)],
      limit,
      offset,
    });

    // Get member counts
    const tenantsWithCounts = await Promise.all(
      tenants.map(async (tenant) => {
        const [memberCount] = await db
          .select({ count: sql<number>`count(*)` })
          .from(schema.teamMembers)
          .where(sql`${schema.teamMembers.tenantId} = ${tenant.id}`);

        return {
          ...tenant,
          memberCount: Number(memberCount?.count || 0),
        };
      })
    );

    return NextResponse.json({ data: tenantsWithCounts });
  } catch (error) {
    console.error("Admin get tenants error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
