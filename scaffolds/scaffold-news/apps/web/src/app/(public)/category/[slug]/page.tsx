import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@scaffold-news/database/client";
import * as schema from "@scaffold-news/database/schema";
import { eq, and, desc } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, CalendarDays } from "lucide-react";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function getCategory(slug: string) {
  return db.query.categories.findFirst({
    where: eq(schema.categories.slug, slug),
  });
}

async function getArticlesByCategory(categoryId: string) {
  return db.query.articles.findMany({
    where: and(
      eq(schema.articles.categoryId, categoryId),
      eq(schema.articles.status, "published"),
    ),
    orderBy: [desc(schema.articles.publishedAt)],
    with: {
      author: { columns: { id: true, name: true, avatarUrl: true } },
      category: true,
    },
  });
}

export default async function CategoryPage({ params }: PageProps) {
  const { slug } = await params;
  const category = await getCategory(slug);

  if (!category) {
    notFound();
  }

  const articles = await getArticlesByCategory(category.id);

  return (
    <div className="container py-12 md:py-20">
      <Button variant="ghost" size="sm" className="mb-8" asChild>
        <Link href="/">
          <ArrowLeft className="mr-2 h-4 w-4" />
          All News
        </Link>
      </Button>

      <div className="mb-10">
        <Badge
          className="mb-3 text-sm"
          style={{ backgroundColor: category.color + "20", color: category.color, borderColor: category.color }}
          variant="outline"
        >
          Category
        </Badge>
        <h1 className="text-4xl font-bold tracking-tight">{category.name}</h1>
        {category.description && (
          <p className="text-muted-foreground mt-3 text-lg">{category.description}</p>
        )}
        <p className="text-muted-foreground mt-2 text-sm">
          {articles.length} article{articles.length !== 1 ? "s" : ""}
        </p>
      </div>

      {articles.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-muted-foreground">No articles in this category yet.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => (
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
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={article.author?.avatarUrl ?? undefined} />
                      <AvatarFallback>{article.author?.name?.charAt(0) ?? "A"}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">
                      {article.author?.name ?? "Anonymous"}
                    </span>
                  </div>
                  {article.publishedAt && (
                    <div className="text-muted-foreground flex items-center gap-1 text-sm">
                      <CalendarDays className="h-4 w-4" />
                      {new Date(article.publishedAt).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
