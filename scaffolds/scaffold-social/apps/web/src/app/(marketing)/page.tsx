import { db } from "@scaffold-social/database/client";
import * as schema from "@scaffold-social/database/schema";
import { eq, and, asc } from "drizzle-orm";
import {
  HeroSection,
  FeaturesGrid,
  TestimonialsSection,
  FaqSection,
  CtaSection,
  StatsSection,
  PricingPreview,
} from "@/components/marketing/sections";

export const dynamic = "force-dynamic";

// Default content if CMS is empty
const defaultHero = {
  headline: "Build SaaS Products 10x Faster",
  subheadline:
    "Production-ready SaaS scaffold with authentication, billing, teams, webhooks, and AI. Skip months of boilerplate and focus on what makes your product unique.",
  primaryCta: { text: "Get Started Free", href: "/register" },
  secondaryCta: { text: "Documentation", href: "/docs" },
};

const defaultFeatures = [
  {
    icon: "Shield",
    title: "Secure Authentication",
    description: "Enterprise-grade security with NextAuth.js, 2FA support, and OAuth providers.",
  },
  {
    icon: "Users",
    title: "Multi-Tenancy",
    description: "Built-in team management with roles, permissions, and tenant isolation.",
  },
  {
    icon: "CreditCard",
    title: "Stripe Billing",
    description: "Complete subscription management with metered billing and invoicing.",
  },
  {
    icon: "Bot",
    title: "AI Assistant",
    description: "Integrated AI chat with OpenAI and Anthropic, streaming responses.",
  },
  {
    icon: "Webhook",
    title: "Webhooks",
    description: "Event-driven architecture with HMAC signing and delivery tracking.",
  },
  {
    icon: "Zap",
    title: "Background Jobs",
    description: "BullMQ-powered async processing with Redis for reliable job queues.",
  },
];

const defaultTestimonials = [
  {
    content:
      "This scaffold saved us months of development time. We launched our MVP in just 2 weeks!",
    author: {
      name: "Sarah Chen",
      title: "CTO",
      company: "TechStartup",
    },
  },
  {
    content: "The best SaaS boilerplate I've used. Everything just works out of the box.",
    author: {
      name: "Michael Park",
      title: "Founder",
      company: "DevTools Inc",
    },
  },
  {
    content: "Clean code, great architecture. Perfect for teams who want to move fast.",
    author: {
      name: "Emily Johnson",
      title: "Engineering Lead",
      company: "ScaleUp Co",
    },
  },
];

const defaultFaq = [
  {
    question: "What's included in the scaffold?",
    answer:
      "Authentication, multi-tenancy, Stripe billing, webhooks, AI assistant, background jobs, and more. Everything you need to build a production-ready SaaS.",
  },
  {
    question: "Can I use this for commercial projects?",
    answer:
      "Yes! The scaffold comes with a commercial license that allows you to use it for any project, including commercial ones.",
  },
  {
    question: "Do you offer support?",
    answer:
      "We offer community support through our Discord server, and priority support for Pro and Enterprise plans.",
  },
  {
    question: "What technologies are used?",
    answer:
      "Next.js 14, TypeScript, Drizzle ORM, PostgreSQL, Redis, BullMQ, Stripe, and shadcn/ui components.",
  },
];

const defaultCta = {
  title: "Ready to Build?",
  description: "Join thousands of developers building their next SaaS product with our scaffold.",
  primaryCta: {
    text: "Start Building Today",
    href: "/register",
  },
};

const defaultPricingPlans = [
  {
    name: "Starter",
    description: "Perfect for side projects and small apps",
    price: "$0",
    period: "forever",
    features: ["Up to 1,000 users", "Basic features", "Community support", "99.5% uptime SLA"],
    cta: { text: "Get Started", href: "/register" },
  },
  {
    name: "Pro",
    description: "For growing businesses",
    price: "$49",
    period: "month",
    features: [
      "Up to 10,000 users",
      "All features",
      "Priority support",
      "99.9% uptime SLA",
      "Custom domain",
    ],
    cta: { text: "Start Trial", href: "/register" },
    highlighted: true,
    badge: "Most Popular",
  },
  {
    name: "Enterprise",
    description: "For large organizations",
    price: "Custom",
    features: [
      "Unlimited users",
      "Enterprise features",
      "Dedicated support",
      "99.99% uptime SLA",
      "Custom contracts",
      "SSO & SAML",
    ],
    cta: { text: "Contact Sales", href: "/contact" },
  },
];

