import Link from "next/link";
import { db } from "@scaffold-saas/database/client";
import * as schema from "@scaffold-saas/database/schema";
import { asc } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, BookOpen, FileText } from "lucide-react";

export const dynamic = "force-dynamic";

interface DocNode {
  id: string;
  slug: string;
  title: string;
  children: DocNode[];
}

function buildTree(
  docs: (typeof schema.docsPages.$inferSelect)[],
  parentId: string | null = null
): DocNode[] {
  return docs
    .filter((doc) => doc.parentId === parentId)
    .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title))
    .map((doc) => ({
      id: doc.id,
      slug: doc.slug,
      title: doc.title,
      children: buildTree(docs, doc.id),
    }));
}

async function getDocs() {
  const docs = await db.query.docsPages.findMany({
    orderBy: [asc(schema.docsPages.order), asc(schema.docsPages.title)],
  });
  return docs;
}

export default async function DocsPage() {
  const docs = await getDocs();
  const tree = buildTree(docs, null);

  // Get first doc for quick start
  const firstDoc = docs.length > 0 ? docs.find((d) => d.parentId === null) : null;

  return (
    <div className="container py-12 md:py-20">
      {/* Header */}
      <div className="mx-auto mb-12 max-w-3xl text-center">
        <Badge variant="outline" className="mb-4">
          Documentation
        </Badge>
        <h1 className="mb-4 text-4xl font-bold tracking-tight">Build with SaaS Scaffold</h1>
        <p className="text-muted-foreground mb-8 text-lg">
          Everything you need to integrate and build with our platform.
        </p>
        <div className="flex justify-center gap-4">
          {firstDoc ? (
            <Button size="lg" asChild>
              <Link href={`/docs/${firstDoc.slug}`}>
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          ) : (
            <Button size="lg" disabled>
              Get Started
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
          <Button size="lg" variant="outline" asChild>
            <Link href="/docs/api">API Reference</Link>
          </Button>
        </div>
      </div>

      {/* Documentation Tree */}
      {tree.length === 0 ? (
        <div className="py-12 text-center">
          <BookOpen className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
          <p className="text-muted-foreground">Documentation is coming soon. Check back later!</p>
        </div>
      ) : (
        <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2 lg:grid-cols-3">
          {tree.map((section) => (
            <Card key={section.id} className="hover:border-primary transition-colors">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
                    <FileText className="text-primary h-5 w-5" />
                  </div>
                  <CardTitle>
                    <Link
                      href={`/docs/${section.slug}`}
                      className="hover:text-primary transition-colors"
                    >
                      {section.title}
                    </Link>
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {section.children.length > 0 ? (
                  <ul className="space-y-2">
                    {section.children.slice(0, 5).map((child) => (
                      <li key={child.id}>
                        <Link
                          href={`/docs/${child.slug}`}
                          className="text-muted-foreground hover:text-primary text-sm transition-colors"
                        >
                          {child.title}
                        </Link>
                      </li>
                    ))}
                    {section.children.length > 5 && (
                      <li className="text-muted-foreground text-sm">
                        +{section.children.length - 5} more...
                      </li>
                    )}
                  </ul>
                ) : (
                  <Link
                    href={`/docs/${section.slug}`}
                    className="text-primary text-sm hover:underline"
                  >
                    Read more →
                  </Link>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
