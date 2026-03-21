"use client";

import { formatDateRange } from "@/lib/utils";

// Extended interface to handle both field naming conventions
interface ExperienceItem {
  id?: string;
  // Both naming conventions
  title?: string; // From types package
  position?: string; // From database schema
  company?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  current?: boolean;
  isCurrent?: boolean;
  description?: string;
  bullets?: string[]; // From types package
  highlights?: string[]; // From database schema
}

interface ExperienceSectionProps {
  title: string;
  content: ExperienceItem[];
  readonly?: boolean;
}

export function ExperienceSection({ title, content }: ExperienceSectionProps) {
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
        {content.map((entry, idx) => {
          // Handle both naming conventions
          const jobTitle = entry.title || entry.position || "";
          const isCurrent = entry.current || entry.isCurrent;
          const bulletPoints = entry.bullets || entry.highlights || [];

          return (
            <div key={entry.id || idx}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium">{jobTitle}</h3>
                  <p className="text-muted-foreground text-sm">
                    {entry.company}
                    {entry.location && ` • ${entry.location}`}
                  </p>
                </div>
                <span className="text-muted-foreground text-sm whitespace-nowrap">
                  {formatDateRange(entry.startDate, isCurrent ? undefined : entry.endDate)}
                </span>
              </div>
              {entry.description && (
                <p className="text-muted-foreground mt-1 text-sm">{entry.description}</p>
              )}
              {bulletPoints.length > 0 && (
                <ul className="mt-2 ml-4 list-outside list-disc space-y-1">
                  {bulletPoints.map((bullet, i) => (
                    <li key={i} className="text-muted-foreground text-sm">
                      {bullet}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
