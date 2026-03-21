import Link from "next/link";
import { Star, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { db } from "@scaffold-review/database/client";
import * as schema from "@scaffold-review/database/schema";
import { desc } from "drizzle-orm";

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

export default async function HomePage() {
  let featuredProducts: (typeof schema.products.$inferSelect)[] = [];

  try {
    featuredProducts = await db
      .select()
      .from(schema.products)
      .orderBy(desc(schema.products.averageRating))
      .limit(6);
  } catch {
    // DB not available during build/preview
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="text-xl font-bold">
            ReviewHub
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/category" className="text-muted-foreground hover:text-foreground text-sm">
              Categories
            </Link>
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Log in
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm">Get Started</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="container mx-auto px-4 py-24 text-center">
          <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-6xl">
            Discover &amp; Review
            <br />
            <span className="text-muted-foreground">Products You Love</span>
          </h1>
          <p className="text-muted-foreground mx-auto mb-8 max-w-2xl text-lg">
            Browse honest reviews from real users. Share your experience and help others make better
            decisions.
          </p>
          <div className="flex justify-center gap-4">
            <Link href="/register">
              <Button size="lg">
                Start Reviewing
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>

        {/* Featured Products */}
        <section className="border-t bg-muted/50 py-16">
          <div className="container mx-auto px-4">
            <h2 className="mb-8 text-2xl font-bold">Featured Products</h2>
            {featuredProducts.length > 0 ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {featuredProducts.map((product) => (
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
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold">{product.name}</h3>
                      {product.category && (
                        <span className="bg-muted rounded px-2 py-0.5 text-xs">
                          {product.category}
                        </span>
                      )}
                    </div>
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
                <p>No products yet. Add some to get started.</p>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} ReviewHub. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
