import Link from "next/link";
import { db } from "@scaffold-news/database/client";
import * as schema from "@scaffold-news/database/schema";
import { desc } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Eye } from "lucide-react";

export const dynamic = "force-dynamic";

const STATUS_VARIANTS = {
  draft: "secondary",
  published: "default",
  archived: "outline",
} as const;

async function getAllArticles() {
  return db.query.articles.findMany({
    orderBy: [desc(schema.articles.createdAt)],
    with: {
      author: { columns: { id: true, name: true } },
      category: true,
    },
  });
}

export default async function AdminArticlesPage() {
  const articles = await getAllArticles();

  return (
    <div className="container py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Articles</h1>
          <p className="text-muted-foreground mt-1">{articles.length} total articles</p>
        </div>
        <Button asChild>
          <Link href="/admin/articles/new">
            <Plus className="mr-2 h-4 w-4" />
            New Article
          </Link>
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Author</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Published</TableHead>
              <TableHead>Views</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {articles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-muted-foreground py-10 text-center">
                  No articles yet.{" "}
                  <Link href="/admin/articles/new" className="text-primary underline">
                    Create your first article
                  </Link>
                </TableCell>
              </TableRow>
            ) : (
              articles.map((article) => (
                <TableRow key={article.id}>
                  <TableCell className="font-medium">
                    <span className="line-clamp-1 max-w-xs">{article.title}</span>
                  </TableCell>
                  <TableCell>
                    {article.category ? (
                      <Badge variant="outline">{article.category.name}</Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{article.author?.name ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANTS[article.status]}>
                      {article.status}
                    </Badge>
                    {article.featured && (
                      <Badge variant="secondary" className="ml-1">
                        featured
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {article.publishedAt
                      ? new Date(article.publishedAt).toLocaleDateString()
                      : "—"}
                  </TableCell>
                  <TableCell className="text-sm">{article.viewCount.toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {article.status === "published" && (
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/articles/${article.slug}`} target="_blank">
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/admin/articles/${article.id}/edit`}>
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
