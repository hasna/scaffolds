import { db } from "@scaffold-saas/database/client";
import * as schema from "@scaffold-saas/database/schema";
import { desc, isNotNull } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import { Rss } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChangelogEntryCard } from "@/components/marketing/changelog-entry-card";

export const dynamic = "force-dynamic";

async function getChangelogEntries() {
  const entries = await db.query.changelogEntries.findMany({
    where: isNotNull(schema.changelogEntries.publishedAt),
    orderBy: [desc(schema.changelogEntries.publishedAt), desc(schema.changelogEntries.createdAt)],
  });
  return entries;
}

export default async function ChangelogPage() {
  const entries = await getChangelogEntries();

  return (
    <div className="container py-12 md:py-20">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-12 text-center">
          <Badge variant="outline" className="mb-4">
            Changelog
          </Badge>
          <h1 className="mb-4 text-4xl font-bold tracking-tight">What&apos;s New</h1>
          <p className="text-muted-foreground text-lg">
            Stay up to date with the latest features, improvements, and bug fixes.
          </p>
          <Button variant="outline" size="sm" className="mt-4" asChild>
            <Link href="/changelog">
              <Rss className="mr-2 h-4 w-4" />
              RSS Feed
            </Link>
          </Button>
        </div>

        {/* Entries */}
        {entries.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-muted-foreground">No changelog entries yet.</p>
          </div>
        ) : (
          <div className="space-y-12">
            {entries.map((entry, index) => (
              <ChangelogEntryCard
                key={entry.id}
                entry={entry}
                showBorder={index !== entries.length - 1}
              />
            ))}
          </div>
        )}

        {/* Subscribe */}
        <div className="mt-16 border-t pt-8 text-center">
          <h2 className="mb-2 text-xl font-bold">Stay Updated</h2>
          <p className="text-muted-foreground mb-4">
            Follow us on social media or subscribe to our RSS feed to get notified about updates.
          </p>
        </div>
      </div>
    </div>
  );
}
