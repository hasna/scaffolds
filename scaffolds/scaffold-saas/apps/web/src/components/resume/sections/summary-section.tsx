"use client";

import type { SummaryContent } from "@scaffold-saas/types";

interface SummarySectionProps {
  title: string;
  content: SummaryContent;
  readonly?: boolean;
}

export function SummarySection({ title, content }: SummarySectionProps) {
  return (
    <section className="py-4">
      <h2 className="mb-3 border-b pb-1 text-lg font-semibold">{title}</h2>
      <p className="text-muted-foreground text-sm leading-relaxed">{content.text}</p>
    </section>
  );
}