async function getPageWithSections(slug: string) {
  const page = await db.query.cmsPages.findFirst({
    where: and(eq(schema.cmsPages.slug, slug), eq(schema.cmsPages.status, "published")),
  });

  if (!page) return null;

  const sections = await db.query.cmsSections.findMany({
    where: eq(schema.cmsSections.pageId, page.id),
    orderBy: [asc(schema.cmsSections.order)],
  });

  return { page, sections };
}

function renderSection(section: typeof schema.cmsSections.$inferSelect): React.ReactNode {
  const content: Record<string, unknown> = section.content ?? {};

  switch (section.type) {
    case "hero":
      return (
        <HeroSection
          key={section.id}
          headline={(content.headline as string) || defaultHero.headline}
          subheadline={(content.subheadline as string) || defaultHero.subheadline}
          primaryCta={
            (content.primaryCta as typeof defaultHero.primaryCta) || defaultHero.primaryCta
          }
          secondaryCta={
            (content.secondaryCta as typeof defaultHero.secondaryCta) || defaultHero.secondaryCta
          }
          image={content.image as string}
        />
      );

    case "features":
      return (
        <FeaturesGrid
          key={section.id}
          title={(content.title as string) || "Everything You Need"}
          subtitle={
            (content.subtitle as string) ||
            "All the features you need to build and scale your SaaS product."
          }
          features={(content.features as typeof defaultFeatures) || defaultFeatures}
        />
      );

    case "testimonials":
      return (
        <TestimonialsSection
          key={section.id}
          title={(content.title as string) || "What Our Customers Say"}
          testimonials={(content.testimonials as typeof defaultTestimonials) || defaultTestimonials}
        />
      );

    case "faq":
      return (
        <FaqSection
          key={section.id}
          title={(content.title as string) || "Frequently Asked Questions"}
          items={(content.items as typeof defaultFaq) || defaultFaq}
        />
      );

    case "cta":
      return (
        <CtaSection
          key={section.id}
          title={(content.title as string) || defaultCta.title}
          description={(content.description as string) || defaultCta.description}
          primaryCta={(content.primaryCta as typeof defaultCta.primaryCta) || defaultCta.primaryCta}
          secondaryCta={content.secondaryCta as typeof defaultCta.primaryCta}
        />
      );

    case "stats":
      return (
        <StatsSection
          key={section.id}
          title={content.title as string}
          stats={content.stats as Array<{ value: string; label: string; icon?: string }>}
        />
      );

    case "pricing":
      return (
        <PricingPreview
          key={section.id}
          title={(content.title as string) || "Simple Pricing"}
          subtitle={(content.subtitle as string) || "Choose the plan that's right for you."}
          plans={(content.plans as typeof defaultPricingPlans) || defaultPricingPlans}
        />
      );

    default:
      return null;
  }
}

export default async function LandingPage() {
  const data = await getPageWithSections("home");

  // If CMS has content, render dynamic sections
  if (data && data.sections.length > 0) {
    return <div className="flex flex-col">{data.sections.map(renderSection)}</div>;
  }

  // Fallback to static default content
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <HeroSection
        headline={defaultHero.headline}
        subheadline={defaultHero.subheadline}
        primaryCta={defaultHero.primaryCta}
        secondaryCta={defaultHero.secondaryCta}
      />

      {/* Features */}
      <FeaturesGrid
        title="Everything You Need"
        subtitle="All the features you need to build and scale your SaaS product."
        features={defaultFeatures}
      />

      {/* Testimonials */}
      <TestimonialsSection title="What Our Customers Say" testimonials={defaultTestimonials} />

      {/* Pricing Preview */}
      <PricingPreview
        title="Simple Pricing"
        subtitle="Choose the plan that's right for you."
        plans={defaultPricingPlans}
      />

      {/* FAQ */}
      <FaqSection title="Frequently Asked Questions" items={defaultFaq} />

      {/* CTA */}
      <CtaSection
        title={defaultCta.title}
        description={defaultCta.description}
        primaryCta={defaultCta.primaryCta}
      />
    </div>
  );
}

export async function generateMetadata() {
  const data = await getPageWithSections("home");

  if (data?.page) {
    return {
      title: data.page.seoTitle || "SaaS Scaffold - Build Products Faster",
      description:
        data.page.seoDescription ||
        "Production-ready SaaS scaffold with authentication, billing, teams, and AI.",
    };
  }

  return {
    title: "SaaS Scaffold - Build Products Faster",
    description: "Production-ready SaaS scaffold with authentication, billing, teams, and AI.",
  };
}
