"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  RefreshCw,
  Database,
  Server,
  HardDrive,
  Loader2,
  CheckCircle2,
  XCircle,
} from "lucide-react";

interface ServiceCheck {
  status: "up" | "down";
  latencyMs?: number;
  error?: string;
}

interface HealthStatus {
  status: "healthy" | "unhealthy" | "degraded";
  timestamp: string;
  version: string;
  services: {
    database: ServiceCheck;
    redis?: ServiceCheck;
  };
}

export default function AdminHealthPage() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchHealth();
  }, []);

  async function fetchHealth() {
    try {
      const response = await fetch("/api/health");
      if (response.ok) {
        const data = await response.json();
        setHealth(data);
      }
    } catch (error) {
      console.error("Failed to fetch health:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function handleRefresh() {
    setRefreshing(true);
    fetchHealth();
  }

  function getServiceStatusIcon(status: "up" | "down") {
    return status === "up" ? (
      <CheckCircle2 className="h-5 w-5 text-green-500" />
    ) : (
      <XCircle className="h-5 w-5 text-red-500" />
    );
  }

  function getOverallStatusBadge(status: string) {
    switch (status) {
      case "healthy":
        return (
          <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20">Healthy</Badge>
        );
      case "degraded":
        return (
          <Badge className="bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20">
            Degraded
          </Badge>
        );
      case "unhealthy":
        return <Badge variant="destructive">Unhealthy</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  }

  function getServiceStatusBadge(status: "up" | "down") {
    return status === "up" ? (
      <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20">Up</Badge>
    ) : (
      <Badge variant="destructive">Down</Badge>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">System Health</h1>
          <p className="text-muted-foreground">Monitor the health of system components.</p>
        </div>
        <Button onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {health && (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Server className="text-muted-foreground h-5 w-5" />
                  <div>
                    <CardTitle>Overall Status</CardTitle>
                    <CardDescription>
                      Last checked: {new Date(health.timestamp).toLocaleString()}
                    </CardDescription>
                  </div>
                </div>
                {getOverallStatusBadge(health.status)}
              </div>
            </CardHeader>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Database className="text-muted-foreground h-5 w-5" />
                    <div>
                      <CardTitle className="text-base">Database</CardTitle>
                      <CardDescription>PostgreSQL connection</CardDescription>
                    </div>
                  </div>
                  {getServiceStatusIcon(health.services.database.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Status</span>
                    {getServiceStatusBadge(health.services.database.status)}
                  </div>
                  {health.services.database.latencyMs !== undefined && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Latency</span>
                      <span>{health.services.database.latencyMs}ms</span>
                    </div>
                  )}
                  {health.services.database.error && (
                    <div className="text-destructive text-sm">{health.services.database.error}</div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <HardDrive className="text-muted-foreground h-5 w-5" />
                    <div>
                      <CardTitle className="text-base">Redis</CardTitle>
                      <CardDescription>Cache & queue connection</CardDescription>
                    </div>
                  </div>
                  {health.services.redis ? (
                    getServiceStatusIcon(health.services.redis.status)
                  ) : (
                    <Badge variant="outline">Not configured</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {health.services.redis ? (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Status</span>
                      {getServiceStatusBadge(health.services.redis.status)}
                    </div>
                    {health.services.redis.latencyMs !== undefined && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Latency</span>
                        <span>{health.services.redis.latencyMs}ms</span>
                      </div>
                    )}
                    {health.services.redis.error && (
                      <div className="text-destructive text-sm">{health.services.redis.error}</div>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    Redis is not configured. Set REDIS_URL to enable.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
