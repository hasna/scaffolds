import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Quote } from "lucide-react";

interface Testimonial {
  content: string;
  author: {
    name: string;
    title?: string;
    company?: string;
    image?: string;
  };
}

interface TestimonialsSectionProps {
  title?: string;
  subtitle?: string;
  testimonials: Testimonial[];
}

export function TestimonialsSection({
  title,
  subtitle,
  testimonials,
}: TestimonialsSectionProps) {
  return (
    <section className="py-20 bg-muted/30">
      <div className="container">
        {(title || subtitle) && (
          <div className="mx-auto max-w-2xl text-center mb-12">
            {title && (
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="mt-4 text-lg text-muted-foreground">{subtitle}</p>
            )}
          </div>
        )}
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="relative">
              <CardContent className="pt-6">
                <Quote className="absolute top-4 right-4 h-8 w-8 text-muted-foreground/20" />
                <p className="text-muted-foreground mb-6">
                  &ldquo;{testimonial.content}&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={testimonial.author.image} />
                    <AvatarFallback>
                      {testimonial.author.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{testimonial.author.name}</p>
                    {(testimonial.author.title || testimonial.author.company) && (
                      <p className="text-sm text-muted-foreground">
                        {testimonial.author.title}
                        {testimonial.author.title && testimonial.author.company && " at "}
                        {testimonial.author.company}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
