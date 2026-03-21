import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@scaffold-news/database/client";
import * as schema from "@scaffold-news/database/schema";
import { eq, and, ne, desc } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, CalendarDays, Clock } from "lucide-react";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function getPost(slug: string) {
  const post = await db.query.blogPosts.findFirst({
    where: and(eq(schema.blogPosts.slug, slug), eq(schema.blogPosts.status, "published")),
    with: {
      author: {
        columns: { id: true, name: true, avatarUrl: true },
      },
      category: true,
    },
  });
  return post;
}

async function getRelatedPosts(categoryId: string | null, currentId: string) {
  if (!categoryId) return [];

  const posts = await db.query.blogPosts.findMany({
    where: and(
      eq(schema.blogPosts.status, "published"),
      eq(schema.blogPosts.categoryId, categoryId),
      ne(schema.blogPosts.id, currentId)
    ),
    orderBy: [desc(schema.blogPosts.publishedAt)],
    limit: 3,
    with: {
      category: true,
    },
  });
  return posts;
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) {
    notFound();
  }

  const relatedPosts = await getRelatedPosts(post.categoryId, post.id);

  // Estimate reading time (200 words per minute)
  const wordCount = post.content.split(/\s+/).length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  return (
    <article className="container py-12 md:py-20">
      <div className="mx-auto max-w-3xl">
        {/* Back Link */}
        <Button variant="ghost" size="sm" className="mb-8" asChild>
          <Link href="/blog">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Blog
          </Link>
        </Button>

        {/* Header */}
        <header className="mb-8">
          {post.category && (
            <Link href={`/blog/category/${post.category.slug}`}>
              <Badge variant="secondary" className="mb-4">
                {post.category.name}
              </Badge>
            </Link>
          )}
          <h1 className="mb-4 text-4xl font-bold tracking-tight">{post.title}</h1>
          {post.excerpt && <p className="text-muted-foreground mb-6 text-xl">{post.excerpt}</p>}
          <div className="text-muted-foreground flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Avatar className="h-10 w-10">
                <AvatarImage src={post.author?.avatarUrl || undefined} />
                <AvatarFallback>{post.author?.name?.charAt(0) || "A"}</AvatarFallback>
              </Avatar>
              <span className="text-foreground font-medium">
                {post.author?.name || "Anonymous"}
              </span>
            </div>
            <span>&middot;</span>
            {post.publishedAt && (
              <div className="flex items-center gap-1">
                <CalendarDays className="h-4 w-4" />
                {new Date(post.publishedAt).toLocaleDateString("en-US", {
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
          </div>
        </header>

        {/* Featured Image */}
        {post.featuredImage && (
          <img src={post.featuredImage} alt={post.title} className="mb-8 w-full rounded-lg" />
        )}

        {/* Content */}
        <div className="prose prose-lg dark:prose-invert max-w-none">
          {/* In a real app, render markdown here */}
          <div dangerouslySetInnerHTML={{ __html: post.content.replace(/\n/g, "<br />") }} />
        </div>

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <div className="mt-16 border-t pt-8">
            <h2 className="mb-6 text-2xl font-bold">Related Posts</h2>
            <div className="grid gap-6 md:grid-cols-3">
              {relatedPosts.map((related) => (
                <Card key={related.id}>
                  <CardHeader className="pb-2">
                    {related.category && (
                      <Badge variant="secondary" className="mb-2 w-fit">
                        {related.category.name}
                      </Badge>
                    )}
                    <Link href={`/blog/${related.slug}`}>
                      <CardTitle className="hover:text-primary line-clamp-2 text-lg transition-colors">
                        {related.title}
                      </CardTitle>
                    </Link>
                  </CardHeader>
                  <CardContent>
                    {related.excerpt && (
                      <p className="text-muted-foreground line-clamp-2 text-sm">
                        {related.excerpt}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
