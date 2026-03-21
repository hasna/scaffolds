"use client";

import type { CustomItem } from "@scaffold-social/types";
import { formatDate } from "@/lib/utils";

interface CustomSectionProps {
  title: string;
  content: CustomItem[];
  readonly?: boolean;
}

export function CustomSection({ title, content }: CustomSectionProps) {
  if (!content || content.length === 0) {
    return (
      <section className="py-4">
        <h2 className="mb-3 border-b pb-1 text-lg font-semibold">{title}</h2>
        <p className="text-muted-foreground text-sm">No entries yet</p>
      </section>
    );
  }

  return (
    <section className="py-4">
      <h2 className="mb-3 border-b pb-1 text-lg font-semibold">{title}</h2>
      <div className="space-y-4">
        {content.map((entry, index) => (
          <div key={`${entry.title ?? "custom"}-${index}`}>
            <div className="flex items-start justify-between">
              <div>
                {entry.title && <h3 className="font-medium">{entry.title}</h3>}
                {entry.subtitle && (
                  <p className="text-muted-foreground text-sm">{entry.subtitle}</p>
                )}
              </div>
              {entry.date && (
                <span className="text-muted-foreground text-sm whitespace-nowrap">
                  {formatDate(entry.date)}
                </span>
              )}
            </div>
            {entry.description && (
              <p className="text-muted-foreground mt-1 text-sm">{entry.description}</p>
            )}
            {entry.highlights && entry.highlights.length > 0 && (
              <ul className="mt-2 ml-4 list-outside list-disc space-y-1">
                {entry.highlights.map((highlight, i) => (
                  <li key={i} className="text-muted-foreground text-sm">
                    {highlight}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
