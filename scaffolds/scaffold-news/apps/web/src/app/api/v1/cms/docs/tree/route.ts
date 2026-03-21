import { NextResponse } from "next/server";
import { db } from "@scaffold-news/database/client";
import * as schema from "@scaffold-news/database/schema";
import { asc } from "drizzle-orm";

interface DocNode {
  id: string;
  slug: string;
  title: string;
  order: number;
  children: DocNode[];
}

function buildTree(docs: typeof schema.docsPages.$inferSelect[], parentId: string | null = null): DocNode[] {
  return docs
    .filter(doc => doc.parentId === parentId)
    .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title))
    .map(doc => ({
      id: doc.id,
      slug: doc.slug,
      title: doc.title,
      order: doc.order,
      children: buildTree(docs, doc.id),
    }));
}

export async function GET() {
  try {
    // Fetch all docs to build tree structure
    const docs = await db.query.docsPages.findMany({
      orderBy: [asc(schema.docsPages.order), asc(schema.docsPages.title)],
    });

    const tree = buildTree(docs, null);

    return NextResponse.json({ tree });
  } catch (error) {
    console.error("Get docs tree error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
