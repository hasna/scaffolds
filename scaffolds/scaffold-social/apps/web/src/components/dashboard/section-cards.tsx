"use client";

import { TrendingDown, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface StatCard {
  title: string;
  value: string;
  description: string;
  trend: {
    value: string;
    direction: "up" | "down";
  };
}

interface SectionCardsProps {
  cards?: StatCard[];
}

const defaultCards: StatCard[] = [
  {
    title: "Total Revenue",
    value: "$45,231.89",
    description: "Total revenue this month",
    trend: {
      value: "+12.5%",
      direction: "up",
    },
  },
  {
    title: "New Customers",
    value: "+2,350",
    description: "New customers this month",
    trend: {
      value: "+180.1%",
      direction: "up",
    },
  },
  {
    title: "Active Accounts",
    value: "+12,234",
    description: "Active accounts this period",
    trend: {
      value: "+19%",
      direction: "up",
    },
  },
  {
    title: "Growth Rate",
    value: "+573",
    description: "Growth since last month",
    trend: {
      value: "-2%",
      direction: "down",
    },
  },
];

export function SectionCards({ cards = defaultCards }: SectionCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <Badge
              variant={card.trend.direction === "up" ? "default" : "destructive"}
              className="flex items-center gap-1"
            >
              {card.trend.direction === "up" ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {card.trend.value}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
            <CardDescription className="text-xs">{card.description}</CardDescription>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
