import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@scaffold-landing-pages/database/client";
import * as schema from "@scaffold-landing-pages/database/schema";
import { eq, asc } from "drizzle-orm";
import { ArrowLeft, ArrowRight, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface DocsSlugPageProps {
  params: Promise<{
    slug: string[];
  }>;
}

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

function flattenTree(tree: DocNode[]): DocNode[] {
  const result: DocNode[] = [];
  for (const node of tree) {
    result.push(node);
    if (node.children.length > 0) {
      result.push(...flattenTree(node.children));
    }
  }
  return result;
}

async function getAllDocs() {
  const docs = await db.query.docsPages.findMany({
    orderBy: [asc(schema.docsPages.order), asc(schema.docsPages.title)],
  });
  return docs;
}

async function getDocBySlug(slug: string) {
  const doc = await db.query.docsPages.findFirst({
    where: eq(schema.docsPages.slug, slug),
  });
  return doc;
}

function getBreadcrumbs(
  docs: (typeof schema.docsPages.$inferSelect)[],
  currentDoc: typeof schema.docsPages.$inferSelect
): { label: string; href: string }[] {
  const breadcrumbs: { label: string; href: string }[] = [{ label: "Docs", href: "/docs" }];

  // Build path from root to current doc
  const path: (typeof schema.docsPages.$inferSelect)[] = [];
  let current: typeof schema.docsPages.$inferSelect | undefined = currentDoc;

  while (current) {
    path.unshift(current);
    current = current.parentId ? docs.find((d) => d.id === current!.parentId) : undefined;
  }

  for (const doc of path) {
    breadcrumbs.push({
      label: doc.title,
      href: `/docs/${doc.slug}`,
    });
  }

  return breadcrumbs;
}

function extractHeadings(content: string): { id: string; text: string; level: number }[] {
  const headingRegex = /^(#{1,3})\s+(.+)$/gm;
  const headings: { id: string; text: string; level: number }[] = [];
  let match;

  while ((match = headingRegex.exec(content)) !== null) {
    const level = match[1]?.length || 1;
    const text = match[2];
    if (!text) continue;
    const id = text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    headings.push({ id, text, level });
  }

  return headings;
}

function renderContent(content: string): string {
  // Basic markdown to HTML conversion
  const html = content
    // Headers with IDs for anchor links
    .replace(/^### (.+)$/gm, (_, text) => {
      const id = text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      return `<h3 id="${id}" class="text-xl font-semibold mt-8 mb-4">${text}</h3>`;
    })
    .replace(/^## (.+)$/gm, (_, text) => {
      const id = text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      return `<h2 id="${id}" class="text-2xl font-bold mt-10 mb-4">${text}</h2>`;
    })
    .replace(/^# (.+)$/gm, (_, text) => {
      const id = text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      return `<h1 id="${id}" class="text-3xl font-bold mt-10 mb-4">${text}</h1>`;
    })
    // Code blocks
    .replace(
      /```(\w+)?\n([\s\S]*?)```/g,
      '<pre class="bg-muted p-4 rounded-lg overflow-x-auto my-4"><code>$2</code></pre>'
    )
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="bg-muted px-1.5 py-0.5 rounded text-sm">$1</code>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    // Italic
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary hover:underline">$1</a>')
    // Unordered lists
    .replace(/^- (.+)$/gm, '<li class="ml-4">$1</li>')
    // Ordered lists
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal">$1</li>')
    // Paragraphs (lines that don't start with special chars)
    .replace(/^(?!<[hlopu]|<pre|<li)(.+)$/gm, '<p class="text-muted-foreground mb-4">$1</p>')
    // Wrap consecutive list items
    .replace(/(<li class="ml-4">[\s\S]*?<\/li>\n?)+/g, '<ul class="list-disc mb-4">$&</ul>')
    .replace(/(<li class="ml-4 list-decimal">[\s\S]*?<\/li>\n?)+/g, '<ol class="mb-4">$&</ol>');

  return html;
}

function NavTree({
  nodes,
  currentSlug,
  depth = 0,
}: {
  nodes: DocNode[];
  currentSlug: string;
  depth?: number;
}) {
  return (
    <ul className={cn("space-y-1", depth > 0 && "ml-4 border-l pl-4")}>
      {nodes.map((node) => (
        <li key={node.id}>
          <Link
            href={`/docs/${node.slug}`}
            className={cn(
              "hover:text-primary block py-1.5 text-sm transition-colors",
              node.slug === currentSlug ? "text-primary font-medium" : "text-muted-foreground"
            )}
          >
            {node.title}
          </Link>
          {node.children.length > 0 && (
            <NavTree nodes={node.children} currentSlug={currentSlug} depth={depth + 1} />
          )}
        </li>
      ))}
    </ul>
  );
}

