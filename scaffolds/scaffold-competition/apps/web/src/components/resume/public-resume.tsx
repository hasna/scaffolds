"use client";

import { useMemo } from "react";
import type { ResumeContent, ResumeTheme } from "@scaffold-competition/database/schema/resumes";
import { ContactSection } from "./sections/contact-section";
import { SummarySection } from "./sections/summary-section";
import { ExperienceSection } from "./sections/experience-section";
import { EducationSection } from "./sections/education-section";
import { SkillsSection, type SkillsContentType } from "./sections/skills-section";
import { ProjectsSection } from "./sections/projects-section";
import { CertificationsSection } from "./sections/certifications-section";
import { LanguagesSection } from "./sections/languages-section";
import { AwardsSection } from "./sections/awards-section";
import { PublicationsSection } from "./sections/publications-section";
import { VolunteerSection } from "./sections/volunteer-section";
import { CustomSection } from "./sections/custom-section";
import { cn } from "@/lib/utils";

interface PublicResumeProps {
  content: ResumeContent;
  theme?: ResumeTheme;
  template?: string;
  className?: string;
}

export function PublicResume({
  content,
  theme,
  template = "modern",
  className,
}: PublicResumeProps) {
  const sortedSections = useMemo(() => {
    return [...(content.sections || [])].sort((a, b) => a.order - b.order);
  }, [content.sections]);

  const templateStyles = useMemo(() => {
    const styles: Record<string, string> = {
      modern: "font-sans",
      classic: "font-serif",
      minimal: "font-mono",
    };
    return styles[template] || styles.modern;
  }, [template]);

  const themeStyles = useMemo(() => {
    if (!theme) return {};

    return {
      "--resume-primary": theme.primaryColor || "#1a1a1a",
      "--resume-secondary": theme.secondaryColor || "#666666",
      fontFamily: theme.fontFamily,
    } as React.CSSProperties;
  }, [theme]);

  const spacingClass = useMemo(() => {
    if (!theme?.spacing) return "space-y-6";
    const spacingMap: Record<string, string> = {
      compact: "space-y-3",
      normal: "space-y-6",
      relaxed: "space-y-8",
    };
    return spacingMap[theme.spacing] || "space-y-6";
  }, [theme?.spacing]);

  const fontSizeClass = useMemo(() => {
    if (!theme?.fontSize) return "text-base";
    const sizeMap: Record<string, string> = {
      small: "text-sm",
      medium: "text-base",
      large: "text-lg",
    };
    return sizeMap[theme.fontSize] || "text-base";
  }, [theme?.fontSize]);

  const renderSection = (section: (typeof sortedSections)[0]) => {
    if (!section.visible) return null;

    // Normalize content to array format (handle both array and object formats)
    const sectionContent = section.content;

    switch (section.type) {
      case "experience":
        return (
          <ExperienceSection
            key={section.id}
            title={section.title}
            content={sectionContent as any[]}
          />
        );
      case "education":
        return (
          <EducationSection
            key={section.id}
            title={section.title}
            content={sectionContent as any[]}
          />
        );
      case "skills":
        return (
          <SkillsSection
            key={section.id}
            title={section.title}
            content={sectionContent as SkillsContentType}
          />
        );
      case "projects":
        return (
          <ProjectsSection
            key={section.id}
            title={section.title}
            content={sectionContent as any[]}
          />
        );
      case "certifications":
        return (
          <CertificationsSection
            key={section.id}
            title={section.title}
            content={sectionContent as any[]}
          />
        );
      case "languages":
        return (
          <LanguagesSection
            key={section.id}
            title={section.title}
            content={sectionContent as any[]}
          />
        );
      case "awards":
        return (
          <AwardsSection key={section.id} title={section.title} content={sectionContent as any[]} />
        );
      case "publications":
        return (
          <PublicationsSection
            key={section.id}
            title={section.title}
            content={sectionContent as any[]}
          />
        );
      case "volunteer":
        return (
          <VolunteerSection
            key={section.id}
            title={section.title}
            content={sectionContent as any[]}
          />
        );
      case "custom":
        return (
          <CustomSection key={section.id} title={section.title} content={sectionContent as any[]} />
        );
      default:
        return null;
    }
  };

  return (
    <div
      className={cn("mx-auto max-w-4xl bg-white", templateStyles, fontSizeClass, className)}
      style={themeStyles}
    >
      {/* Header / Contact Info */}
      {content.personalInfo && (
        <header className="mb-6 border-b pb-6">
          <ContactSection contact={content.personalInfo} template={template} />
        </header>
      )}

      {/* Summary */}
      {content.summary && (
        <div className="mb-6">
          <SummarySection title="Summary" content={{ text: content.summary }} />
        </div>
      )}

      {/* Main Sections */}
      <div className={spacingClass}>{sortedSections.map(renderSection)}</div>
    </div>
  );
}

// Print-optimized version
export function PrintableResume({
  content,
  theme,
  template,
}: Omit<PublicResumeProps, "className">) {
  return (
    <div className="min-h-screen bg-white p-8 print:p-0">
      {/* eslint-disable-next-line react/no-unknown-property */}
      <style jsx global>{`
        @media print {
          @page {
            size: letter;
            margin: 0.5in;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
      <PublicResume content={content} theme={theme} template={template} />
    </div>
  );
}
