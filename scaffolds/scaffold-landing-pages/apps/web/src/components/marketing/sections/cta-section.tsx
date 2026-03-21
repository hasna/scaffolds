import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

interface CtaSectionProps {
  title: string;
  description?: string;
  primaryCta: {
    text: string;
    href: string;
  };
  secondaryCta?: {
    text: string;
    href: string;
  };
  variant?: "default" | "centered" | "split";
}

export function CtaSection({
  title,
  description,
  primaryCta,
  secondaryCta,
  variant = "centered",
}: CtaSectionProps) {
  if (variant === "split") {
    return (
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                {title}
              </h2>
              {description && (
                <p className="mt-4 text-lg opacity-90">{description}</p>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" variant="secondary" asChild>
                <Link href={primaryCta.href as any}>
                  {primaryCta.text}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              {secondaryCta && (
                <Button
                  size="lg"
                  variant="outline"
                  className="border-primary-foreground/20 hover:bg-primary-foreground/10"
                  asChild
                >
                  <Link href={secondaryCta.href as any}>{secondaryCta.text}</Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 bg-primary text-primary-foreground">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {title}
          </h2>
          {description && (
            <p className="mt-4 text-lg opacity-90">{description}</p>
          )}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" variant="secondary" asChild>
              <Link href={primaryCta.href as any}>
                {primaryCta.text}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            {secondaryCta && (
              <Button
                size="lg"
                variant="outline"
                className="border-primary-foreground/20 hover:bg-primary-foreground/10"
                asChild
              >
                <Link href={secondaryCta.href as any}>{secondaryCta.text}</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
