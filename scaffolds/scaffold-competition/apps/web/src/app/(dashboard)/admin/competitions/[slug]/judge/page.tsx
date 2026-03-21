import { notFound } from "next/navigation";
import { db } from "@scaffold-competition/database/client";
import * as schema from "@scaffold-competition/database/schema";
import { eq, and } from "drizzle-orm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Star, ExternalLink, Github, Globe } from "lucide-react";
import { JudgeScoreForm } from "./_components/judge-score-form";

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
  return { title: comp ? `Judge: ${comp.title}` : "Judging" };
}

export default async function JudgePanelPage({ params }: Props) {
  const { slug } = await params;

  const comp = await db.query.competitions.findFirst({
    where: eq(schema.competitions.slug, slug),
    columns: { id: true, title: true, status: true },
  });

  if (!comp) notFound();

  const submissions = await db.query.submissions.findMany({
    where: and(
      eq(schema.submissions.competitionId, comp.id),
      eq(schema.submissions.status, "submitted")
    ),
    with: {
      team: {
        columns: { name: true },
        with: {
          members: {
            with: {
              user: { columns: { name: true } },
            },
          },
        },
      },
      scores: {
        with: {
          judge: { columns: { name: true, email: true } },
        },
      },
    },
  });

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
      <div>
        <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
          <Trophy className="h-4 w-4 text-yellow-500" />
          <span>{comp.title}</span>
          <Badge variant="outline" className="capitalize ml-2">
            {comp.status}
          </Badge>
        </div>
        <h1 className="text-2xl font-bold">Judging Panel</h1>
        <p className="text-muted-foreground text-sm">
          {submissions.length} submission{submissions.length !== 1 ? "s" : ""} awaiting review
        </p>
      </div>

      {submissions.length === 0 ? (
        <Card>
          <CardContent className="py-20 text-center">
            <Star className="text-muted-foreground mx-auto mb-4 h-12 w-12 opacity-30" />
            <p className="font-medium">No submissions to judge yet.</p>
            <p className="text-muted-foreground text-sm mt-2">
              Submissions will appear here once teams submit their projects.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {submissions.map((sub) => {
            const avgScore =
              sub.scores.length > 0
                ? (sub.scores.reduce((a, s) => a + s.score, 0) / sub.scores.length).toFixed(1)
                : null;

            return (
              <Card key={sub.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle>{sub.title}</CardTitle>
                      <CardDescription className="mt-1">
                        by{" "}
                        <span className="font-medium text-foreground">{sub.team.name}</span>
                        {" · "}
                        {sub.team.members.map((m) => m.user.name).join(", ")}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {avgScore && (
                        <Badge variant="outline" className="gap-1">
                          <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                          {avgScore}/10
                        </Badge>
                      )}
                      <Badge>{sub.scores.length} score{sub.scores.length !== 1 ? "s" : ""}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm">{sub.description}</p>

                  {/* Links */}
                  <div className="flex flex-wrap gap-2">
                    {sub.projectUrl && (
                      <a
                        href={sub.projectUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary flex items-center gap-1 text-sm hover:underline"
                      >
                        <Globe className="h-3.5 w-3.5" />
                        Project
                      </a>
                    )}
                    {sub.demoUrl && (
                      <a
                        href={sub.demoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary flex items-center gap-1 text-sm hover:underline"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Demo
                      </a>
                    )}
                    {sub.repoUrl && (
                      <a
                        href={sub.repoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary flex items-center gap-1 text-sm hover:underline"
                      >
                        <Github className="h-3.5 w-3.5" />
                        Repo
                      </a>
                    )}
                  </div>

                  {/* Existing scores */}
                  {sub.scores.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Scores
                      </p>
                      {sub.scores.map((s) => (
                        <div
                          key={s.id}
                          className="bg-muted/50 flex items-start gap-3 rounded-md p-3 text-sm"
                        >
                          <Badge variant="outline" className="shrink-0">
                            {s.score}/10
                          </Badge>
                          <div>
                            <p className="font-medium text-xs">
                              {s.judge.name ?? s.judge.email}
                            </p>
                            {s.feedback && (
                              <p className="text-muted-foreground mt-1">{s.feedback}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Score form */}
                  <JudgeScoreForm submissionId={sub.id} />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
