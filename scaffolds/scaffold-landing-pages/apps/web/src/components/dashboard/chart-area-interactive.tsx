"use client";

import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Sample data for different time ranges
const data7Days = [
  { date: "Mon", value: 186 },
  { date: "Tue", value: 305 },
  { date: "Wed", value: 237 },
  { date: "Thu", value: 273 },
  { date: "Fri", value: 209 },
  { date: "Sat", value: 214 },
  { date: "Sun", value: 290 },
];

const data30Days = [
  { date: "Week 1", value: 1200 },
  { date: "Week 2", value: 1800 },
  { date: "Week 3", value: 1400 },
  { date: "Week 4", value: 2100 },
];

const data3Months = [
  { date: "Jan", value: 4500 },
  { date: "Feb", value: 5200 },
  { date: "Mar", value: 6800 },
];

type TimeRange = "7d" | "30d" | "3m";

const dataMap: Record<TimeRange, typeof data7Days> = {
  "7d": data7Days,
  "30d": data30Days,
  "3m": data3Months,
};

interface ChartAreaInteractiveProps {
  title?: string;
  description?: string;
}

export function ChartAreaInteractive({
  title = "Revenue Overview",
  description = "Showing total revenue for the selected period",
}: ChartAreaInteractiveProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>("7d");

  const chartData = dataMap[timeRange];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="space-y-1">
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <Select value={timeRange} onValueChange={(value) => setTimeRange(value as TimeRange)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Select range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="3m">Last 3 months</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{
                top: 10,
                right: 10,
                left: 0,
                bottom: 0,
              }}
            >
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                className="fill-muted-foreground text-xs"
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                className="fill-muted-foreground text-xs"
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                }}
                labelStyle={{
                  color: "hsl(var(--popover-foreground))",
                  fontWeight: 600,
                }}
                itemStyle={{
                  color: "hsl(var(--popover-foreground))",
                }}
                formatter={(value: number) => [`$${value}`, "Revenue"]}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#colorValue)"
                animationDuration={500}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
