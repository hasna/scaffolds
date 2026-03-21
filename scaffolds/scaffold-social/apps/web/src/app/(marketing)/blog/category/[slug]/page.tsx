import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@scaffold-social/database/client";
import * as schema from "@scaffold-social/database/schema";
import { desc, eq, and } from "drizzle-orm";
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
  const category = await db.query.blogCategories.findFirst({
    where: eq(schema.blogCategories.slug, slug),
  });
  return category;
}

async function getCategoryPosts(categoryId: string) {
  const posts = await db.query.blogPosts.findMany({
    where: and(
      eq(schema.blogPosts.status, "published"),
      eq(schema.blogPosts.categoryId, categoryId)
    ),
    orderBy: [desc(schema.blogPosts.publishedAt)],
    with: {
      author: {
        columns: { id: true, name: true, avatarUrl: true },
      },
      category: true,
    },
  });
  return posts;
}

async function getAllCategories() {
  const categories = await db.query.blogCategories.findMany({
    orderBy: [schema.blogCategories.name],
  });
  return categories;
}

export default async function BlogCategoryPage({ params }: PageProps) {
  const { slug } = await params;
  const category = await getCategory(slug);

  if (!category) {
    notFound();
  }

  const [posts, categories] = await Promise.all([
    getCategoryPosts(category.id),
    getAllCategories(),
  ]);

  return (
    <div className="container py-12 md:py-20">
      {/* Back Link */}
      <Button variant="ghost" size="sm" className="mb-8" asChild>
        <Link href="/blog">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Blog
        </Link>
      </Button>

      <div className="mb-12 max-w-2xl">
        <Badge variant="secondary" className="mb-4">
          Category
        </Badge>
        <h1 className="text-4xl font-bold tracking-tight">{category.name}</h1>
        {category.description && (
          <p className="text-muted-foreground mt-4 text-lg">{category.description}</p>
        )}
      </div>

      {/* Categories */}
      <div className="mb-8 flex flex-wrap gap-2">
        <Link href="/blog">
          <Badge variant="outline" className="hover:bg-accent cursor-pointer">
            All
          </Badge>
        </Link>
        {categories.map((cat) => (
          <Link key={cat.id} href={`/blog/category/${cat.slug}`}>
            <Badge
              variant={cat.id === category.id ? "secondary" : "outline"}
              className="hover:bg-accent cursor-pointer"
            >
              {cat.name}
            </Badge>
          </Link>
        ))}
      </div>

      {/* Posts Grid */}
      {posts.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-muted-foreground">No posts in this category yet.</p>
        </div>
      ) : (
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <Card key={post.id} className="overflow-hidden">
              {post.featuredImage && (
                <Link href={`/blog/${post.slug}`}>
                  <img
                    src={post.featuredImage}
                    alt={post.title}
                    className="h-48 w-full object-cover"
                  />
                </Link>
              )}
              <CardHeader>
                <Link href={`/blog/${post.slug}`}>
                  <CardTitle className="hover:text-primary line-clamp-2 transition-colors">
                    {post.title}
                  </CardTitle>
                </Link>
              </CardHeader>
              <CardContent>
                {post.excerpt && (
                  <p className="text-muted-foreground mb-4 line-clamp-2">{post.excerpt}</p>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={post.author?.avatarUrl || undefined} />
                      <AvatarFallback>{post.author?.name?.charAt(0) || "A"}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">{post.author?.name || "Anonymous"}</span>
                  </div>
                  {post.publishedAt && (
                    <div className="text-muted-foreground flex items-center gap-1 text-sm">
                      <CalendarDays className="h-4 w-4" />
                      {new Date(post.publishedAt).toLocaleDateString()}
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
