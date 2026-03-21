import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@scaffold-competition/database/client";
import * as schema from "@scaffold-competition/database/schema";
import { eq } from "drizzle-orm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Trophy, Users, Calendar, Clock, ExternalLink } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const comp = await db.query.competitions.findFirst({
    where: eq(schema.competitions.slug, slug),
  });
  if (!comp) return { title: "Not Found" };
  return {
    title: comp.title,
    description: comp.description,
  };
}

export default async function CompetitionDetailPage({ params }: Props) {
  const { slug } = await params;

  const comp = await db.query.competitions.findFirst({
    where: eq(schema.competitions.slug, slug),
    with: {
      organizer: { columns: { name: true, email: true } },
      teams: {
        with: {
          members: true,
        },
      },
    },
  });

  if (!comp) notFound();

  const deadline = new Date(comp.submissionDeadline);
  const startDate = new Date(comp.startDate);
  const endDate = new Date(comp.endDate);
  const isOpen = comp.status === "open" && deadline > new Date();
  const entryCount = comp.teams.length;

  return (
    <div className="container mx-auto max-w-4xl px-4 py-12">
      {/* Banner */}
      {comp.bannerImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={comp.bannerImage}
          alt={comp.title}
          className="mb-8 h-64 w-full rounded-xl object-cover"
        />
      )}

      {/* Header */}
      <div className="mb-8">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <Badge variant={comp.status === "open" ? "default" : "secondary"} className="capitalize">
            {comp.status}
          </Badge>
          <span className="text-muted-foreground text-sm">
            Organized by {comp.organizer.name ?? comp.organizer.email}
          </span>
        </div>
        <h1 className="text-4xl font-bold">{comp.title}</h1>
        <p className="text-muted-foreground mt-4 text-lg">{comp.description}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle>About this Competition</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none">
              <p className="text-foreground whitespace-pre-wrap">{comp.description}</p>
            </CardContent>
          </Card>

          {/* Rules */}
          <Card>
            <CardHeader>
              <CardTitle>Rules</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm">{comp.rules}</p>
            </CardContent>
          </Card>

          {/* Prizes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Prizes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm">{comp.prizes}</p>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* CTA */}
          {isOpen && (
            <Card className="border-primary border-2">
              <CardHeader>
                <CardTitle className="text-lg">Join this competition</CardTitle>
                <CardDescription>
                  Create or join a team to participate.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full">
                  <Link href={`/dashboard/competitions/${slug}/team`}>
                    Register / Join Team
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <Calendar className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-medium">Timeline</p>
                  <p className="text-muted-foreground">
                    {format(startDate, "MMM d")} — {format(endDate, "MMM d, yyyy")}
                  </p>
                </div>
              </div>
              <Separator />
              <div className="flex items-start gap-2">
                <Clock className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-medium">Submission Deadline</p>
                  <p className="text-muted-foreground">
                    {format(deadline, "MMM d, yyyy HH:mm")}
                  </p>
                  <p className="text-orange-500 text-xs mt-0.5">
                    {formatDistanceToNow(deadline, { addSuffix: true })}
                  </p>
                </div>
              </div>
              <Separator />
              <div className="flex items-start gap-2">
                <Users className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-medium">Teams</p>
                  <p className="text-muted-foreground">
                    {entryCount} registered · max {comp.maxTeamSize} per team
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submissions link */}
          <Button asChild variant="outline" className="w-full">
            <Link href={`/competitions/${slug}/submissions`}>
              <ExternalLink className="mr-2 h-4 w-4" />
              View Submissions
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
