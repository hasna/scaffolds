import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SectionHeader } from "@/components/marketing/section-header";
import {
  Target,
  Heart,
  Lightbulb,
  Users,
  Rocket,
  Shield,
  type LucideIcon,
} from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  Target,
  Heart,
  Lightbulb,
  Users,
  Rocket,
  Shield,
};

export interface ValueItem {
  icon: string;
  title: string;
  description: string;
}

export interface ValuesGridProps {
  /** Title for the section */
  title?: string;
  /** Description for the section */
  description?: string;
  /** Array of values to display */
  values: ValueItem[];
  /** Custom className */
  className?: string;
}

/**
 * ValuesGrid component for displaying company values.
 *
 * @example
 * ```tsx
 * <ValuesGrid
 *   title="Our Values"
 *   description="The principles that guide everything we do"
 *   values={[
 *     { icon: "Heart", title: "Quality", description: "We prioritize quality..." },
 *   ]}
 * />
 * ```
 */
export function ValuesGrid({
  title = "Our Values",
  description = "The principles that guide everything we do",
  values,
  className,
}: ValuesGridProps) {
  if (!values.length) return null;

  return (
    <div className={className ?? "mb-24"}>
      <SectionHeader
        title={title}
        description={description}
        variant="section"
      />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 max-w-5xl mx-auto">
        {values.map((value, index) => {
          const IconComponent = iconMap[value.icon] || Heart;
          return (
            <Card key={index} className="text-center">
              <CardHeader>
                <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <IconComponent className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">{value.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{value.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
