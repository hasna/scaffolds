"use client";

import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PricingCard } from "@/components/marketing/pricing-card";

interface Plan {
  id: string;
  name: string;
  slug: string;
  priceMonthly: number;
  priceYearly: number;
  description: string;
  features: Array<{ name: string; included: boolean }>;
  popular: boolean;
}

interface PricingToggleProps {
  plans: Plan[];
}

export function PricingToggle({ plans }: PricingToggleProps) {
  const [isYearly, setIsYearly] = useState(false);

  const getMonthlyEquivalent = (yearlyPrice: number) => {
    return Math.round(yearlyPrice / 12);
  };

  const getSavingsPercent = (monthly: number, yearly: number) => {
    if (monthly === 0) return 0;
    const yearlyMonthly = yearly / 12;
    return Math.round(((monthly - yearlyMonthly) / monthly) * 100);
  };

  return (
    <>
      {/* Billing Toggle */}
      <div className="flex items-center justify-center gap-4 mb-12">
        <span className={cn("text-sm", !isYearly && "font-medium")}>Monthly</span>
        <Switch
          checked={isYearly}
          onCheckedChange={setIsYearly}
          aria-label="Toggle yearly billing"
        />
        <span className={cn("text-sm", isYearly && "font-medium")}>
          Yearly
          <Badge variant="secondary" className="ml-2">Save up to 20%</Badge>
        </span>
      </div>

      {/* Pricing Cards */}
      <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-3">
        {plans.map((plan) => {
          const displayPrice = isYearly
            ? getMonthlyEquivalent(plan.priceYearly)
            : plan.priceMonthly;
          const savings = getSavingsPercent(plan.priceMonthly, plan.priceYearly);

          return (
            <PricingCard
              key={plan.id}
              name={plan.name}
              slug={plan.slug}
              description={plan.description}
              displayPrice={displayPrice}
              yearlyPrice={plan.priceYearly}
              isYearly={isYearly}
              savingsPercent={savings}
              features={plan.features}
              popular={plan.popular}
            />
          );
        })}
      </div>
    </>
  );
}
