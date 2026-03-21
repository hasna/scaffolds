import Link from "next/link";
import { db } from "@scaffold-competition/database/client";
import * as schema from "@scaffold-competition/database/schema";
import { eq, desc } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Users, Code2, Star, ArrowRight, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const openCompetitions = await db.query.competitions
    .findMany({
      where: eq(schema.competitions.status, "open"),
      orderBy: [desc(schema.competitions.startDate)],
      with: { teams: true },
      limit: 3,
    })
    .catch(() => []);

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="from-background to-muted/30 bg-gradient-to-b py-24 text-center">
        <div className="container mx-auto px-4">
          <Trophy className="mx-auto mb-6 h-16 w-16 text-yellow-500" />
          <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl">
            Build. Compete. Win.
          </h1>
          <p className="text-muted-foreground mx-auto mt-6 max-w-2xl text-xl">
            A hackathon platform for creators — organize competitions, form teams, submit
            projects, and judge entries with full transparency.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Button asChild size="lg">
              <Link href="/competitions">
                Browse Competitions <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/register">Create Account</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="mb-12 text-center text-3xl font-bold">Everything you need</h2>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Trophy,
                title: "Competition Lifecycle",
                desc: "Draft → Open → Judging → Closed. Full control over your event from setup to winners.",
              },
              {
                icon: Users,
                title: "Team Formation",
                desc: "Participants create or join teams with configurable max size and role-based access.",
              },
              {
                icon: Code2,
                title: "Project Submissions",
                desc: "Teams submit with project URL, live demo, and repo link — all in one place.",
              },
              {
                icon: Star,
                title: "Judging Panel",
                desc: "Judges score each submission 1–10 with written feedback and transparent results.",
              },
              {
                icon: Trophy,
                title: "Public Gallery",
                desc: "Approved submissions are showcased in a public gallery for the community to explore.",
              },
              {
                icon: Users,
                title: "Auth & Roles",
                desc: "OAuth + email/password + magic link. Roles for organizers, judges, and participants.",
              },
            ].map(({ icon: Icon, title, desc }) => (
              <Card key={title}>
                <CardHeader>
                  <Icon className="mb-2 h-8 w-8 text-primary" />
                  <CardTitle>{title}</CardTitle>
                  <CardDescription>{desc}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Open Competitions Preview */}
      {openCompetitions.length > 0 && (
        <section className="bg-muted/30 py-20">
          <div className="container mx-auto px-4">
            <div className="mb-10 flex items-center justify-between">
              <h2 className="text-3xl font-bold">Open Now</h2>
              <Button asChild variant="ghost">
                <Link href="/competitions">
                  View all <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {openCompetitions.map((comp) => (
                <Card key={comp.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">{comp.title}</CardTitle>
                      <Badge>open</Badge>
                    </div>
                    <CardDescription className="line-clamp-2">{comp.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-muted-foreground flex gap-4 text-sm">
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {comp.teams.length} teams
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {formatDistanceToNow(new Date(comp.submissionDeadline), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                    <Button asChild size="sm" className="w-full">
                      <Link href={`/competitions/${comp.slug}`}>Enter Competition</Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-20 text-center">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold">Ready to compete?</h2>
          <p className="text-muted-foreground mt-4 text-lg">
            Create an account to join competitions and build with your team.
          </p>
          <Button asChild size="lg" className="mt-8">
            <Link href="/register">Get started — it&apos;s free</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
