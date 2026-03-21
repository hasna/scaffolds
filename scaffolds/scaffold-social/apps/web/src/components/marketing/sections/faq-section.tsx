import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface FaqItem {
  question: string;
  answer: string;
}

interface FaqSectionProps {
  title?: string;
  subtitle?: string;
  items: FaqItem[];
}

export function FaqSection({ title, subtitle, items }: FaqSectionProps) {
  return (
    <section className="py-20">
      <div className="container">
        <div className="mx-auto max-w-3xl">
          {(title || subtitle) && (
            <div className="text-center mb-12">
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
          <Accordion type="single" collapsible className="w-full">
            {items.map((item, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
