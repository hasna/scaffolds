import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PricingFeature {
  name: string;
  included: boolean;
}

export interface PricingCardProps {
  /** Plan name (e.g., "Free", "Pro", "Enterprise") */
  name: string;
  /** Plan slug for URL (e.g., "free", "pro") */
  slug: string;
  /** Short description of the plan */
  description: string;
  /** Display price (already calculated for monthly/yearly) */
  displayPrice: number;
  /** Original yearly price (for "billed as" text) */
  yearlyPrice?: number;
  /** Whether currently on yearly billing */
  isYearly?: boolean;
  /** Savings percentage when on yearly billing */
  savingsPercent?: number;
  /** List of features with included status */
  features: PricingFeature[];
  /** Whether this is the popular/recommended plan */
  popular?: boolean;
  /** Custom className */
  className?: string;
}

/**
 * PricingCard component for displaying a single pricing plan.
 *
 * @example
 * ```tsx
 * <PricingCard
 *   name="Pro"
 *   slug="pro"
 *   description="For growing teams"
 *   displayPrice={2900}
 *   features={[
 *     { name: "Unlimited projects", included: true },
 *     { name: "Priority support", included: true },
 *   ]}
 *   popular
 * />
 * ```
 */
export function PricingCard({
  name,
  slug,
  description,
  displayPrice,
  yearlyPrice,
  isYearly = false,
  savingsPercent = 0,
  features,
  popular = false,
  className,
}: PricingCardProps) {
  const formatPrice = (cents: number) => {
    if (cents === 0) return "Free";
    return `$${(cents / 100).toFixed(0)}`;
  };

  const isFree = displayPrice === 0;

  return (
    <Card
      className={cn(
        "relative flex flex-col",
        popular && "border-primary shadow-lg",
        className
      )}
    >
      {popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge>Most Popular</Badge>
        </div>
      )}
      <CardHeader>
        <CardTitle>{name}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="mb-6">
          <div className="flex items-baseline">
            <span className="text-4xl font-bold">
              {formatPrice(displayPrice)}
            </span>
            {!isFree && (
              <span className="ml-1 text-muted-foreground">/month</span>
            )}
          </div>
          {isYearly && !isFree && savingsPercent > 0 && (
            <p className="mt-1 text-sm text-green-600 dark:text-green-400">
              Save {savingsPercent}% with yearly billing
            </p>
          )}
          {isYearly && yearlyPrice && yearlyPrice > 0 && (
            <p className="mt-1 text-xs text-muted-foreground">
              Billed as {formatPrice(yearlyPrice)}/year
            </p>
          )}
        </div>

        <ul className="space-y-3">
          {features.map((feature, index) => (
            <li key={index} className="flex items-center gap-2 text-sm">
              {feature.included ? (
                <Check className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
              ) : (
                <X className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
              <span className={cn(!feature.included && "text-muted-foreground")}>
                {feature.name}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>
        <Button
          className="w-full"
          variant={popular ? "default" : "outline"}
          asChild
        >
          <Link href={`/register?plan=${slug}&billing=${isYearly ? "yearly" : "monthly"}`}>
            {isFree ? "Get Started" : "Start Free Trial"}
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
