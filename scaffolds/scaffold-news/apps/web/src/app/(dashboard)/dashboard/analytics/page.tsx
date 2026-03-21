import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth-utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const session = await requireAuth();

  if (!session.user.tenantId) {
    redirect("/onboarding");
  }

  return (
    <div className="container py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">View insights and metrics for your team</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Usage Analytics
          </CardTitle>
          <CardDescription>Track your team&apos;s usage and performance metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Analytics dashboard is coming soon. Check back later for detailed insights.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
