import Link from "next/link";
import { db } from "@scaffold-news/database/client";
import * as schema from "@scaffold-news/database/schema";
import { desc, eq } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CalendarDays } from "lucide-react";

export const dynamic = "force-dynamic";

async function getPublishedArticles() {
  return db.query.articles.findMany({
    where: eq(schema.articles.status, "published"),
    orderBy: [desc(schema.articles.publishedAt)],
    limit: 20,
    with: {
      author: { columns: { id: true, name: true, avatarUrl: true } },
      category: true,
    },
  });
}

async function getCategories() {
  return db.query.categories.findMany({ orderBy: [schema.categories.name] });
}

export default async function HomePage() {
  const [articles, categories] = await Promise.all([getPublishedArticles(), getCategories()]);

  const featured = articles.filter((a) => a.featured);
  const rest = articles.filter((a) => !a.featured);

  return (
    <div className="container py-12 md:py-20">
      <div className="mb-12">
        <h1 className="text-4xl font-bold tracking-tight">Latest News</h1>
        <p className="text-muted-foreground mt-3 text-lg">
          Stay up to date with the latest articles and stories.
        </p>
      </div>

      {/* Category filter */}
      {categories.length > 0 && (
        <div className="mb-8 flex flex-wrap gap-2">
          {categories.map((cat) => (
            <Link key={cat.id} href={`/category/${cat.slug}`}>
              <Badge variant="outline" style={{ borderColor: cat.color, color: cat.color }}>
                {cat.name}
              </Badge>
            </Link>
          ))}
        </div>
      )}

      {/* Featured articles */}
      {featured.length > 0 && (
        <div className="mb-12">
          <h2 className="mb-4 text-2xl font-semibold">Featured</h2>
          <div className="grid gap-6 md:grid-cols-2">
            {featured.slice(0, 2).map((article) => (
              <Card key={article.id} className="overflow-hidden">
                {article.coverImage && (
                  <Link href={`/articles/${article.slug}`}>
                    <img
                      src={article.coverImage}
                      alt={article.title}
                      className="h-52 w-full object-cover"
                    />
                  </Link>
                )}
                <CardHeader>
                  {article.category && (
                    <Link href={`/category/${article.category.slug}`}>
                      <Badge
                        variant="secondary"
                        className="mb-2 w-fit"
                        style={{ backgroundColor: article.category.color + "20", color: article.category.color }}
                      >
                        {article.category.name}
                      </Badge>
                    </Link>
                  )}
                  <Link href={`/articles/${article.slug}`}>
                    <CardTitle className="hover:text-primary line-clamp-2 transition-colors">
                      {article.title}
                    </CardTitle>
                  </Link>
                </CardHeader>
                <CardContent>
                  {article.excerpt && (
                    <p className="text-muted-foreground mb-4 line-clamp-2">{article.excerpt}</p>
                  )}
                  <ArticleMeta article={article} />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Article grid */}
      {rest.length === 0 && featured.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-muted-foreground">No articles yet. Check back soon!</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {rest.map((article) => (
            <Card key={article.id} className="overflow-hidden">
              {article.coverImage && (
                <Link href={`/articles/${article.slug}`}>
                  <img
                    src={article.coverImage}
                    alt={article.title}
                    className="h-44 w-full object-cover"
                  />
                </Link>
              )}
              <CardHeader>
                {article.category && (
                  <Link href={`/category/${article.category.slug}`}>
                    <Badge variant="secondary" className="mb-2 w-fit">
                      {article.category.name}
                    </Badge>
                  </Link>
                )}
                <Link href={`/articles/${article.slug}`}>
                  <CardTitle className="hover:text-primary line-clamp-2 text-lg transition-colors">
                    {article.title}
                  </CardTitle>
                </Link>
              </CardHeader>
              <CardContent>
                {article.excerpt && (
                  <p className="text-muted-foreground mb-4 line-clamp-2 text-sm">
                    {article.excerpt}
                  </p>
                )}
                <ArticleMeta article={article} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function ArticleMeta({
  article,
}: {
  article: {
    author?: { name?: string | null; avatarUrl?: string | null } | null;
    publishedAt?: Date | null;
  };
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Avatar className="h-7 w-7">
          <AvatarImage src={article.author?.avatarUrl ?? undefined} />
          <AvatarFallback>{article.author?.name?.charAt(0) ?? "A"}</AvatarFallback>
        </Avatar>
        <span className="text-sm font-medium">{article.author?.name ?? "Anonymous"}</span>
      </div>
      {article.publishedAt && (
        <div className="text-muted-foreground flex items-center gap-1 text-sm">
          <CalendarDays className="h-4 w-4" />
          {new Date(article.publishedAt).toLocaleDateString()}
        </div>
      )}
    </div>
  );
}
