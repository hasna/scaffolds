"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Loader2, Activity, MessageSquare, Zap, Database } from "lucide-react";

interface UsageData {
  period: {
    start: string;
    end: string;
  };
  usage: {
    apiCalls: { used: number; limit: number | null };
    aiMessages: { used: number; limit: number | null };
    aiTokens: { used: number; limit: number | null };
    storage: { used: number; limit: number | null };
    teamMembers: { used: number; limit: number | null };
  };
}

export function UsageDisplay() {
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsage();
  }, []);

  async function fetchUsage() {
    try {
      const response = await fetch("/api/v1/billing/usage");
      if (response.ok) {
        const data = await response.json();
        setUsage(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch usage:", error);
    } finally {
      setLoading(false);
    }
  }

  function formatNumber(num: number): string {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  }

  function formatBytes(bytes: number): string {
    if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(1)} GB`;
    if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${bytes} B`;
  }

  function getUsagePercent(used: number, limit: number | null): number {
    if (!limit) return 0;
    return Math.min(100, (used / limit) * 100);
  }

  function getUsageStatus(used: number, limit: number | null): "default" | "warning" | "destructive" {
    if (!limit) return "default";
    const percent = (used / limit) * 100;
    if (percent >= 90) return "destructive";
    if (percent >= 75) return "warning";
    return "default";
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!usage) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Usage data not available
        </CardContent>
      </Card>
    );
  }

  const usageItems = [
    {
      label: "API Calls",
      icon: Activity,
      used: usage.usage.apiCalls.used,
      limit: usage.usage.apiCalls.limit,
      format: formatNumber,
    },
    {
      label: "AI Messages",
      icon: MessageSquare,
      used: usage.usage.aiMessages.used,
      limit: usage.usage.aiMessages.limit,
      format: formatNumber,
    },
    {
      label: "AI Tokens",
      icon: Zap,
      used: usage.usage.aiTokens.used,
      limit: usage.usage.aiTokens.limit,
      format: formatNumber,
    },
    {
      label: "Storage",
      icon: Database,
      used: usage.usage.storage.used,
      limit: usage.usage.storage.limit,
      format: formatBytes,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Current Usage</CardTitle>
        <CardDescription>
          Billing period: {new Date(usage.period.start).toLocaleDateString()} -{" "}
          {new Date(usage.period.end).toLocaleDateString()}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {usageItems.map((item) => {
          const percent = getUsagePercent(item.used, item.limit);
          const status = getUsageStatus(item.used, item.limit);

          return (
            <div key={item.label} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <item.icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm">
                    {item.format(item.used)}
                    {item.limit && ` / ${item.format(item.limit)}`}
                  </span>
                  {item.limit && (
                    <Badge
                      variant={
                        status === "destructive"
                          ? "destructive"
                          : status === "warning"
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {percent.toFixed(0)}%
                    </Badge>
                  )}
                  {!item.limit && <Badge variant="outline">Unlimited</Badge>}
                </div>
              </div>
              {item.limit && (
                <Progress
                  value={percent}
                  className={
                    status === "destructive"
                      ? "[&>div]:bg-destructive"
                      : status === "warning"
                      ? "[&>div]:bg-yellow-500"
                      : ""
                  }
                />
              )}
            </div>
          );
        })}

        {/* Team Members */}
        <div className="pt-4 border-t">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Team Members</span>
            <span className="text-sm">
              {usage.usage.teamMembers.used}
              {usage.usage.teamMembers.limit && ` / ${usage.usage.teamMembers.limit}`}
              {!usage.usage.teamMembers.limit && " (Unlimited)"}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
