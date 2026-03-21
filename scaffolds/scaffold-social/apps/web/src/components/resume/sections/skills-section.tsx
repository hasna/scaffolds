"use client";

import { Badge } from "@/components/ui/badge";

// Handle multiple data formats
interface SkillCategory {
  name: string;
  skills: string[];
}

interface SkillItem {
  category?: string;
  skills?: string[];
  level?: string;
}

export type SkillsContentType = { categories?: SkillCategory[] } | SkillItem[];

interface SkillsSectionProps {
  title: string;
  content: SkillsContentType;
  readonly?: boolean;
}

export function SkillsSection({ title, content }: SkillsSectionProps) {
  // Normalize skills data to categories format
  let categories: SkillCategory[] = [];

  if (!content) {
    // No content
  } else if (
    typeof content === "object" &&
    "categories" in content &&
    Array.isArray((content as { categories?: SkillCategory[] }).categories)
  ) {
    // Object with categories array: { categories: [...] }
    categories = (content as { categories: SkillCategory[] }).categories;
  } else if (Array.isArray(content)) {
    // Array of skill items: [{ category: "...", skills: [...] }, ...]
    categories = (content as SkillItem[])
      .filter((item) => item.skills && item.skills.length > 0)
      .map((item) => ({
        name: item.category || "Skills",
        skills: item.skills || [],
      }));
  }

  if (categories.length === 0) {
    return (
      <section className="py-4">
        <h2 className="mb-3 border-b pb-1 text-lg font-semibold">{title}</h2>
        <p className="text-muted-foreground text-sm">No skills yet</p>
      </section>
    );
  }

  return (
    <section className="py-4">
      <h2 className="mb-3 border-b pb-1 text-lg font-semibold">{title}</h2>
      <div className="space-y-3">
        {categories.map((category, idx) => (
          <div key={idx}>
            <h3 className="mb-1.5 text-sm font-medium">{category.name}</h3>
            <div className="flex flex-wrap gap-1.5">
              {category.skills.map((skill, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
