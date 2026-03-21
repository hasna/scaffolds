import Link from "next/link";
import { db } from "@scaffold-review/database/client";
import * as schema from "@scaffold-review/database/schema";
import { eq, and, asc } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SectionHeader } from "@/components/marketing/section-header";
import { ValuesGrid } from "@/components/marketing/sections/values-grid";
import { TeamGrid } from "@/components/marketing/sections/team-grid";
import { Target, Mail } from "lucide-react";

export const dynamic = "force-dynamic";

// Default content
const defaultMission = {
  title: "Our Mission",
  description:
    "We believe that every developer should have access to the tools they need to build great products. Our mission is to eliminate the repetitive work of setting up SaaS infrastructure, so you can focus on what makes your product unique.",
};

const defaultValues = [
  {
    icon: "Target",
    title: "Developer First",
    description:
      "We build tools by developers, for developers. Every feature is designed with the developer experience in mind.",
  },
  {
    icon: "Heart",
    title: "Quality Over Quantity",
    description:
      "We focus on doing a few things exceptionally well, rather than trying to do everything.",
  },
  {
    icon: "Lightbulb",
    title: "Innovation",
    description:
      "We constantly explore new technologies and approaches to improve our scaffold and your products.",
  },
  {
    icon: "Shield",
    title: "Security & Privacy",
    description:
      "Security is not an afterthought. Every feature is built with security best practices from day one.",
  },
];

const defaultTeam = [
  {
    name: "Alex Chen",
    role: "Founder & CEO",
    bio: "Previously engineering lead at a YC startup. Passionate about developer tools.",
    avatar: null,
  },
  {
    name: "Sarah Park",
    role: "CTO",
    bio: "10+ years building scalable SaaS platforms. Open source contributor.",
    avatar: null,
  },
  {
    name: "Michael Johnson",
    role: "Head of Product",
    bio: "Former product manager at a leading cloud provider. Focused on developer experience.",
    avatar: null,
  },
];

const defaultTimeline = [
  {
    year: "2023",
    title: "The Beginning",
    description: "Started as an internal tool to speed up our own SaaS development.",
  },
  {
    year: "2023",
    title: "Public Launch",
    description: "Released the first version to the public after extensive testing.",
  },
  {
    year: "2024",
    title: "Growing Community",
    description: "Reached 1,000+ developers using the scaffold in production.",
  },
  {
    year: "2024",
    title: "Enterprise Features",
    description: "Added advanced features for enterprise teams and custom deployments.",
  },
];

async function getAboutPageData() {
  const page = await db.query.cmsPages.findFirst({
    where: and(eq(schema.cmsPages.slug, "about"), eq(schema.cmsPages.status, "published")),
  });

  if (!page) return null;

  const sections = await db.query.cmsSections.findMany({
    where: eq(schema.cmsSections.pageId, page.id),
    orderBy: [asc(schema.cmsSections.order)],
  });

  return { page, sections };
}

export default async function AboutPage() {
  const pageData = await getAboutPageData();

  // Get content from CMS or use defaults
  const heroSection = pageData?.sections.find((s) => s.type === "hero");
  const heroContent = heroSection?.content as { title?: string; description?: string } | undefined;

  const missionSection = pageData?.sections.find((s) => s.type === "text" || s.type === "mission");
  const missionContent = missionSection?.content as typeof defaultMission | undefined;
  const mission = missionContent || defaultMission;

  const valuesSection = pageData?.sections.find((s) => s.type === "values");
  const valuesContent = valuesSection?.content as { items?: typeof defaultValues } | undefined;
  const values = valuesContent?.items || defaultValues;

  const teamSection = pageData?.sections.find((s) => s.type === "team");
  const teamContent = teamSection?.content as { members?: typeof defaultTeam } | undefined;
  const team = teamContent?.members || defaultTeam;

  const timelineSection = pageData?.sections.find((s) => s.type === "timeline");
  const timelineContent = timelineSection?.content as
    | { items?: typeof defaultTimeline }
    | undefined;
  const timeline = timelineContent?.items || defaultTimeline;

  return (
    <div className="container py-12 md:py-20">
      {/* Hero */}
      <SectionHeader
        badge="About Us"
        title={heroContent?.title || "Building the future of SaaS development"}
        description={
          heroContent?.description ||
          "We're a team of developers building tools to help other developers ship faster."
        }
        variant="hero"
      />

      {/* Mission */}
      <div className="mx-auto mb-24 max-w-3xl">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="text-center">
            <div className="bg-primary/10 mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
              <Target className="text-primary h-6 w-6" />
            </div>
            <CardTitle className="text-2xl">{mission.title}</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground leading-relaxed">{mission.description}</p>
          </CardContent>
        </Card>
      </div>

      {/* Values */}
      <ValuesGrid
        title="Our Values"
        description="The principles that guide everything we do"
        values={values}
      />

      {/* Team */}
      <TeamGrid title="Meet the Team" description="The people behind the scaffold" members={team} />

      {/* Timeline */}
      <div className="mb-24">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold">Our Journey</h2>
          <p className="text-muted-foreground">How we got here</p>
        </div>
        <div className="mx-auto max-w-2xl">
          <div className="border-primary/20 relative space-y-8 border-l-2 pl-8">
            {timeline.map((item, index) => (
              <div key={index} className="relative">
                <div className="bg-primary border-background absolute -left-[41px] h-4 w-4 rounded-full border-4" />
                <div className="text-primary mb-1 text-sm font-medium">{item.year}</div>
                <h3 className="mb-2 font-semibold">{item.title}</h3>
                <p className="text-muted-foreground text-sm">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="text-center">
        <div className="bg-muted/50 mx-auto max-w-2xl rounded-2xl border p-8">
          <h2 className="mb-4 text-2xl font-bold">Want to learn more?</h2>
          <p className="text-muted-foreground mb-6">
            Get in touch with our team or start exploring the documentation.
          </p>
          <div className="flex justify-center gap-4">
            <Button size="lg" asChild>
              <Link href="/contact">
                <Mail className="mr-2 h-4 w-4" />
                Contact Us
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
  const pageData = await getAboutPageData();

  return {
    title: pageData?.page?.seoTitle || "About - SaaS Scaffold",
    description:
      pageData?.page?.seoDescription || "Learn about the team and mission behind SaaS Scaffold.",
  };
}
