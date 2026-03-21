import { ModernTemplate } from "./modern-template";
import { ClassicTemplate } from "./classic-template";
import { MinimalTemplate } from "./minimal-template";
import type { Resume } from "@scaffold-social/types";
import type { ComponentType } from "react";

export const templates: Record<string, ComponentType<{ resume: Resume }>> = {
  modern: ModernTemplate,
  classic: ClassicTemplate,
  minimal: MinimalTemplate,
};

export function getTemplate(name: string): ComponentType<{ resume: Resume }> {
  const fallback: ComponentType<{ resume: Resume }> = ModernTemplate;
  return templates[name] ?? fallback;
}

export { ModernTemplate, ClassicTemplate, MinimalTemplate };
