import { requireAuth } from "@/lib/auth-utils";
import { getTenant, getTeamMembers } from "@/lib/tenant";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SectionCards } from "@/components/dashboard/section-cards";
import { ChartAreaInteractive } from "@/components/dashboard/chart-area-interactive";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const session = await requireAuth();
  const tenantId = session.user.tenantId;

  let tenant = null;
  let teamMembers: Awaited<ReturnType<typeof getTeamMembers>> = [];

  if (tenantId) {
    [tenant, teamMembers] = await Promise.all([getTenant(tenantId), getTeamMembers(tenantId)]);
  }

  // Dynamic stats based on actual data
  const statsCards = [
    {
      title: "Team Members",
      value: teamMembers.length.toString(),
      description: "Active members in your team",
      trend: {
        value: "+0%",
        direction: "up" as const,
      },
    },
    {
      title: "Current Plan",
      value: tenant?.plan?.name ?? "Free",
      description: tenant?.subscription?.status ?? "No subscription",
      trend: {
        value: "Active",
        direction: "up" as const,
      },
    },
    {
      title: "API Requests",
      value: "0",
      description: "Requests this month",
      trend: {
        value: "+0%",
        direction: "up" as const,
      },
    },
    {
      title: "Growth Rate",
      value: "+0%",
      description: "Growth since last month",
      trend: {
        value: "0%",
        direction: "up" as const,
      },
    },
  ];

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      {/* Welcome Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome back, {session.user.name?.split(" ")[0] ?? "there"}!
        </h1>
        <p className="text-muted-foreground">
          {tenant ? `Managing ${tenant.name}` : "Get started by setting up your team"}
        </p>
      </div>

      {/* Stats Cards */}
      <SectionCards cards={statsCards} />

      {/* Charts and Activity Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        <ChartAreaInteractive
          title="Activity Overview"
          description="Your team's activity for the selected period"
        />

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your team&apos;s latest actions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-muted-foreground text-sm">No recent activity to show.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks and shortcuts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-muted-foreground text-sm">
            Start by inviting team members or configuring your settings.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
