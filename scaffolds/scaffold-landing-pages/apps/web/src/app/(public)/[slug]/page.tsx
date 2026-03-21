import { notFound } from "next/navigation";
import { db } from "@scaffold-landing-pages/database/client";
import * as schema from "@scaffold-landing-pages/database/schema";
import { eq, asc, sql } from "drizzle-orm";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = await db.query.pages.findFirst({
    where: eq(schema.pages.slug, slug),
  });

  if (!page || page.status !== "published") {
    return { title: "Not Found" };
  }

  return {
    title: page.title,
    description: page.description ?? undefined,
  };
}

export default async function PublicLandingPage({ params }: PageProps) {
  const { slug } = await params;

  const page = await db.query.pages.findFirst({
    where: eq(schema.pages.slug, slug),
    with: {
      sections: {
        where: eq(schema.sections.visible, true),
        orderBy: [asc(schema.sections.order)],
      },
    },
  });

  if (!page || page.status !== "published") {
    notFound();
  }

  // Increment view count (fire-and-forget)
  db.update(schema.pages)
    .set({ viewCount: sql`${schema.pages.viewCount} + 1` })
    .where(eq(schema.pages.id, page.id))
    .execute()
    .catch(() => {});

  return (
    <div className="min-h-screen bg-white">
      {page.sections.map((section) => (
        <SectionRenderer key={section.id} section={section} pageId={page.id} />
      ))}
    </div>
  );
}

type SectionContent = Record<string, unknown>;

interface Feature {
  title: string;
  description: string;
}

interface FooterLink {
  label: string;
  href: string;
}

function SectionRenderer({
  section,
  pageId,
}: {
  section: { type: string; content: SectionContent };
  pageId: string;
}) {
  switch (section.type) {
    case "hero":
      return <HeroSection content={section.content} />;
    case "features":
      return <FeaturesSection content={section.content} />;
    case "cta":
      return <CtaSection content={section.content} pageId={pageId} />;
    case "pricing":
      return <PricingSection content={section.content} />;
    case "footer":
      return <FooterSection content={section.content} />;
    default:
      return null;
  }
}

function HeroSection({ content }: { content: SectionContent }) {
  const headline = (content.headline as string) ?? "Welcome";
  const subtitle = (content.subtitle as string) ?? "";
  const ctaText = (content.ctaText as string) ?? "Get Started";
  const ctaHref = (content.ctaHref as string) ?? "#";

  return (
    <section className="flex min-h-[60vh] flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-700 px-6 py-24 text-center text-white">
      <h1 className="mb-6 max-w-4xl text-5xl font-bold leading-tight tracking-tight">{headline}</h1>
      {subtitle && <p className="mb-8 max-w-2xl text-xl text-slate-300">{subtitle}</p>}
      <a
        href={ctaHref}
        className="rounded-lg bg-white px-8 py-3 text-lg font-semibold text-slate-900 transition hover:bg-slate-100"
      >
        {ctaText}
      </a>
    </section>
  );
}

function FeaturesSection({ content }: { content: SectionContent }) {
  const title = (content.title as string) ?? "Features";
  const features = (content.features as Feature[]) ?? [];

  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-5xl">
        <h2 className="mb-12 text-center text-3xl font-bold text-slate-900">{title}</h2>
        <div className="grid gap-8 sm:grid-cols-3">
          {features.map((feature, i) => (
            <div key={i} className="rounded-xl border border-slate-200 p-6 shadow-sm">
              <h3 className="mb-2 text-xl font-semibold text-slate-900">{feature.title}</h3>
              <p className="text-slate-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CtaSection({ content, pageId }: { content: SectionContent; pageId: string }) {
  const title = (content.title as string) ?? "Stay in the loop";
  const subtitle = (content.subtitle as string) ?? "";

  return (
    <section className="bg-slate-50 px-6 py-20">
      <div className="mx-auto max-w-xl text-center">
        <h2 className="mb-4 text-3xl font-bold text-slate-900">{title}</h2>
        {subtitle && <p className="mb-8 text-slate-600">{subtitle}</p>}
        <form
          action="/api/leads"
          method="POST"
          className="flex flex-col gap-3 sm:flex-row"
          onSubmit={undefined}
        >
          <input type="hidden" name="pageId" value={pageId} />
          <input
            type="email"
            name="email"
            required
            placeholder="Enter your email"
            className="flex-1 rounded-lg border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-slate-500"
          />
          <button
            type="submit"
            className="rounded-lg bg-slate-900 px-6 py-3 font-semibold text-white transition hover:bg-slate-700"
          >
            Subscribe
          </button>
        </form>
      </div>
    </section>
  );
}

function PricingSection({ content }: { content: SectionContent }) {
  const title = (content.title as string) ?? "Pricing";
  const plans = (content.plans as Array<{ name: string; price: string; features: string[] }>) ?? [];

  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-4xl">
        <h2 className="mb-12 text-center text-3xl font-bold text-slate-900">{title}</h2>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan, i) => (
            <div key={i} className="rounded-xl border border-slate-200 p-6 shadow-sm">
              <h3 className="mb-1 text-xl font-bold text-slate-900">{plan.name}</h3>
              <p className="mb-4 text-3xl font-bold text-slate-900">{plan.price}</p>
              <ul className="space-y-2">
                {plan.features.map((f, j) => (
                  <li key={j} className="flex items-center gap-2 text-slate-600">
                    <span className="text-green-500">✓</span> {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FooterSection({ content }: { content: SectionContent }) {
  const copyright = (content.copyright as string) ?? "";
  const links = (content.links as FooterLink[]) ?? [];

  return (
    <footer className="border-t border-slate-200 bg-white px-6 py-12">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 sm:flex-row sm:justify-between">
        {copyright && <p className="text-sm text-slate-500">{copyright}</p>}
        {links.length > 0 && (
          <nav className="flex gap-6">
            {links.map((link, i) => (
              <a key={i} href={link.href} className="text-sm text-slate-600 hover:text-slate-900">
                {link.label}
              </a>
            ))}
          </nav>
        )}
      </div>
    </footer>
  );
}
