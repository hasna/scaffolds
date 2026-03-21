"use client";

import { useState } from "react";
import {
  IconPlus,
  IconBriefcase,
  IconSchool,
  IconCode,
  IconFolder,
  IconCertificate,
  IconLanguage,
  IconAward,
  IconBook,
  IconHeart,
  IconLayoutGrid,
  IconFileText,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type SectionType =
  | "summary"
  | "experience"
  | "education"
  | "skills"
  | "projects"
  | "certifications"
  | "languages"
  | "awards"
  | "publications"
  | "volunteer"
  | "custom";

interface SectionOption {
  type: SectionType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const sectionOptions: SectionOption[] = [
  {
    type: "summary",
    label: "Summary",
    icon: IconFileText,
    description: "Professional summary or objective",
  },
  {
    type: "experience",
    label: "Experience",
    icon: IconBriefcase,
    description: "Work experience and employment history",
  },
  {
    type: "education",
    label: "Education",
    icon: IconSchool,
    description: "Educational background and degrees",
  },
  {
    type: "skills",
    label: "Skills",
    icon: IconCode,
    description: "Technical and soft skills",
  },
  {
    type: "projects",
    label: "Projects",
    icon: IconFolder,
    description: "Personal or professional projects",
  },
  {
    type: "certifications",
    label: "Certifications",
    icon: IconCertificate,
    description: "Professional certifications and licenses",
  },
  {
    type: "languages",
    label: "Languages",
    icon: IconLanguage,
    description: "Language proficiencies",
  },
  {
    type: "awards",
    label: "Awards",
    icon: IconAward,
    description: "Awards, honors, and achievements",
  },
  {
    type: "publications",
    label: "Publications",
    icon: IconBook,
    description: "Published papers, articles, or books",
  },
  {
    type: "volunteer",
    label: "Volunteer",
    icon: IconHeart,
    description: "Volunteer work and community involvement",
  },
  {
    type: "custom",
    label: "Custom Section",
    icon: IconLayoutGrid,
    description: "Create a custom section",
  },
];

interface SectionToolbarProps {
  onAddSection: (type: SectionType) => void;
  existingSections?: SectionType[];
  className?: string;
}

export function SectionToolbar({
  onAddSection,
  existingSections = [],
  className,
}: SectionToolbarProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Sections that can only appear once
  const singletonSections: SectionType[] = ["summary"];

  const availableOptions = sectionOptions.filter((option) => {
    if (singletonSections.includes(option.type)) {
      return !existingSections.includes(option.type);
    }
    return true;
  });

  const handleSelect = (type: SectionType) => {
    onAddSection(type);
    setIsOpen(false);
  };

  return (
    <div className={className}>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-full">
            <IconPlus className="mr-2 h-4 w-4" />
            Add Section
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="w-64">
          {availableOptions.map((option) => {
            const Icon = option.icon;
            const isCustom = option.type === "custom";

            return (
              <div key={option.type}>
                {isCustom && <DropdownMenuSeparator />}
                <DropdownMenuItem
                  onClick={() => handleSelect(option.type)}
                  className="flex items-start gap-3 py-2"
                >
                  <Icon className="text-muted-foreground mt-0.5 h-5 w-5" />
                  <div>
                    <div className="font-medium">{option.label}</div>
                    <div className="text-muted-foreground text-xs">{option.description}</div>
                  </div>
                </DropdownMenuItem>
              </div>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// Compact version for inline use
export function SectionToolbarCompact({
  onAddSection,
  existingSections = [],
}: Omit<SectionToolbarProps, "className">) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <IconPlus className="mr-1 h-4 w-4" />
          Add
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {sectionOptions.map((option) => {
          const Icon = option.icon;
          const disabled = option.type === "summary" && existingSections.includes("summary");

          return (
            <DropdownMenuItem
              key={option.type}
              onClick={() => onAddSection(option.type)}
              disabled={disabled}
            >
              <Icon className="mr-2 h-4 w-4" />
              {option.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
