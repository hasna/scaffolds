import Link from "next/link";
import type { Route } from "next";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, Zap, Shield, Users } from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Built with Next.js 15 and Turbopack for optimal performance",
  },
  {
    icon: Shield,
    title: "Secure by Default",
    description: "Authentication, authorization, and security headers included",
  },
  {
    icon: Users,
    title: "Multi-Tenant",
    description: "Team-based isolation with role-based access control",
  },
];

const included = [
  "Next.js 15 with App Router",
  "TypeScript with strict mode",
  "NextAuth.js v5 authentication",
  "Stripe subscriptions",
  "PostgreSQL + Drizzle ORM",
  "shadcn/ui components",
  "AI Chat Assistant",
  "Webhooks system",
  "Background jobs with BullMQ",
  "Docker deployment ready",
];

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href={"/" as Route} className="text-xl font-bold">
            SaaS Scaffold
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/pricing" className="text-muted-foreground hover:text-foreground text-sm">
              Pricing
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
            Build Your SaaS
            <br />
            <span className="text-muted-foreground">In Record Time</span>
          </h1>
          <p className="text-muted-foreground mx-auto mb-8 max-w-2xl text-lg">
            A production-ready SaaS scaffold with authentication, subscriptions, team management,
            and everything you need to launch your next project.
          </p>
          <div className="flex justify-center gap-4">
            <Link href="/register">
              <Button size="lg">
                Start Building
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/pricing">
              <Button variant="outline" size="lg">
                View Pricing
              </Button>
            </Link>
          </div>
        </section>

        {/* Features */}
        <section className="border-t bg-muted/50 py-24">
          <div className="container mx-auto px-4">
            <h2 className="mb-12 text-center text-3xl font-bold">Everything You Need</h2>
            <div className="grid gap-8 md:grid-cols-3">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="bg-background rounded-lg border p-6 shadow-sm"
                >
                  <feature.icon className="mb-4 h-10 w-10 text-primary" />
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
                  <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-green-500" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t bg-muted/50 py-24">
          <div className="container mx-auto px-4 text-center">
            <h2 className="mb-4 text-3xl font-bold">Ready to Get Started?</h2>
            <p className="text-muted-foreground mx-auto mb-8 max-w-xl">
              Start building your SaaS today with our production-ready scaffold.
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
          <p>&copy; {new Date().getFullYear()} SaaS Scaffold. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
