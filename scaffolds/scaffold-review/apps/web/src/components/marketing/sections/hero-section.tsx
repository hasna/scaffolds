import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

interface HeroSectionProps {
  headline: string;
  subheadline?: string;
  primaryCta?: {
    text: string;
    href: string;
  };
  secondaryCta?: {
    text: string;
    href: string;
  };
  image?: string;
  badge?: string;
}

export function HeroSection({
  headline,
  subheadline,
  primaryCta,
  secondaryCta,
  image,
  badge,
}: HeroSectionProps) {
  return (
    <section className="relative overflow-hidden py-20 md:py-32">
      <div className="container">
        <div className="mx-auto max-w-3xl text-center">
          {badge && (
            <div className="mb-6 inline-flex items-center rounded-full border px-4 py-1.5 text-sm">
              {badge}
            </div>
          )}
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            {headline}
          </h1>
          {subheadline && (
            <p className="mt-6 text-lg text-muted-foreground md:text-xl">
              {subheadline}
            </p>
          )}
          {(primaryCta || secondaryCta) && (
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              {primaryCta && (
                <Button size="lg" asChild>
                  <Link href={primaryCta.href as any}>
                    {primaryCta.text}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              )}
              {secondaryCta && (
                <Button size="lg" variant="outline" asChild>
                  <Link href={secondaryCta.href as any}>{secondaryCta.text}</Link>
                </Button>
              )}
            </div>
          )}
        </div>
        {image && (
          <div className="mt-16">
            <img
              src={image}
              alt="Product preview"
              className="mx-auto rounded-lg border shadow-2xl"
            />
          </div>
        )}
      </div>
    </section>
  );
}
