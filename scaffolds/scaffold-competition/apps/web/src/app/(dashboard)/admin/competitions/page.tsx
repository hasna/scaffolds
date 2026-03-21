import Link from "next/link";
import { db } from "@scaffold-competition/database/client";
import * as schema from "@scaffold-competition/database/schema";
import { desc } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Trophy, Users, FileText, Edit } from "lucide-react";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Admin — Competitions",
};

export default async function AdminCompetitionsPage() {
  const competitions = await db.query.competitions.findMany({
    orderBy: [desc(schema.competitions.createdAt)],
    with: {
      teams: { columns: { id: true } },
      submissions: { columns: { id: true, status: true } },
    },
  });

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Competitions</h1>
          <p className="text-muted-foreground text-sm">{competitions.length} total</p>
        </div>
        <Button asChild>
          <Link href="/admin/competitions/new">
            <Plus className="mr-2 h-4 w-4" />
            New Competition
          </Link>
        </Button>
      </div>

      {competitions.length === 0 ? (
        <Card>
          <CardContent className="py-20 text-center">
            <Trophy className="text-muted-foreground mx-auto mb-4 h-12 w-12 opacity-30" />
            <p className="font-medium">No competitions yet.</p>
            <Button asChild className="mt-4">
              <Link href="/admin/competitions/new">Create your first competition</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {competitions.map((comp) => {
            const submitted = comp.submissions.filter((s) => s.status === "submitted").length;
            const approved = comp.submissions.filter((s) => s.status === "approved").length;

            return (
              <Card key={comp.id}>
                <CardHeader>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <Trophy className="text-yellow-500 h-5 w-5 shrink-0" />
                      <div>
                        <CardTitle className="text-base">{comp.title}</CardTitle>
                        <p className="text-muted-foreground text-xs mt-0.5">
                          /{comp.slug} · Created {format(new Date(comp.createdAt), "MMM d, yyyy")}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={
                        comp.status === "open"
                          ? "default"
                          : comp.status === "closed"
                            ? "secondary"
                            : "outline"
                      }
                      className="capitalize shrink-0"
                    >
                      {comp.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground mb-4">
                    <span className="flex items-center gap-1.5">
                      <Users className="h-4 w-4" />
                      {comp.teams.length} teams
                    </span>
                    <span className="flex items-center gap-1.5">
                      <FileText className="h-4 w-4" />
                      {submitted} pending · {approved} approved
                    </span>
                    <span>
                      Deadline: {format(new Date(comp.submissionDeadline), "MMM d, yyyy")}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/admin/competitions/${comp.slug}/judge`}>
                        <Edit className="mr-1.5 h-3.5 w-3.5" />
                        Judge Panel
                      </Link>
                    </Button>
                    <Button asChild size="sm" variant="ghost">
                      <Link href={`/competitions/${comp.slug}`} target="_blank">
                        View Public Page
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
