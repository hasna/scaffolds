import { requireAuth } from "@/lib/auth-utils";
import { getTeamMembers, getTenant } from "@/lib/tenant";
import { TeamMembersTable } from "./team-members-table";
import { InviteMemberDialog } from "./invite-member-dialog";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Team",
};

export default async function TeamPage() {
  const session = await requireAuth();
  const tenantId = session.user.tenantId;

  if (!tenantId) {
    redirect("/onboarding");
  }

  const [tenant, teamMembers] = await Promise.all([getTenant(tenantId), getTeamMembers(tenantId)]);

  const canInvite = session.user.tenantRole === "owner" || session.user.tenantRole === "manager";

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Team</h1>
          <p className="text-muted-foreground">Manage members of {tenant?.name ?? "your team"}</p>
        </div>
        {canInvite && <InviteMemberDialog tenantId={tenantId} />}
      </div>

      <TeamMembersTable
        members={teamMembers}
        currentUserId={session.user.id}
        currentUserRole={session.user.tenantRole}
      />
    </div>
  );
}
