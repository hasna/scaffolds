import { requireAuth } from "@/lib/auth-utils";
import Link from "next/link";
import { db } from "@scaffold-competition/database/client";
import * as schema from "@scaffold-competition/database/schema";
import { eq } from "drizzle-orm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, Users, FileText, Clock, ArrowRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const session = await requireAuth();
  const userId = session.user.id;

  // Get all teams the user is a member of
  const memberships = await db.query.teamMembers.findMany({
    where: eq(schema.teamMembers.userId, userId),
    with: {
      team: {
        with: {
          competition: {
            columns: {
              id: true,
              title: true,
              slug: true,
              status: true,
              submissionDeadline: true,
            },
          },
          members: true,
          submissions: {
            columns: { id: true, title: true, status: true },
          },
        },
      },
    },
  });

  const userName = session.user.name?.split(" ")[0] ?? "there";

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Welcome back, {userName}!</h1>
        <p className="text-muted-foreground">Here&apos;s an overview of your competitions.</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Competitions Joined</CardTitle>
            <Trophy className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{memberships.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Teams</CardTitle>
            <Users className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {memberships.filter((m) => m.team.competition.status === "open").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Submissions</CardTitle>
            <FileText className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {memberships.reduce((a, m) => a + m.team.submissions.length, 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Competitions */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">My Competitions</h2>
          <Button asChild variant="outline" size="sm">
            <Link href="/competitions">
              Browse more <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </Button>
        </div>

        {memberships.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Trophy className="text-muted-foreground mx-auto mb-4 h-12 w-12 opacity-30" />
              <p className="font-medium">You haven&apos;t joined any competitions yet.</p>
              <Button asChild className="mt-4">
                <Link href="/competitions">Find a Competition</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {memberships.map((m) => {
              const comp = m.team.competition;
              const deadline = new Date(comp.submissionDeadline);
              const submission = m.team.submissions[0];

              return (
                <Card key={m.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base">{comp.title}</CardTitle>
                      <Badge
                        variant={comp.status === "open" ? "default" : "secondary"}
                        className="capitalize shrink-0"
                      >
                        {comp.status}
                      </Badge>
                    </div>
                    <CardDescription>
                      Team: <span className="font-medium">{m.team.name}</span> ·{" "}
                      {m.team.members.length} member{m.team.members.length !== 1 ? "s" : ""}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Submission status */}
                    {submission ? (
                      <div className="bg-muted/50 flex items-center gap-2 rounded-md p-2 text-sm">
                        <FileText className="h-4 w-4" />
                        <span>
                          Submission: <span className="font-medium capitalize">{submission.status}</span>
                        </span>
                      </div>
                    ) : comp.status === "open" ? (
                      <div className="bg-orange-50 text-orange-700 dark:bg-orange-950/20 flex items-center gap-2 rounded-md p-2 text-sm">
                        <Clock className="h-4 w-4" />
                        <span>
                          No submission yet — due{" "}
                          {formatDistanceToNow(deadline, { addSuffix: true })}
                        </span>
                      </div>
                    ) : null}

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button asChild size="sm" variant="outline" className="flex-1">
                        <Link href={`/dashboard/competitions/${comp.slug}/team`}>Team</Link>
                      </Button>
                      {comp.status === "open" && (
                        <Button asChild size="sm" className="flex-1">
                          <Link href={`/dashboard/competitions/${comp.slug}/submit`}>
                            {submission ? "Edit Submission" : "Submit"}
                          </Link>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
