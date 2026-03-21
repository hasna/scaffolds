import { db } from "@scaffold-landing-pages/database/client";
import * as schema from "@scaffold-landing-pages/database/schema";
import { eq, and, gt, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { AcceptInviteForm } from "./accept-invite-form";

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function InvitePage({ params }: PageProps) {
  const { token } = await params;

  const invitation = await db.query.teamInvitations.findFirst({
    where: and(
      eq(schema.teamInvitations.token, token),
      isNull(schema.teamInvitations.acceptedAt), // Not yet accepted
      gt(schema.teamInvitations.expiresAt, new Date())
    ),
    with: {
      tenant: {
        columns: { id: true, name: true },
      },
    },
  });

  if (!invitation) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Invalid Invitation</h1>
          <p className="mt-2 text-muted-foreground">
            This invitation link is invalid or has expired.
          </p>
        </div>
      </div>
    );
  }

  const session = await auth();

  // If user is logged in with a different email, show message
  if (session?.user?.email && session.user.email !== invitation.email) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Wrong Account</h1>
          <p className="mt-2 text-muted-foreground">
            This invitation was sent to {invitation.email}.
          </p>
          <p className="text-muted-foreground">
            Please sign in with that email address.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-6 p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Join {invitation.tenant?.name}</h1>
          <p className="mt-2 text-muted-foreground">
            You&apos;ve been invited to join {invitation.tenant?.name} as a{" "}
            {invitation.role}.
          </p>
        </div>

        <AcceptInviteForm
          token={token}
          email={invitation.email}
          tenantName={invitation.tenant?.name || "the team"}
          isLoggedIn={!!session?.user}
        />
      </div>
    </div>
  );
}
