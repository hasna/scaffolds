import { requireAuth } from "@/lib/auth-utils";
import { getTenant } from "@/lib/tenant";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { redirect } from "next/navigation";
import { ProfileSettings } from "./profile-settings";
import { TeamSettings } from "./team-settings";
import { NotificationSettings } from "./notification-settings";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Settings",
};

export default async function SettingsPage() {
  const session = await requireAuth();
  const tenantId = session.user.tenantId;

  if (!tenantId) {
    redirect("/onboarding");
  }

  const tenant = await getTenant(tenantId);

  if (!tenant) {
    redirect("/onboarding");
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account and team settings</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <ProfileSettings user={session.user} />
        </TabsContent>

        <TabsContent value="team">
          <TeamSettings tenant={tenant} userRole={session.user.tenantRole} />
        </TabsContent>

        <TabsContent value="notifications">
          <NotificationSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
