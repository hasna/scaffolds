import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth-utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Key } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ApiKeysPage() {
  const session = await requireAuth();

  if (!session.user.tenantId) {
    redirect("/onboarding");
  }

  return (
    <div className="container py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">API Keys</h1>
        <p className="text-muted-foreground">Manage your API keys for programmatic access</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            API Access
          </CardTitle>
          <CardDescription>
            Create and manage API keys to access the platform programmatically
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            API key management is coming soon. Check back later for updates.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
