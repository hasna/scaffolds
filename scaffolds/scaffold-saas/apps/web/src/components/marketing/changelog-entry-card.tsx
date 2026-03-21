import { Badge } from "@/components/ui/badge";
import { Sparkles, Wrench, Bug, AlertTriangle, type LucideIcon } from "lucide-react";

const typeConfig: Record<string, { label: string; icon: LucideIcon; color: string }> = {
  feature: {
    label: "Feature",
    icon: Sparkles,
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  },
  improvement: {
    label: "Improvement",
    icon: Wrench,
    color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  },
  fix: {
    label: "Bug Fix",
    icon: Bug,
    color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  },
  breaking: {
    label: "Breaking",
    icon: AlertTriangle,
    color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  },
};

export interface ChangelogEntry {
  id: string;
  version: string;
  title: string;
  content: string;
  type?: string | null;
  publishedAt?: Date | string | null;
}

export interface ChangelogEntryCardProps {
  /** The changelog entry data */
  entry: ChangelogEntry;
  /** Whether to show the bottom border */
  showBorder?: boolean;
}

/**
 * ChangelogEntryCard component for displaying a single changelog entry.
 *
 * @example
 * ```tsx
 * <ChangelogEntryCard
 *   entry={{
 *     id: "1",
 *     version: "v1.0.0",
 *     title: "Initial Release",
 *     content: "First public release of the product.",
 *     type: "feature",
 *     publishedAt: new Date(),
 *   }}
 *   showBorder
 * />
 * ```
 */
export function ChangelogEntryCard({ entry, showBorder = false }: ChangelogEntryCardProps) {
  const typeInfo = entry.type ? typeConfig[entry.type] : null;
  const IconComponent = typeInfo?.icon;

  // Simple markdown-like rendering (replace with proper markdown renderer in production)
  const renderContent = (content: string) => {
    return content
      .replace(/\n\n/g, "</p><p>")
      .replace(/\n- /g, "</p><li>")
      .replace(/^- /gm, "<li>")
      .replace(/\n/g, "<br />");
  };

  const formatDate = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <article className={showBorder ? "pb-12 border-b" : ""}>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Badge variant="outline" className="font-mono">
          {entry.version}
        </Badge>
        {typeInfo && (
          <Badge className={typeInfo.color}>
            {IconComponent && <IconComponent className="mr-1 h-3 w-3" />}
            {typeInfo.label}
          </Badge>
        )}
        {entry.publishedAt && (
          <span className="text-sm text-muted-foreground">
            {formatDate(entry.publishedAt)}
          </span>
        )}
      </div>

      <h2 className="text-2xl font-bold mb-4">{entry.title}</h2>

      <div className="prose prose-sm dark:prose-invert max-w-none">
        <div
          dangerouslySetInnerHTML={{
            __html: renderContent(entry.content),
          }}
        />
      </div>
    </article>
  );
}
