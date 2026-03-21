import { LucideIcon } from "lucide-react";
import * as Icons from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface Feature {
  icon?: string;
  title: string;
  description: string;
}

interface FeaturesGridProps {
  title?: string;
  subtitle?: string;
  features: Feature[];
  columns?: 2 | 3 | 4;
}

export function FeaturesGrid({
  title,
  subtitle,
  features,
  columns = 3,
}: FeaturesGridProps) {
  const gridCols = {
    2: "md:grid-cols-2",
    3: "md:grid-cols-2 lg:grid-cols-3",
    4: "md:grid-cols-2 lg:grid-cols-4",
  };

  return (
    <section className="py-20">
      <div className="container">
        {(title || subtitle) && (
          <div className="mx-auto max-w-2xl text-center mb-12">
            {title && (
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="mt-4 text-lg text-muted-foreground">{subtitle}</p>
            )}
          </div>
        )}
        <div className={`grid gap-6 ${gridCols[columns]}`}>
          {features.map((feature, index) => {
            const IconComponent = feature.icon
              ? (Icons as any as Record<string, LucideIcon>)[feature.icon] || Icons.Sparkles
              : Icons.Sparkles;

            return (
              <Card key={index} className="border-2">
                <CardHeader>
                  <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <IconComponent className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
