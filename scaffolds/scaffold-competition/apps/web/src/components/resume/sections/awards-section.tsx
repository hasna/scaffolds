"use client";

import type { AwardItem } from "@scaffold-competition/types";
import { formatDate } from "@/lib/utils";

interface AwardsSectionProps {
  title: string;
  content: AwardItem[];
  readonly?: boolean;
}

export function AwardsSection({ title, content }: AwardsSectionProps) {
  if (!content || content.length === 0) {
    return (
      <section className="py-4">
        <h2 className="mb-3 border-b pb-1 text-lg font-semibold">{title}</h2>
        <p className="text-muted-foreground text-sm">No awards yet</p>
      </section>
    );
  }

  return (
    <section className="py-4">
      <h2 className="mb-3 border-b pb-1 text-lg font-semibold">{title}</h2>
      <div className="space-y-3">
        {content.map((award, index) => (
          <div key={`${award.title}-${index}`} className="flex items-start justify-between">
            <div>
              <h3 className="text-sm font-medium">{award.title}</h3>
              <p className="text-muted-foreground text-sm">{award.issuer}</p>
              {award.description && (
                <p className="text-muted-foreground mt-1 text-sm">{award.description}</p>
              )}
            </div>
            {award.date && (
              <span className="text-muted-foreground text-sm whitespace-nowrap">
                {formatDate(award.date)}
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
