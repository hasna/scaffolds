import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, BookOpen, Tag, MessageCircle, Globe } from "lucide-react";

const features = [
  {
    icon: BookOpen,
    title: "Articles & Stories",
    description: "Publish articles with rich content, cover images, categories, and tags",
  },
  {
    icon: Tag,
    title: "Categories & Tags",
    description: "Organize content with flexible categories and tag-based filtering",
  },
  {
    icon: MessageCircle,
    title: "Reader Comments",
    description: "Engage your audience with a moderated comment system",
  },
  {
    icon: Globe,
    title: "Public + Admin",
    description: "Clean public reader experience and a powerful editorial dashboard",
  },
];

const included = [
  "Next.js 15 with App Router",
  "TypeScript with strict mode",
  "NextAuth.js v5 authentication",
  "PostgreSQL + Drizzle ORM",
  "shadcn/ui components",
  "Articles, categories & tags",
  "Comment moderation",
  "Webhooks system",
  "Docker deployment ready",
  "Admin editorial dashboard",
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="text-xl font-bold">
            News Scaffold
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/articles" className="text-muted-foreground hover:text-foreground text-sm">
              Articles
            </Link>
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Log in
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm">Get Started</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="container mx-auto px-4 py-24 text-center">
          <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-6xl">
            Launch Your News Platform
            <br />
            <span className="text-muted-foreground">In Record Time</span>
          </h1>
          <p className="text-muted-foreground mx-auto mb-8 max-w-2xl text-lg">
            A production-ready news and media scaffold with authentication, article management,
            categories, tags, comments, and everything you need to launch your publication.
          </p>
          <div className="flex justify-center gap-4">
            <Link href="/register">
              <Button size="lg">
                Start Publishing
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg">
                Sign In
              </Button>
            </Link>
          </div>
        </section>

        {/* Features */}
        <section className="border-t bg-muted/50 py-24">
          <div className="container mx-auto px-4">
            <h2 className="mb-12 text-center text-3xl font-bold">Everything for a News Platform</h2>
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="bg-background rounded-lg border p-6 shadow-sm"
                >
                  <feature.icon className="text-primary mb-4 h-10 w-10" />
                  <h3 className="mb-2 text-xl font-semibold">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* What's Included */}
        <section className="py-24">
          <div className="container mx-auto px-4">
            <h2 className="mb-12 text-center text-3xl font-bold">What&apos;s Included</h2>
            <div className="mx-auto grid max-w-3xl gap-4 md:grid-cols-2">
              {included.map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <ArrowRight className="h-5 w-5 flex-shrink-0 text-green-500" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t bg-muted/50 py-24">
          <div className="container mx-auto px-4 text-center">
            <h2 className="mb-4 text-3xl font-bold">Ready to Start Publishing?</h2>
            <p className="text-muted-foreground mx-auto mb-8 max-w-xl">
              Set up your news platform in minutes with this production-ready scaffold.
            </p>
            <Link href="/register">
              <Button size="lg">
                Create Your Account
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} News Scaffold. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
