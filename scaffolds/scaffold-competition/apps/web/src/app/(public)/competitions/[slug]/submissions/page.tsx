import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@scaffold-competition/database/client";
import * as schema from "@scaffold-competition/database/schema";
import { eq, and } from "drizzle-orm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Github, Globe, ArrowLeft, Trophy } from "lucide-react";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const comp = await db.query.competitions.findFirst({
    where: eq(schema.competitions.slug, slug),
    columns: { title: true },
  });
  return { title: comp ? `${comp.title} — Submissions` : "Submissions" };
}

export default async function SubmissionsGalleryPage({ params }: Props) {
  const { slug } = await params;

  const comp = await db.query.competitions.findFirst({
    where: eq(schema.competitions.slug, slug),
    columns: { id: true, title: true, slug: true, status: true },
  });

  if (!comp) notFound();

  const approvedSubmissions = await db.query.submissions.findMany({
    where: and(
      eq(schema.submissions.competitionId, comp.id),
      eq(schema.submissions.status, "approved")
    ),
    with: {
      team: {
        columns: { name: true },
        with: {
          members: {
            with: {
              user: { columns: { name: true, avatarUrl: true } },
            },
          },
        },
      },
      scores: true,
    },
  });

  return (
    <div className="container mx-auto max-w-5xl px-4 py-12">
      {/* Back */}
      <Button asChild variant="ghost" className="mb-6 -ml-2">
        <Link href={`/competitions/${slug}`}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to competition
        </Link>
      </Button>

      <div className="mb-10">
        <div className="flex items-center gap-3">
          <Trophy className="h-8 w-8 text-yellow-500" />
          <div>
            <h1 className="text-3xl font-bold">{comp.title}</h1>
            <p className="text-muted-foreground">Public submissions gallery</p>
          </div>
        </div>
      </div>

      {approvedSubmissions.length === 0 ? (
        <div className="text-muted-foreground py-24 text-center">
          <Trophy className="mx-auto mb-4 h-16 w-16 opacity-20" />
          <p className="text-xl font-medium">No approved submissions yet.</p>
          <p className="mt-2 text-sm">
            {comp.status === "open"
              ? "Submissions will appear here once approved by organizers."
              : "Check back after judging is complete."}
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          {approvedSubmissions.map((sub) => {
            const avgScore =
              sub.scores.length > 0
                ? (sub.scores.reduce((a, s) => a + s.score, 0) / sub.scores.length).toFixed(1)
                : null;

            return (
              <Card key={sub.id} className="group flex flex-col hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-lg">{sub.title}</CardTitle>
                      <CardDescription className="mt-1">
                        by <span className="font-medium text-foreground">{sub.team.name}</span>
                      </CardDescription>
                    </div>
                    {avgScore && (
                      <Badge variant="outline" className="shrink-0">
                        ⭐ {avgScore}/10
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-4">
                  <p className="text-muted-foreground line-clamp-3 text-sm">{sub.description}</p>

                  {/* Team members */}
                  <div className="flex flex-wrap gap-1">
                    {sub.team.members.map((m) => (
                      <span
                        key={m.userId}
                        className="bg-muted rounded-full px-2 py-0.5 text-xs"
                      >
                        {m.user.name ?? "Member"}
                      </span>
                    ))}
                  </div>

                  {/* Links */}
                  <div className="mt-auto flex flex-wrap gap-2">
                    {sub.projectUrl && (
                      <Button asChild size="sm" variant="outline">
                        <a href={sub.projectUrl} target="_blank" rel="noopener noreferrer">
                          <Globe className="mr-1.5 h-3.5 w-3.5" />
                          Project
                        </a>
                      </Button>
                    )}
                    {sub.demoUrl && (
                      <Button asChild size="sm" variant="outline">
                        <a href={sub.demoUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                          Demo
                        </a>
                      </Button>
                    )}
                    {sub.repoUrl && (
                      <Button asChild size="sm" variant="outline">
                        <a href={sub.repoUrl} target="_blank" rel="noopener noreferrer">
                          <Github className="mr-1.5 h-3.5 w-3.5" />
                          Repo
                        </a>
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
  );
}
