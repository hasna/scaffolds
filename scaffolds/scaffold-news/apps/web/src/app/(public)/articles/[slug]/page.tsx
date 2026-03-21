import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@scaffold-news/database/client";
import * as schema from "@scaffold-news/database/schema";
import { eq, and, ne, desc } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, CalendarDays, Clock, MessageCircle } from "lucide-react";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function getArticle(slug: string) {
  return db.query.articles.findFirst({
    where: and(eq(schema.articles.slug, slug), eq(schema.articles.status, "published")),
    with: {
      author: { columns: { id: true, name: true, avatarUrl: true } },
      category: true,
      articleTags: { with: { tag: true } },
      comments: {
        where: eq(schema.comments.approved, true),
        with: { author: { columns: { id: true, name: true, avatarUrl: true } } },
        orderBy: [desc(schema.comments.createdAt)],
      },
    },
  });
}

async function getRelatedArticles(categoryId: string | null, currentId: string) {
  if (!categoryId) return [];
  return db.query.articles.findMany({
    where: and(
      eq(schema.articles.status, "published"),
      eq(schema.articles.categoryId, categoryId),
      ne(schema.articles.id, currentId),
    ),
    orderBy: [desc(schema.articles.publishedAt)],
    limit: 3,
    with: { category: true },
  });
}

export default async function ArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const article = await getArticle(slug);

  if (!article) {
    notFound();
  }

  const related = await getRelatedArticles(article.categoryId, article.id);
  const wordCount = article.content.split(/\s+/).length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  return (
    <article className="container py-12 md:py-20">
      <div className="mx-auto max-w-3xl">
        {/* Back link */}
        <Button variant="ghost" size="sm" className="mb-8" asChild>
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to News
          </Link>
        </Button>

        {/* Header */}
        <header className="mb-8">
          {article.category && (
            <Link href={`/category/${article.category.slug}`}>
              <Badge variant="secondary" className="mb-4">
                {article.category.name}
              </Badge>
            </Link>
          )}
          <h1 className="mb-4 text-4xl font-bold tracking-tight">{article.title}</h1>
          {article.excerpt && (
            <p className="text-muted-foreground mb-6 text-xl">{article.excerpt}</p>
          )}
          <div className="text-muted-foreground flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Avatar className="h-10 w-10">
                <AvatarImage src={article.author?.avatarUrl ?? undefined} />
                <AvatarFallback>{article.author?.name?.charAt(0) ?? "A"}</AvatarFallback>
              </Avatar>
              <span className="text-foreground font-medium">
                {article.author?.name ?? "Anonymous"}
              </span>
            </div>
            <span>&middot;</span>
            {article.publishedAt && (
              <div className="flex items-center gap-1">
                <CalendarDays className="h-4 w-4" />
                {new Date(article.publishedAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </div>
            )}
            <span>&middot;</span>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {readingTime} min read
            </div>
            <span>&middot;</span>
            <div className="flex items-center gap-1">
              <MessageCircle className="h-4 w-4" />
              {article.comments.length} comment{article.comments.length !== 1 ? "s" : ""}
            </div>
          </div>
        </header>

        {/* Cover image */}
        {article.coverImage && (
          <img
            src={article.coverImage}
            alt={article.title}
            className="mb-8 w-full rounded-lg object-cover"
          />
        )}

        {/* Content */}
        <div className="prose prose-lg dark:prose-invert max-w-none">
          <div dangerouslySetInnerHTML={{ __html: article.content.replace(/\n/g, "<br />") }} />
        </div>

        {/* Tags */}
        {article.articleTags.length > 0 && (
          <div className="mt-8 flex flex-wrap gap-2">
            {article.articleTags.map(({ tag }) => (
              <Badge key={tag.id} variant="outline">
                #{tag.name}
              </Badge>
            ))}
          </div>
        )}

        {/* Comments */}
        {article.comments.length > 0 && (
          <section className="mt-12 border-t pt-8">
            <h2 className="mb-6 text-2xl font-bold">
              Comments ({article.comments.length})
            </h2>
            <div className="space-y-6">
              {article.comments.map((comment) => (
                <div key={comment.id} className="flex gap-4">
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarImage src={comment.author?.avatarUrl ?? undefined} />
                    <AvatarFallback>{comment.author?.name?.charAt(0) ?? "A"}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="mb-1 flex items-center gap-2">
                      <span className="font-medium">{comment.author?.name ?? "Anonymous"}</span>
                      <span className="text-muted-foreground text-sm">
                        {new Date(comment.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-muted-foreground">{comment.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Related articles */}
        {related.length > 0 && (
          <div className="mt-16 border-t pt-8">
            <h2 className="mb-6 text-2xl font-bold">Related Articles</h2>
            <div className="grid gap-6 md:grid-cols-3">
              {related.map((rel) => (
                <Card key={rel.id}>
                  <CardHeader className="pb-2">
                    {rel.category && (
                      <Badge variant="secondary" className="mb-2 w-fit">
                        {rel.category.name}
                      </Badge>
                    )}
                    <Link href={`/articles/${rel.slug}`}>
                      <CardTitle className="hover:text-primary line-clamp-2 text-lg transition-colors">
                        {rel.title}
                      </CardTitle>
                    </Link>
                  </CardHeader>
                  {rel.excerpt && (
                    <CardContent>
                      <p className="text-muted-foreground line-clamp-2 text-sm">{rel.excerpt}</p>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
