"use client";

import { useState } from "react";
import { IconCheck } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export type TemplateStyle = "modern" | "classic" | "minimal" | "professional" | "creative";

interface Template {
  id: TemplateStyle;
  name: string;
  description: string;
  previewUrl?: string;
  features: string[];
}

const templates: Template[] = [
  {
    id: "modern",
    name: "Modern",
    description: "Clean and contemporary design with a professional feel",
    features: ["Two-column layout", "Accent colors", "Icons", "Clean typography"],
  },
  {
    id: "classic",
    name: "Classic",
    description: "Traditional single-column layout, ATS-friendly",
    features: ["Single column", "Serif fonts", "Formal structure", "ATS optimized"],
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "Simple and elegant with focus on content",
    features: ["Minimal design", "Maximum whitespace", "No distractions", "Content-focused"],
  },
  {
    id: "professional",
    name: "Professional",
    description: "Balanced design suitable for corporate roles",
    features: ["Balanced layout", "Subtle colors", "Professional look", "Versatile"],
  },
  {
    id: "creative",
    name: "Creative",
    description: "Bold design for creative industries",
    features: ["Unique layout", "Visual elements", "Personality", "Stand out"],
  },
];

interface TemplatePickerProps {
  value: TemplateStyle;
  onChange: (template: TemplateStyle) => void;
  trigger?: React.ReactNode;
}

export function TemplatePicker({ value, onChange, trigger }: TemplatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateStyle>(value);

  const handleSave = () => {
    onChange(selectedTemplate);
    setIsOpen(false);
  };

  const currentTemplate = templates.find((t) => t.id === value);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline">Template: {currentTemplate?.name || "Modern"}</Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Choose a Template</DialogTitle>
          <DialogDescription>
            Select a template that best represents your professional style
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-4 md:grid-cols-3">
          {templates.map((template) => (
            <div
              key={template.id}
              onClick={() => setSelectedTemplate(template.id)}
              className={cn(
                "relative cursor-pointer rounded-lg border p-4 transition-all",
                selectedTemplate === template.id
                  ? "border-primary ring-primary/20 ring-2"
                  : "hover:border-muted-foreground/50"
              )}
            >
              {selectedTemplate === template.id && (
                <div className="bg-primary text-primary-foreground absolute -top-2 -right-2 rounded-full p-1">
                  <IconCheck className="h-3 w-3" />
                </div>
              )}

              {/* Template Preview */}
              <div className="bg-muted mb-3 flex aspect-[8.5/11] items-center justify-center rounded">
                <TemplatePreview template={template.id} />
              </div>

              <h4 className="mb-1 font-medium">{template.name}</h4>
              <p className="text-muted-foreground mb-2 text-xs">{template.description}</p>
              <div className="flex flex-wrap gap-1">
                {template.features.slice(0, 2).map((feature) => (
                  <span key={feature} className="bg-muted rounded px-1.5 py-0.5 text-[10px]">
                    {feature}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Apply Template</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Simple template preview component
function TemplatePreview({ template }: { template: TemplateStyle }) {
  const baseClasses = "w-full h-full p-2 text-[6px]";

  switch (template) {
    case "modern":
      return (
        <div className={cn(baseClasses, "flex gap-1")}>
          <div className="bg-primary/10 w-1/3 rounded p-1">
            <div className="bg-primary/30 mb-1 h-1 w-full rounded" />
            <div className="bg-muted-foreground/20 mb-0.5 h-0.5 w-full rounded" />
            <div className="bg-muted-foreground/20 h-0.5 w-3/4 rounded" />
          </div>
          <div className="flex-1 space-y-1">
            <div className="bg-muted-foreground/20 h-1 w-full rounded" />
            <div className="bg-muted-foreground/10 h-0.5 w-full rounded" />
            <div className="bg-muted-foreground/10 h-0.5 w-3/4 rounded" />
          </div>
        </div>
      );

    case "classic":
      return (
        <div className={cn(baseClasses, "space-y-1")}>
          <div className="bg-muted-foreground/30 mx-auto h-1.5 w-1/2 rounded" />
          <div className="bg-muted-foreground/20 mx-auto h-0.5 w-3/4 rounded" />
          <div className="border-muted-foreground/20 mt-1 border-t pt-1">
            <div className="bg-muted-foreground/20 mb-0.5 h-0.5 w-full rounded" />
            <div className="bg-muted-foreground/10 mb-0.5 h-0.5 w-full rounded" />
            <div className="bg-muted-foreground/10 h-0.5 w-3/4 rounded" />
          </div>
        </div>
      );

    case "minimal":
      return (
        <div className={cn(baseClasses, "space-y-2")}>
          <div className="bg-foreground/40 h-1 w-1/3 rounded" />
          <div className="space-y-0.5">
            <div className="bg-muted-foreground/10 h-0.5 w-full rounded" />
            <div className="bg-muted-foreground/10 h-0.5 w-full rounded" />
            <div className="bg-muted-foreground/10 h-0.5 w-2/3 rounded" />
          </div>
        </div>
      );

    case "professional":
      return (
        <div className={cn(baseClasses, "space-y-1")}>
          <div className="bg-primary/20 rounded p-1">
            <div className="bg-primary/40 h-1 w-1/2 rounded" />
          </div>
          <div className="space-y-0.5">
            <div className="bg-muted-foreground/20 h-0.5 w-full rounded" />
            <div className="bg-muted-foreground/10 h-0.5 w-full rounded" />
            <div className="bg-muted-foreground/10 h-0.5 w-3/4 rounded" />
          </div>
        </div>
      );

    case "creative":
      return (
        <div className={cn(baseClasses, "relative")}>
          <div className="from-primary/30 to-primary/10 absolute top-0 left-0 h-full w-1/4 rounded-l bg-gradient-to-b" />
          <div className="ml-[30%] space-y-1">
            <div className="bg-muted-foreground/30 h-1 w-full rounded" />
            <div className="bg-muted-foreground/10 h-0.5 w-full rounded" />
            <div className="bg-muted-foreground/10 h-0.5 w-3/4 rounded" />
          </div>
        </div>
      );

    default:
      return null;
  }
}

// Inline template selector for simpler use cases
export function TemplateSelect({
  value,
  onChange,
}: {
  value: TemplateStyle;
  onChange: (value: TemplateStyle) => void;
}) {
  return (
    <RadioGroup
      value={value}
      onValueChange={(value: string) => onChange(value as TemplateStyle)}
      className="grid grid-cols-5 gap-2"
    >
      {templates.map((template) => (
        <div key={template.id}>
          <RadioGroupItem
            value={template.id}
            id={`template-${template.id}`}
            className="peer sr-only"
          />
          <Label
            htmlFor={`template-${template.id}`}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center rounded border p-2 transition-all",
              "peer-focus-visible:ring-primary peer-focus-visible:ring-2",
              value === template.id
                ? "border-primary bg-primary/5"
                : "hover:border-muted-foreground/50"
            )}
          >
            <span className="text-xs font-medium">{template.name}</span>
          </Label>
        </div>
      ))}
    </RadioGroup>
  );
}
