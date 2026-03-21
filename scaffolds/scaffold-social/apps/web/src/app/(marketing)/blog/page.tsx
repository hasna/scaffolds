import Link from "next/link";
import { db } from "@scaffold-social/database/client";
import * as schema from "@scaffold-social/database/schema";
import { desc, eq } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CalendarDays } from "lucide-react";

export const dynamic = "force-dynamic";

async function getBlogPosts() {
  const posts = await db.query.blogPosts.findMany({
    where: eq(schema.blogPosts.status, "published"),
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

async function getCategories() {
  const categories = await db.query.blogCategories.findMany({
    orderBy: [schema.blogCategories.name],
  });
  return categories;
}

export default async function BlogPage() {
  const [posts, categories] = await Promise.all([getBlogPosts(), getCategories()]);

  return (
    <div className="container py-12 md:py-20">
      <div className="mb-12 max-w-2xl">
        <h1 className="text-4xl font-bold tracking-tight">Blog</h1>
        <p className="text-muted-foreground mt-4 text-lg">
          Insights, updates, and guides from our team.
        </p>
      </div>

      {/* Categories */}
      {categories.length > 0 && (
        <div className="mb-8 flex flex-wrap gap-2">
          <Link href="/blog">
            <Badge variant="secondary" className="hover:bg-secondary/80 cursor-pointer">
              All
            </Badge>
          </Link>
          {categories.map((category) => (
            <Link key={category.id} href={`/blog/category/${category.slug}`}>
              <Badge variant="outline" className="hover:bg-accent cursor-pointer">
                {category.name}
              </Badge>
            </Link>
          ))}
        </div>
      )}

      {/* Posts Grid */}
      {posts.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-muted-foreground">No posts yet. Check back soon!</p>
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
                {post.category && (
                  <Link href={`/blog/category/${post.category.slug}`}>
                    <Badge variant="secondary" className="mb-2 w-fit">
                      {post.category.name}
                    </Badge>
                  </Link>
                )}
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
