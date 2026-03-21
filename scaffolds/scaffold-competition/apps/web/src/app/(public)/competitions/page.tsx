import Link from "next/link";
import { db } from "@scaffold-competition/database/client";
import * as schema from "@scaffold-competition/database/schema";
import { eq, and, gt, desc } from "drizzle-orm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, Users, Calendar, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Competitions",
  description: "Browse open competitions, form teams, and submit your best work.",
};

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    open: "default",
    draft: "secondary",
    judging: "outline",
    closed: "destructive",
  };
  return <Badge variant={variants[status] ?? "secondary"}>{status}</Badge>;
}

export default async function CompetitionsPage() {
  const openCompetitions = await db.query.competitions.findMany({
    where: eq(schema.competitions.status, "open"),
    orderBy: [desc(schema.competitions.startDate)],
    with: {
      teams: true,
    },
  });

  return (
    <div className="container mx-auto px-4 py-12">
      {/* Hero */}
      <div className="mb-12 text-center">
        <Trophy className="mx-auto mb-4 h-12 w-12 text-yellow-500" />
        <h1 className="text-4xl font-bold tracking-tight">Open Competitions</h1>
        <p className="text-muted-foreground mt-4 text-lg">
          Form a team, build something amazing, win prizes.
        </p>
      </div>

      {openCompetitions.length === 0 ? (
        <div className="text-muted-foreground py-24 text-center">
          <Trophy className="mx-auto mb-4 h-16 w-16 opacity-30" />
          <p className="text-xl font-medium">No open competitions right now.</p>
          <p className="mt-2 text-sm">Check back soon for upcoming events.</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {openCompetitions.map((comp) => {
            const deadline = new Date(comp.submissionDeadline);
            const isDeadlineSoon = deadline.getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000;

            return (
              <Card key={comp.id} className="group flex flex-col hover:shadow-md transition-shadow">
                {comp.bannerImage && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={comp.bannerImage}
                    alt={comp.title}
                    className="h-40 w-full rounded-t-lg object-cover"
                  />
                )}
                <CardHeader className="flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg leading-tight">{comp.title}</CardTitle>
                    <StatusBadge status={comp.status} />
                  </div>
                  <CardDescription className="line-clamp-3">{comp.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Stats */}
                  <div className="text-muted-foreground flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {comp.teams.length} {comp.teams.length === 1 ? "team" : "teams"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      Max {comp.maxTeamSize}/team
                    </span>
                  </div>

                  {/* Deadline */}
                  <div
                    className={`flex items-center gap-1.5 text-sm ${isDeadlineSoon ? "text-orange-500" : "text-muted-foreground"}`}
                  >
                    <Clock className="h-4 w-4" />
                    <span>
                      Deadline:{" "}
                      {formatDistanceToNow(deadline, { addSuffix: true })}
                    </span>
                  </div>

                  {/* Prizes preview */}
                  <div className="bg-muted/50 rounded-md p-3 text-sm">
                    <p className="font-medium text-xs mb-1 uppercase tracking-wider text-muted-foreground">Prizes</p>
                    <p className="line-clamp-2">{comp.prizes}</p>
                  </div>

                  <Button asChild className="w-full">
                    <Link href={`/competitions/${comp.slug}`}>View Competition</Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
