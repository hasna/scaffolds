import Link from "next/link";
import { db } from "@scaffold-competition/database/client";
import * as schema from "@scaffold-competition/database/schema";
import { eq, and, asc } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Building2 } from "lucide-react";
import { PricingToggle } from "./pricing-toggle";
import { FaqSection } from "@/components/marketing/sections/faq-section";
import { ContactSalesDialog } from "@/components/marketing/contact-sales-dialog";

export const dynamic = "force-dynamic";

// Default FAQ if CMS is empty
const defaultFaq = [
  {
    question: "Can I change plans later?",
    answer: "Yes, you can upgrade or downgrade your plan at any time. Changes will be prorated.",
  },
  {
    question: "What payment methods do you accept?",
    answer: "We accept all major credit cards through Stripe.",
  },
  {
    question: "Is there a free trial?",
    answer: "Yes, all paid plans include a 14-day free trial. No credit card required.",
  },
  {
    question: "What happens when I exceed my limits?",
    answer:
      "We'll notify you when you're approaching your limits. You can upgrade at any time to get more resources.",
  },
];

async function getPlans() {
  const plans = await db.query.pricingPlans.findMany({
    where: eq(schema.pricingPlans.isActive, true),
    orderBy: [asc(schema.pricingPlans.sortOrder)],
  });
  return plans;
}

async function getPricingPageData() {
  const page = await db.query.cmsPages.findFirst({
    where: and(eq(schema.cmsPages.slug, "pricing"), eq(schema.cmsPages.status, "published")),
  });

  if (!page) return null;

  const sections = await db.query.cmsSections.findMany({
    where: eq(schema.cmsSections.pageId, page.id),
    orderBy: [asc(schema.cmsSections.order)],
  });

  return { page, sections };
}

// Default plans if none in database
const defaultPlans = [
  {
    id: "free",
    name: "Free",
    slug: "free",
    priceMonthly: 0,
    priceYearly: 0,
    description: "For individuals getting started",
    features: [
      { name: "1 team member", included: true },
      { name: "1,000 API calls/month", included: true },
      { name: "Community support", included: true },
      { name: "Webhooks", included: false },
      { name: "AI Assistant", included: false },
    ],
    popular: false,
  },
  {
    id: "pro",
    name: "Pro",
    slug: "pro",
    priceMonthly: 2900,
    priceYearly: 29000,
    description: "For growing teams",
    features: [
      { name: "Up to 10 team members", included: true },
      { name: "50,000 API calls/month", included: true },
      { name: "Priority support", included: true },
      { name: "Webhooks", included: true },
      { name: "AI Assistant", included: true },
    ],
    popular: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    slug: "enterprise",
    priceMonthly: 9900,
    priceYearly: 99000,
    description: "For large organizations",
    features: [
      { name: "Unlimited team members", included: true },
      { name: "Unlimited API calls", included: true },
      { name: "Dedicated support", included: true },
      { name: "Custom integrations", included: true },
      { name: "SLA guarantee", included: true },
    ],
    popular: false,
  },
];

export default async function PricingPage() {
  const [plans, pageData] = await Promise.all([getPlans(), getPricingPageData()]);

  const displayPlans =
    plans.length > 0
      ? plans.map((p) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          priceMonthly: p.priceMonthly,
          priceYearly: p.priceYearly,
          description: p.description || "",
          features: (p.features || []) as Array<{ name: string; included: boolean }>,
          popular: p.sortOrder === 1,
        }))
      : defaultPlans;

  // Get FAQ from CMS if available
  const faqSection = pageData?.sections.find((s) => s.type === "faq");
  const faqContent = faqSection?.content as { items?: typeof defaultFaq } | undefined;
  const faqItems = faqContent?.items || defaultFaq;

  // Get header content from CMS
  const headerSection = pageData?.sections.find((s) => s.type === "hero");
  const headerContent = headerSection?.content as
    | { title?: string; description?: string }
    | undefined;

  return (
    <div className="container py-12 md:py-20">
      {/* Header */}
      <div className="mx-auto mb-12 max-w-2xl text-center">
        <Badge variant="outline" className="mb-4">
          Pricing
        </Badge>
        <h1 className="mb-4 text-4xl font-bold tracking-tight">
          {headerContent?.title || "Simple, transparent pricing"}
        </h1>
        <p className="text-muted-foreground text-lg">
          {headerContent?.description ||
            "Choose the plan that's right for you. All plans include a 14-day free trial."}
        </p>
      </div>

      {/* Pricing Cards with Toggle */}
      <PricingToggle plans={displayPlans} />

      {/* Enterprise Section */}
      <div className="mx-auto mt-16 mb-16 max-w-3xl">
        <Card className="bg-muted/50">
          <CardHeader className="text-center">
            <div className="bg-primary/10 mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
              <Building2 className="text-primary h-6 w-6" />
            </div>
            <CardTitle className="text-2xl">Need a custom solution?</CardTitle>
            <CardDescription className="text-base">
              Contact us for custom pricing, dedicated support, and enterprise features.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <div className="text-muted-foreground mb-6 grid gap-4 text-sm sm:grid-cols-3">
              <div>
                <div className="text-foreground font-medium">Custom Limits</div>
                <p>Tailored to your needs</p>
              </div>
              <div>
                <div className="text-foreground font-medium">Priority Support</div>
                <p>Dedicated account manager</p>
              </div>
              <div>
                <div className="text-foreground font-medium">SLA Guarantee</div>
                <p>99.9% uptime guarantee</p>
              </div>
            </div>
            <ContactSalesDialog size="lg" />
          </CardContent>
        </Card>
      </div>

      {/* FAQ */}
      <FaqSection title="Frequently Asked Questions" items={faqItems} />

      {/* Bottom CTA */}
      <div className="mt-16 border-t pt-8 text-center">
        <h2 className="mb-2 text-xl font-bold">Ready to get started?</h2>
        <p className="text-muted-foreground mb-4">
          Start your 14-day free trial today. No credit card required.
        </p>
        <Button size="lg" asChild>
          <Link href="/register">Start Free Trial</Link>
        </Button>
      </div>
    </div>
  );
}

export async function generateMetadata() {
  const pageData = await getPricingPageData();

  return {
    title: pageData?.page?.seoTitle || "Pricing - SaaS Scaffold",
    description:
      pageData?.page?.seoDescription || "Simple, transparent pricing for every team size.",
  };
}
