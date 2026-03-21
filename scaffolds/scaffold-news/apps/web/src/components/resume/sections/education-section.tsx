"use client";

import type { EducationItem } from "@scaffold-news/types";
import { formatDateRange } from "@/lib/utils";

interface EducationSectionProps {
  title: string;
  content: EducationItem[];
  readonly?: boolean;
}

export function EducationSection({ title, content }: EducationSectionProps) {
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
          <div key={`${entry.institution}-${index}`}>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-medium">{entry.institution}</h3>
                <p className="text-muted-foreground text-sm">
                  {entry.degree}
                  {entry.field && ` in ${entry.field}`}
                  {entry.gpa && ` • GPA: ${entry.gpa}`}
                </p>
              </div>
              {(entry.startDate || entry.endDate) && (
                <span className="text-muted-foreground text-sm whitespace-nowrap">
                  {formatDateRange(entry.startDate, entry.endDate)}
                </span>
              )}
            </div>
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
