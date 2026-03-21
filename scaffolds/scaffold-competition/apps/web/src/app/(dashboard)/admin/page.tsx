import Link from "next/link";
import type { Route } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Trophy, Star, Activity } from "lucide-react";
import { db } from "@scaffold-competition/database/client";
import { sql, eq } from "drizzle-orm";
import * as schema from "@scaffold-competition/database/schema";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const [usersCount] = await db.select({ count: sql<number>`count(*)` }).from(schema.users);
  const [competitionsCount] = await db.select({ count: sql<number>`count(*)` }).from(schema.competitions);
  const [openCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.competitions)
    .where(eq(schema.competitions.status, "open"));
  const [submissionsCount] = await db.select({ count: sql<number>`count(*)` }).from(schema.submissions);

  const stats = [
    {
      title: "Total Users",
      value: Number(usersCount?.count || 0),
      icon: Users,
      href: "/admin/users" as Route,
    },
    {
      title: "Competitions",
      value: Number(competitionsCount?.count || 0),
      icon: Trophy,
      href: "/admin/competitions" as Route,
    },
    {
      title: "Open Competitions",
      value: Number(openCount?.count || 0),
      icon: Activity,
      href: "/admin/competitions" as Route,
    },
    {
      title: "Submissions",
      value: Number(submissionsCount?.count || 0),
      icon: Star,
      href: "/admin/competitions" as Route,
    },
  ];

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">Manage competitions, users, and system settings.</p>
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
            <Link href="/admin/competitions/new" className="hover:bg-muted/50 block rounded-md border p-3">
              <div className="font-medium">Create Competition</div>
              <div className="text-muted-foreground text-sm">
                Set up a new hackathon or competition
              </div>
            </Link>
            <Link href="/admin/competitions" className="hover:bg-muted/50 block rounded-md border p-3">
              <div className="font-medium">Manage Competitions</div>
              <div className="text-muted-foreground text-sm">
                View all competitions and judging panels
              </div>
            </Link>
            <Link href="/admin/users" className="hover:bg-muted/50 block rounded-md border p-3">
              <div className="font-medium">Manage Users</div>
              <div className="text-muted-foreground text-sm">View, edit, and manage user accounts</div>
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
