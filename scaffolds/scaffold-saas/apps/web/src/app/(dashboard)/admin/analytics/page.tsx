"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  TrendingUp,
  TrendingDown,
  Users,
  Building2,
  CreditCard,
  Activity,
} from "lucide-react";

interface AnalyticsData {
  users: {
    total: number;
    newThisWeek: number;
    newThisMonth: number;
    trend: number;
  };
  tenants: {
    total: number;
    newThisWeek: number;
    newThisMonth: number;
    trend: number;
  };
  subscriptions: {
    active: number;
    trialing: number;
    canceled: number;
    mrr: number;
  };
  activity: {
    activeUsers: number;
    apiCalls: number;
    aiMessages: number;
  };
}

export default function AdminAnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  async function fetchAnalytics() {
    try {
      const response = await fetch("/api/admin/analytics");
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
    } finally {
      setLoading(false);
    }
  }

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount / 100);
  }

  function TrendBadge({ value }: { value: number }) {
    if (value > 0) {
      return (
        <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20">
          <TrendingUp className="mr-1 h-3 w-3" />+{value}%
        </Badge>
      );
    } else if (value < 0) {
      return (
        <Badge variant="destructive">
          <TrendingDown className="mr-1 h-3 w-3" />
          {value}%
        </Badge>
      );
    }
    return <Badge variant="outline">0%</Badge>;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Failed to load analytics data.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">Platform metrics and growth insights.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.users.total}</div>
            <div className="mt-1 flex items-center gap-2">
              <TrendBadge value={analytics.users.trend} />
              <span className="text-muted-foreground text-xs">vs last month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Tenants</CardTitle>
            <Building2 className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.tenants.total}</div>
            <div className="mt-1 flex items-center gap-2">
              <TrendBadge value={analytics.tenants.trend} />
              <span className="text-muted-foreground text-xs">vs last month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
            <CreditCard className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.subscriptions.active}</div>
            <p className="text-muted-foreground mt-1 text-xs">
              {analytics.subscriptions.trialing} trialing
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Monthly Recurring</CardTitle>
            <Activity className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(analytics.subscriptions.mrr)}</div>
            <p className="text-muted-foreground mt-1 text-xs">MRR</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>User Growth</CardTitle>
            <CardDescription>New user registrations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">This week</span>
                <span className="font-medium">{analytics.users.newThisWeek}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">This month</span>
                <span className="font-medium">{analytics.users.newThisMonth}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">All time</span>
                <span className="font-medium">{analytics.users.total}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tenant Growth</CardTitle>
            <CardDescription>New organization registrations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">This week</span>
                <span className="font-medium">{analytics.tenants.newThisWeek}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">This month</span>
                <span className="font-medium">{analytics.tenants.newThisMonth}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">All time</span>
                <span className="font-medium">{analytics.tenants.total}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Subscription Status</CardTitle>
            <CardDescription>Current subscription breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">Active</span>
                <Badge className="bg-green-500/10 text-green-500">
                  {analytics.subscriptions.active}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">Trialing</span>
                <Badge variant="secondary">{analytics.subscriptions.trialing}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">Canceled</span>
                <Badge variant="destructive">{analytics.subscriptions.canceled}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 lg:col-span-3">
          <CardHeader>
            <CardTitle>Platform Activity</CardTitle>
            <CardDescription>Recent platform usage metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold">{analytics.activity.activeUsers}</div>
                <p className="text-muted-foreground mt-1 text-sm">Active users (7d)</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold">
                  {analytics.activity.apiCalls.toLocaleString()}
                </div>
                <p className="text-muted-foreground mt-1 text-sm">API calls (7d)</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold">
                  {analytics.activity.aiMessages.toLocaleString()}
                </div>
                <p className="text-muted-foreground mt-1 text-sm">AI messages (7d)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