export default async function DocsSlugPage({ params }: DocsSlugPageProps) {
  const { slug } = await params;
  const fullSlug = slug.join("/");

  const [doc, allDocs] = await Promise.all([getDocBySlug(fullSlug), getAllDocs()]);

  if (!doc) {
    notFound();
  }

  const tree = buildTree(allDocs, null);
  const flatDocs = flattenTree(tree);
  const currentIndex = flatDocs.findIndex((d) => d.slug === fullSlug);
  const prevDoc = currentIndex > 0 ? flatDocs[currentIndex - 1] : null;
  const nextDoc = currentIndex < flatDocs.length - 1 ? flatDocs[currentIndex + 1] : null;

  const breadcrumbs = getBreadcrumbs(allDocs, doc);
  const headings = extractHeadings(doc.content);
  const renderedContent = renderContent(doc.content);

  return (
    <div className="container py-8 md:py-12">
      <div className="flex gap-12">
        {/* Sidebar Navigation */}
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="sticky top-24">
            <h4 className="mb-4 font-semibold">Documentation</h4>
            <NavTree nodes={tree} currentSlug={fullSlug} />
          </div>
        </aside>

        {/* Main Content */}
        <main className="min-w-0 flex-1">
          {/* Breadcrumbs */}
          <nav className="text-muted-foreground mb-6 flex items-center gap-2 text-sm">
            {breadcrumbs.map((crumb, index) => (
              <span key={crumb.href} className="flex items-center gap-2">
                {index > 0 && <ChevronRight className="h-4 w-4" />}
                {index === breadcrumbs.length - 1 ? (
                  <span className="text-foreground">{crumb.label}</span>
                ) : (
                  <Link href={crumb.href as any} className="hover:text-foreground">
                    {crumb.label}
                  </Link>
                )}
              </span>
            ))}
          </nav>

          {/* Title */}
          <div className="mb-8">
            <h1 className="mb-4 text-4xl font-bold tracking-tight">{doc.title}</h1>
            {doc.seoDescription && (
              <p className="text-muted-foreground text-xl">{doc.seoDescription}</p>
            )}
          </div>

          {/* Content */}
          <div
            className="prose prose-lg dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: renderedContent }}
          />

          {/* Previous/Next Navigation */}
          <div className="mt-16 flex items-center justify-between border-t pt-8">
            {prevDoc ? (
              <Link href={`/docs/${prevDoc.slug}`} className="group flex flex-col">
                <span className="text-muted-foreground mb-1 flex items-center gap-1 text-sm">
                  <ArrowLeft className="h-4 w-4" />
                  Previous
                </span>
                <span className="group-hover:text-primary font-medium transition-colors">
                  {prevDoc.title}
                </span>
              </Link>
            ) : (
              <div />
            )}
            {nextDoc ? (
              <Link href={`/docs/${nextDoc.slug}`} className="group flex flex-col items-end">
                <span className="text-muted-foreground mb-1 flex items-center gap-1 text-sm">
                  Next
                  <ArrowRight className="h-4 w-4" />
                </span>
                <span className="group-hover:text-primary font-medium transition-colors">
                  {nextDoc.title}
                </span>
              </Link>
            ) : (
              <div />
            )}
          </div>
        </main>

        {/* Table of Contents */}
        {headings.length > 0 && (
          <aside className="hidden w-56 shrink-0 xl:block">
            <div className="sticky top-24">
              <h4 className="mb-4 font-semibold">On This Page</h4>
              <ul className="space-y-2 text-sm">
                {headings.map((heading) => (
                  <li key={heading.id} className={cn(heading.level === 3 && "ml-4")}>
                    <a
                      href={`#${heading.id}`}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {heading.text}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

export async function generateMetadata({ params }: DocsSlugPageProps) {
  const { slug } = await params;
  const fullSlug = slug.join("/");
  const doc = await getDocBySlug(fullSlug);

  if (!doc) {
    return {
      title: "Not Found - Documentation",
    };
  }

  return {
    title: doc.seoTitle || `${doc.title} - Documentation`,
    description: doc.seoDescription || `Documentation for ${doc.title}`,
  };
}
