import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MessageCircle, Heart, Users, Bell } from "lucide-react";

export default async function LandingPage() {
  const session = await auth();

  if (session?.user) {
    redirect("/feed");
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2 font-bold text-xl">
            <span className="text-primary">◈</span>
            <span>{{name}}</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Get started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-24 text-center">
        <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
          Connect. Share. <span className="text-primary">Belong.</span>
        </h1>
        <p className="max-w-xl text-lg text-muted-foreground">
          A social platform where you can share your thoughts, follow interesting people, and build
          meaningful connections.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button size="lg" asChild>
            <Link href="/register">Create your account</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/login">Sign in</Link>
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="border-t bg-muted/30 px-4 py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-12 text-center text-3xl font-bold">Everything you need</h2>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <FeatureCard
              icon={<MessageCircle className="h-6 w-6" />}
              title="Posts & Comments"
              description="Share thoughts up to 500 characters with optional images and comments."
            />
            <FeatureCard
              icon={<Heart className="h-6 w-6" />}
              title="Likes & Reposts"
              description="React to content and amplify posts you love to your followers."
            />
            <FeatureCard
              icon={<Users className="h-6 w-6" />}
              title="Follow Anyone"
              description="Build your network by following people you find interesting."
            />
            <FeatureCard
              icon={<Bell className="h-6 w-6" />}
              title="Notifications"
              description="Stay updated when people like, comment, or follow you."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-20 text-center">
        <h2 className="mb-4 text-3xl font-bold">Ready to join?</h2>
        <p className="mb-8 text-muted-foreground">
          Sign up for free and start connecting with people today.
        </p>
        <Button size="lg" asChild>
          <Link href="/register">Sign up for free</Link>
        </Button>
      </section>

      {/* Footer */}
      <footer className="border-t px-4 py-6 text-center text-sm text-muted-foreground">
        <p>Built with Next.js · Drizzle ORM · NextAuth.js</p>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border bg-background p-6 text-center">
      <div className="rounded-full bg-primary/10 p-3 text-primary">{icon}</div>
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
