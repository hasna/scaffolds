"use client";

import type { VolunteerItem } from "@scaffold-review/types";
import { formatDateRange } from "@/lib/utils";

interface VolunteerSectionProps {
  title: string;
  content: VolunteerItem[];
  readonly?: boolean;
}

export function VolunteerSection({ title, content }: VolunteerSectionProps) {
  if (!content || content.length === 0) {
    return (
      <section className="py-4">
        <h2 className="mb-3 border-b pb-1 text-lg font-semibold">{title}</h2>
        <p className="text-muted-foreground text-sm">No volunteer experience yet</p>
      </section>
    );
  }

  return (
    <section className="py-4">
      <h2 className="mb-3 border-b pb-1 text-lg font-semibold">{title}</h2>
      <div className="space-y-4">
        {content.map((entry, index) => (
          <div key={`${entry.organization}-${index}`}>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-medium">{entry.role}</h3>
                <p className="text-muted-foreground text-sm">
                  {entry.organization}
                  {entry.location && ` • ${entry.location}`}
                </p>
              </div>
              {(entry.startDate || entry.endDate) && (
                <span className="text-muted-foreground text-sm whitespace-nowrap">
                  {formatDateRange(entry.startDate, entry.endDate)}
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
