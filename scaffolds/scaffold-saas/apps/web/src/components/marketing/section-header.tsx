import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface SectionHeaderProps {
  /** Badge text (e.g., "About Us", "Features") */
  badge?: string;
  /** Main heading text */
  title: string;
  /** Subheading/description text */
  description?: string;
  /** Variant for styling: "hero" for page heroes, "section" for content sections */
  variant?: "hero" | "section";
  /** Custom className for additional styling */
  className?: string;
  /** Whether to constrain the max-width */
  constrained?: boolean;
}

/**
 * SectionHeader component for marketing pages.
 *
 * Use "hero" variant for page headers (larger text, more spacing).
 * Use "section" variant for section headers within a page.
 *
 * @example
 * ```tsx
 * // Page hero
 * <SectionHeader
 *   badge="Features"
 *   title="Everything you need to build your SaaS"
 *   description="A complete toolkit for building production-ready apps."
 *   variant="hero"
 * />
 *
 * // Section header
 * <SectionHeader
 *   title="Our Values"
 *   description="The principles that guide everything we do"
 *   variant="section"
 * />
 * ```
 */
export function SectionHeader({
  badge,
  title,
  description,
  variant = "section",
  className,
  constrained = true,
}: SectionHeaderProps) {
  const isHero = variant === "hero";

  return (
    <div
      className={cn(
        "text-center",
        constrained && "mx-auto",
        isHero ? "max-w-3xl mb-16" : "mb-12",
        className
      )}
    >
      {badge && (
        <Badge variant="outline" className="mb-4">
          {badge}
        </Badge>
      )}
      {isHero ? (
        <h1 className="text-4xl font-bold tracking-tight mb-4 sm:text-5xl">
          {title}
        </h1>
      ) : (
        <h2 className="text-3xl font-bold mb-4">{title}</h2>
      )}
      {description && (
        <p
          className={cn(
            "text-muted-foreground",
            isHero ? "text-lg" : "text-base"
          )}
        >
          {description}
        </p>
      )}
    </div>
  );
}
