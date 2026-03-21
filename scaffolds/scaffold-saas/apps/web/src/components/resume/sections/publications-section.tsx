"use client";

import type { PublicationItem } from "@scaffold-saas/types";
import { IconExternalLink } from "@tabler/icons-react";
import { formatDate } from "@/lib/utils";

interface PublicationsSectionProps {
  title: string;
  content: PublicationItem[];
  readonly?: boolean;
}

export function PublicationsSection({ title, content }: PublicationsSectionProps) {
  if (!content || content.length === 0) {
    return (
      <section className="py-4">
        <h2 className="mb-3 border-b pb-1 text-lg font-semibold">{title}</h2>
        <p className="text-muted-foreground text-sm">No publications yet</p>
      </section>
    );
  }

  return (
    <section className="py-4">
      <h2 className="mb-3 border-b pb-1 text-lg font-semibold">{title}</h2>
      <div className="space-y-3">
        {content.map((pub, index) => (
          <div key={`${pub.title}-${index}`}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium">{pub.title}</h3>
                {pub.url && (
                  <a
                    href={pub.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-primary"
                  >
                    <IconExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
              {pub.date && (
                <span className="text-muted-foreground text-sm whitespace-nowrap">
                  {formatDate(pub.date)}
                </span>
              )}
            </div>
            {pub.publisher && <p className="text-muted-foreground text-sm">{pub.publisher}</p>}
            {pub.description && (
              <p className="text-muted-foreground mt-1 text-sm">{pub.description}</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
