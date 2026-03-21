"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Shield,
  Users,
  CreditCard,
  Bot,
  Webhook,
  Zap,
  Database,
  Lock,
  Bell,
  Settings,
  Code,
  Globe,
  type LucideIcon,
} from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  Shield,
  Users,
  CreditCard,
  Bot,
  Webhook,
  Zap,
  Database,
  Lock,
  Bell,
  Settings,
  Code,
  Globe,
};

export interface FeatureItem {
  icon: string;
  title: string;
  description: string;
}

export interface FeatureCategory {
  id: string;
  name: string;
  description: string;
  features: FeatureItem[];
}

export interface FeatureCategoryTabsProps {
  /** Array of feature categories to display */
  categories: FeatureCategory[];
  /** Custom className */
  className?: string;
}

/**
 * FeatureCategoryTabs component for displaying categorized features in tabs.
 *
 * @example
 * ```tsx
 * <FeatureCategoryTabs
 *   categories={[
 *     {
 *       id: "auth",
 *       name: "Authentication",
 *       description: "Security features",
 *       features: [
 *         { icon: "Shield", title: "2FA", description: "Two-factor authentication" },
 *       ],
 *     },
 *   ]}
 * />
 * ```
 */
export function FeatureCategoryTabs({ categories, className }: FeatureCategoryTabsProps) {
  if (!categories.length) return null;

  return (
    <Tabs defaultValue={categories[0]?.id} className={className ?? "max-w-5xl mx-auto"}>
      <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 mb-8">
        {categories.map((category) => (
          <TabsTrigger key={category.id} value={category.id}>
            {category.name}
          </TabsTrigger>
        ))}
      </TabsList>

      {categories.map((category) => (
        <TabsContent key={category.id} value={category.id}>
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">{category.name}</h2>
            <p className="text-muted-foreground">{category.description}</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {category.features.map((feature, index) => {
              const IconComponent = iconMap[feature.icon] || Zap;
              return (
                <Card key={index}>
                  <CardHeader>
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                      <IconComponent className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-sm">{feature.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      ))}
    </Tabs>
  );
}
