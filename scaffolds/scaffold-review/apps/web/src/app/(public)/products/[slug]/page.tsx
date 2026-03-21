import { notFound } from "next/navigation";
import Link from "next/link";
import { Star, ThumbsUp, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { db } from "@scaffold-review/database/client";
import * as schema from "@scaffold-review/database/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { AddReviewForm } from "@/components/reviews/add-review-form";

export const dynamic = "force-dynamic";

function StarRating({ rating, size = "sm" }: { rating: number; size?: "sm" | "lg" }) {
  const sizeClass = size === "lg" ? "h-6 w-6" : "h-4 w-4";
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${sizeClass} ${
            star <= Math.round(rating) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
          }`}
        />
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    approved: "default",
    pending: "secondary",
    rejected: "destructive",
  };
  return <Badge variant={variants[status] ?? "secondary"}>{status}</Badge>;
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();

  const [product] = await db
    .select()
    .from(schema.products)
    .where(eq(schema.products.slug, slug))
    .limit(1);

  if (!product) {
    notFound();
  }

  const approvedReviews = await db
    .select({
      review: schema.reviews,
      author: {
        name: schema.users.name,
        avatarUrl: schema.users.avatarUrl,
      },
    })
    .from(schema.reviews)
    .leftJoin(schema.users, eq(schema.reviews.authorId, schema.users.id))
    .where(
      and(
        eq(schema.reviews.productId, product.id),
        eq(schema.reviews.status, "approved")
      )
    )
    .orderBy(schema.reviews.createdAt);

  // Check if current user already submitted a review
  let userReview = null;
  if (session?.user?.id) {
    const [existing] = await db
      .select()
      .from(schema.reviews)
      .where(
        and(
          eq(schema.reviews.productId, product.id),
          eq(schema.reviews.authorId, session.user.id)
        )
      )
      .limit(1);
    userReview = existing ?? null;
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="text-xl font-bold">
            ReviewHub
          </Link>
          <nav className="flex items-center gap-4">
            {session?.user ? (
              <Link href="/dashboard">
                <Button variant="ghost" size="sm">
                  Dashboard
                </Button>
              </Link>
            ) : (
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Log in
                </Button>
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main className="container mx-auto max-w-4xl px-4 py-10">
        {/* Product Info */}
        <div className="mb-8">
          {product.category && (
            <Link href={`/category/${product.category}`}>
              <Badge variant="secondary" className="mb-3">
                {product.category}
              </Badge>
            </Link>
          )}
          <h1 className="mb-2 text-3xl font-bold">{product.name}</h1>
          {product.description && (
            <p className="text-muted-foreground mb-4 text-lg">{product.description}</p>
          )}
          <div className="flex items-center gap-3">
            <StarRating rating={Number(product.averageRating)} size="lg" />
            <span className="text-2xl font-bold">{Number(product.averageRating).toFixed(1)}</span>
            <span className="text-muted-foreground">
              {product.reviewCount} {product.reviewCount === 1 ? "review" : "reviews"}
            </span>
          </div>
        </div>

        {product.imageUrl && (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="mb-8 h-64 w-full rounded-lg object-cover"
          />
        )}

        {/* Add Review Section */}
        <div className="mb-10">
          <h2 className="mb-4 text-xl font-semibold">Write a Review</h2>
          {session?.user ? (
            userReview ? (
              <div className="bg-muted rounded-lg p-4">
                <p className="text-sm">
                  You already submitted a review for this product.
                  <StatusBadge status={userReview.status} />
                </p>
              </div>
            ) : (
              <AddReviewForm productId={product.id} />
            )
          ) : (
            <div className="bg-muted rounded-lg p-4 text-center">
              <p className="text-muted-foreground mb-3 text-sm">
                You need to be logged in to write a review.
              </p>
              <Link href="/login">
                <Button size="sm">Log in to Review</Button>
              </Link>
            </div>
          )}
        </div>

        {/* Reviews List */}
        <div>
          <h2 className="mb-6 text-xl font-semibold">
            Reviews ({approvedReviews.length})
          </h2>
          {approvedReviews.length > 0 ? (
            <div className="space-y-6">
              {approvedReviews.map(({ review, author }) => (
                <div key={review.id} className="rounded-lg border p-5">
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="bg-muted flex h-8 w-8 items-center justify-center rounded-full">
                        {author?.avatarUrl ? (
                          <img
                            src={author.avatarUrl}
                            alt={author.name ?? "User"}
                            className="h-8 w-8 rounded-full object-cover"
                          />
                        ) : (
                          <User className="text-muted-foreground h-4 w-4" />
                        )}
                      </div>
                      <span className="text-sm font-medium">{author?.name ?? "Anonymous"}</span>
                    </div>
                    <span className="text-muted-foreground text-xs">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <StarRating rating={review.rating} />
                  {review.title && (
                    <h3 className="mt-2 font-semibold">{review.title}</h3>
                  )}
                  <p className="text-muted-foreground mt-1 text-sm">{review.content}</p>
                  {review.helpful > 0 && (
                    <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
                      <ThumbsUp className="h-3 w-3" />
                      <span>{review.helpful} found this helpful</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-muted-foreground rounded-lg border py-12 text-center">
              <p>No reviews yet. Be the first to review this product!</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
