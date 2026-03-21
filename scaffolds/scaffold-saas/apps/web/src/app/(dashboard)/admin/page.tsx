import Link from "next/link";
import type { Route } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Building2, Activity, BarChart3 } from "lucide-react";
import { db } from "@scaffold-saas/database/client";
import { sql } from "drizzle-orm";
import * as schema from "@scaffold-saas/database/schema";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  // Get stats
  const [usersCount] = await db.select({ count: sql<number>`count(*)` }).from(schema.users);

  const [tenantsCount] = await db.select({ count: sql<number>`count(*)` }).from(schema.tenants);

  const [subscriptionsCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.subscriptions);

  const stats = [
    {
      title: "Total Users",
      value: Number(usersCount?.count || 0),
      icon: Users,
      href: "/admin/users" as Route,
    },
    {
      title: "Total Tenants",
      value: Number(tenantsCount?.count || 0),
      icon: Building2,
      href: "/admin/tenants" as Route,
    },
    {
      title: "Active Subscriptions",
      value: Number(subscriptionsCount?.count || 0),
      icon: BarChart3,
      href: "/admin/analytics" as Route,
    },
    {
      title: "System Health",
      value: "Healthy",
      icon: Activity,
      href: "/admin/health" as Route,
    },
  ];

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">Manage users, tenants, and system settings.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.title} href={stat.href}>
            <Card className="hover:bg-muted/50 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <stat.icon className="text-muted-foreground h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common administrative tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/admin/users" className="hover:bg-muted/50 block rounded-md border p-3">
              <div className="font-medium">Manage Users</div>
              <div className="text-muted-foreground text-sm">
                View, edit, and manage user accounts
              </div>
            </Link>
            <Link href="/admin/tenants" className="hover:bg-muted/50 block rounded-md border p-3">
              <div className="font-medium">Manage Tenants</div>
              <div className="text-muted-foreground text-sm">
                View and manage tenant organizations
              </div>
            </Link>
            <Link href="/admin/health" className="hover:bg-muted/50 block rounded-md border p-3">
              <div className="font-medium">System Health</div>
              <div className="text-muted-foreground text-sm">Check database and service status</div>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest system events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-muted-foreground text-sm">Activity feed coming soon...</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
