import { notFound } from "next/navigation";
import Link from "next/link";
import { Star } from "lucide-react";
import { db } from "@scaffold-review/database/client";
import * as schema from "@scaffold-review/database/schema";
import { eq, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-4 w-4 ${
            star <= Math.round(rating) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
          }`}
        />
      ))}
    </div>
  );
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const products = await db
    .select()
    .from(schema.products)
    .where(eq(schema.products.category, slug))
    .orderBy(desc(schema.products.averageRating));

  // If no products found for this category, we could show empty state
  // but we still render the page (not 404 for valid-looking category slugs)

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="text-xl font-bold">
            ReviewHub
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/login" className="text-muted-foreground hover:text-foreground text-sm">
              Log in
            </Link>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10">
        <nav className="text-muted-foreground mb-4 text-sm">
          <Link href="/" className="hover:underline">
            Home
          </Link>{" "}
          &rsaquo;{" "}
          <span className="capitalize">{slug.replace(/-/g, " ")}</span>
        </nav>

        <h1 className="mb-2 text-3xl font-bold capitalize">{slug.replace(/-/g, " ")}</h1>
        <p className="text-muted-foreground mb-8">
          {products.length} {products.length === 1 ? "product" : "products"} in this category
        </p>

        {products.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <Link
                key={product.id}
                href={`/products/${product.slug}`}
                className="bg-background hover:shadow-md block rounded-lg border p-5 transition-shadow"
              >
                {product.imageUrl && (
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="mb-4 h-40 w-full rounded-md object-cover"
                  />
                )}
                <h3 className="font-semibold">{product.name}</h3>
                {product.description && (
                  <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">
                    {product.description}
                  </p>
                )}
                <div className="mt-3 flex items-center gap-2">
                  <StarRating rating={Number(product.averageRating)} />
                  <span className="text-muted-foreground text-sm">
                    {Number(product.averageRating).toFixed(1)} ({product.reviewCount} reviews)
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-muted-foreground rounded-lg border py-16 text-center">
            <p>No products in this category yet.</p>
            <Link href="/" className="mt-2 inline-block text-sm underline">
              Back to all products
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
