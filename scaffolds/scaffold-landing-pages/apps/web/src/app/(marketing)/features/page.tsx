import Link from "next/link";
import { db } from "@scaffold-landing-pages/database/client";
import * as schema from "@scaffold-landing-pages/database/schema";
import { eq, and, asc } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/marketing/section-header";
import { FeatureCategoryTabs } from "@/components/marketing/sections/feature-category-tabs";
import {
  Shield,
  Users,
  CreditCard,
  Bot,
  Webhook,
  Zap,
  Database,
  Lock,
  Bell,
  Settings,
  Code,
  Globe,
  ArrowRight,
} from "lucide-react";

export const dynamic = "force-dynamic";

const iconMap: Record<string, typeof Shield> = {
  Shield,
  Users,
  CreditCard,
  Bot,
  Webhook,
  Zap,
  Database,
  Lock,
  Bell,
  Settings,
  Code,
  Globe,
};

// Default feature categories
const defaultCategories = [
  {
    id: "auth",
    name: "Authentication",
    description: "Enterprise-grade security out of the box",
    features: [
      {
        icon: "Shield",
        title: "Multiple Auth Providers",
        description:
          "Google, GitHub, Microsoft, and email/password authentication with NextAuth.js.",
      },
      {
        icon: "Lock",
        title: "Two-Factor Authentication",
        description: "Add an extra layer of security with TOTP-based 2FA for all user accounts.",
      },
      {
        icon: "Bell",
        title: "Email Verification",
        description: "Automatic email verification flow with customizable templates.",
      },
    ],
  },
  {
    id: "teams",
    name: "Multi-Tenancy",
    description: "Built for teams of all sizes",
    features: [
      {
        icon: "Users",
        title: "Team Management",
        description:
          "Create and manage teams with invite flows, role assignments, and member management.",
      },
      {
        icon: "Shield",
        title: "Role-Based Access",
        description: "Owner, admin, and member roles with granular permission controls.",
      },
      {
        icon: "Settings",
        title: "Team Settings",
        description: "Customizable team profiles with branding, notifications, and preferences.",
      },
    ],
  },
  {
    id: "billing",
    name: "Billing & Payments",
    description: "Complete Stripe integration",
    features: [
      {
        icon: "CreditCard",
        title: "Subscription Management",
        description: "Monthly and yearly billing with automatic renewals and plan changes.",
      },
      {
        icon: "Database",
        title: "Usage-Based Billing",
        description: "Track and charge for API calls, storage, and other metered resources.",
      },
      {
        icon: "Bell",
        title: "Invoice Management",
        description: "Automatic invoice generation with PDF downloads and email delivery.",
      },
    ],
  },
  {
    id: "developer",
    name: "Developer Tools",
    description: "Build and integrate with confidence",
    features: [
      {
        icon: "Code",
        title: "RESTful API",
        description: "Fully documented API with authentication, rate limiting, and versioning.",
      },
      {
        icon: "Webhook",
        title: "Webhooks",
        description: "Event-driven notifications with HMAC signing and delivery tracking.",
      },
      {
        icon: "Zap",
        title: "Background Jobs",
        description: "BullMQ-powered async processing for reliable task execution.",
      },
    ],
  },
];

const defaultIntegrations = [
  { name: "Stripe", logo: "/logos/stripe.svg" },
  { name: "OpenAI", logo: "/logos/openai.svg" },
  { name: "Anthropic", logo: "/logos/anthropic.svg" },
  { name: "Vercel", logo: "/logos/vercel.svg" },
  { name: "PostgreSQL", logo: "/logos/postgresql.svg" },
  { name: "Redis", logo: "/logos/redis.svg" },
];

async function getFeaturesPageData() {
  const page = await db.query.cmsPages.findFirst({
    where: and(eq(schema.cmsPages.slug, "features"), eq(schema.cmsPages.status, "published")),
  });

  if (!page) return null;

  const sections = await db.query.cmsSections.findMany({
    where: eq(schema.cmsSections.pageId, page.id),
    orderBy: [asc(schema.cmsSections.order)],
  });

  return { page, sections };
}

export default async function FeaturesPage() {
  const pageData = await getFeaturesPageData();

  // Get content from CMS or use defaults
  const heroSection = pageData?.sections.find((s) => s.type === "hero");
  const heroContent = heroSection?.content as { title?: string; description?: string } | undefined;

  const featuresSection = pageData?.sections.find((s) => s.type === "features");
  const featuresContent = featuresSection?.content as
    | { categories?: typeof defaultCategories }
    | undefined;
  const categories = featuresContent?.categories || defaultCategories;

  const integrationsSection = pageData?.sections.find((s) => s.type === "integrations");
  const integrationsContent = integrationsSection?.content as
    | { items?: typeof defaultIntegrations }
    | undefined;
  const integrations = integrationsContent?.items || defaultIntegrations;

  return (
    <div className="container py-12 md:py-20">
      {/* Hero */}
      <SectionHeader
        badge="Features"
        title={heroContent?.title || "Everything you need to build your SaaS"}
        description={
          heroContent?.description ||
          "A complete toolkit for building production-ready SaaS applications. Focus on what makes your product unique."
        }
        variant="hero"
      />

      {/* Feature Categories with Tabs */}
      <FeatureCategoryTabs categories={categories} />

      {/* All Features Grid */}
      <div className="mt-24">
        <SectionHeader
          title="All Features at a Glance"
          description="Everything included in the scaffold"
          variant="section"
        />
        <div className="mx-auto grid max-w-6xl gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {categories
            .flatMap((cat) => cat.features)
            .map((feature, index) => {
              const IconComponent = iconMap[feature.icon] || Zap;
              return (
                <div key={index} className="bg-card flex items-start gap-3 rounded-lg border p-4">
                  <div className="bg-primary/10 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
                    <IconComponent className="text-primary h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-medium">{feature.title}</h3>
                    <p className="text-muted-foreground mt-1 text-sm">{feature.description}</p>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Integrations */}
      <div className="mt-24">
        <SectionHeader
          title="Built with Modern Tech"
          description="Integrations and technologies that power the scaffold"
          variant="section"
        />
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-8">
          {integrations.map((integration, index) => (
            <div
              key={index}
              className="bg-card flex items-center gap-2 rounded-lg border px-4 py-2"
            >
              <Globe className="text-muted-foreground h-5 w-5" />
              <span className="font-medium">{integration.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="mt-24 text-center">
        <div className="bg-muted/50 mx-auto max-w-2xl rounded-2xl border p-8">
          <h2 className="mb-4 text-2xl font-bold">Ready to start building?</h2>
          <p className="text-muted-foreground mb-6">
            Get started with the scaffold and launch your SaaS in record time.
          </p>
          <div className="flex justify-center gap-4">
            <Button size="lg" asChild>
              <Link href="/register">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/docs">View Documentation</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export async function generateMetadata() {
  const pageData = await getFeaturesPageData();

  return {
    title: pageData?.page?.seoTitle || "Features - SaaS Scaffold",
    description:
      pageData?.page?.seoDescription || "Explore all the features included in SaaS Scaffold.",
  };
}
