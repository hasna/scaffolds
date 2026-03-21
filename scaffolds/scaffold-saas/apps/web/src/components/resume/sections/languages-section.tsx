"use client";

import type { LanguageItem } from "@scaffold-saas/types";
import { Badge } from "@/components/ui/badge";

interface LanguagesSectionProps {
  title: string;
  content: LanguageItem[];
  readonly?: boolean;
}

const proficiencyLabels: Record<string, string> = {
  native: "Native",
  fluent: "Fluent",
  professional: "Professional",
  intermediate: "Intermediate",
  basic: "Basic",
};

export function LanguagesSection({ title, content }: LanguagesSectionProps) {
  if (!content || content.length === 0) {
    return (
      <section className="py-4">
        <h2 className="mb-3 border-b pb-1 text-lg font-semibold">{title}</h2>
        <p className="text-muted-foreground text-sm">No languages yet</p>
      </section>
    );
  }

  return (
    <section className="py-4">
      <h2 className="mb-3 border-b pb-1 text-lg font-semibold">{title}</h2>
      <div className="flex flex-wrap gap-3">
        {content.map((lang, index) => (
          <div key={`${lang.language}-${index}`} className="flex items-center gap-2">
            <span className="text-sm font-medium">{lang.language}</span>
            <Badge variant="secondary" className="text-xs">
              {proficiencyLabels[lang.proficiency] || lang.proficiency}
            </Badge>
          </div>
        ))}
      </div>
    </section>
  );
}
