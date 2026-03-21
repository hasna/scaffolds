import { NextRequest, NextResponse } from "next/server";
import { db } from "@scaffold-review/database/client";
import * as schema from "@scaffold-review/database/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { z } from "zod";

const createReviewSchema = z.object({
  productId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  title: z.string().max(255).optional(),
  content: z.string().min(10),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createReviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 422 });
  }

  const { productId, rating, title, content } = parsed.data;

  // Verify product exists
  const [product] = await db
    .select({ id: schema.products.id })
    .from(schema.products)
    .where(eq(schema.products.id, productId))
    .limit(1);

  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  // Enforce one review per user per product
  const [existing] = await db
    .select({ id: schema.reviews.id })
    .from(schema.reviews)
    .where(
      and(
        eq(schema.reviews.productId, productId),
        eq(schema.reviews.authorId, session.user.id)
      )
    )
    .limit(1);

  if (existing) {
    return NextResponse.json(
      { error: "You have already submitted a review for this product." },
      { status: 409 }
    );
  }

  const [review] = await db
    .insert(schema.reviews)
    .values({
      productId,
      authorId: session.user.id,
      rating,
      title: title ?? null,
      content,
      status: "pending",
    })
    .returning();

  return NextResponse.json({ data: review }, { status: 201 });
}
