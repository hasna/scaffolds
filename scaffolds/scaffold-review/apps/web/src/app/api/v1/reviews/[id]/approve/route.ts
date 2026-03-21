import { NextRequest, NextResponse } from "next/server";
import { db } from "@scaffold-review/database/client";
import * as schema from "@scaffold-review/database/schema";
import { eq, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Admin-only
  if (session.user.role !== "admin" && session.user.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const [review] = await db
    .select()
    .from(schema.reviews)
    .where(eq(schema.reviews.id, id))
    .limit(1);

  if (!review) {
    return NextResponse.json({ error: "Review not found" }, { status: 404 });
  }

  const [updated] = await db
    .update(schema.reviews)
    .set({ status: "approved", updatedAt: new Date() })
    .where(eq(schema.reviews.id, id))
    .returning();

  // Update product average rating and review count
  await db
    .update(schema.products)
    .set({
      reviewCount: sql`(
        SELECT COUNT(*) FROM ${schema.reviews}
        WHERE ${schema.reviews.productId} = ${review.productId}
        AND ${schema.reviews.status} = 'approved'
      )`,
      averageRating: sql`(
        SELECT COALESCE(AVG(${schema.reviews.rating}::numeric), 0)
        FROM ${schema.reviews}
        WHERE ${schema.reviews.productId} = ${review.productId}
        AND ${schema.reviews.status} = 'approved'
      )`,
      updatedAt: new Date(),
    })
    .where(eq(schema.products.id, review.productId));

  return NextResponse.json({ data: updated });
}
