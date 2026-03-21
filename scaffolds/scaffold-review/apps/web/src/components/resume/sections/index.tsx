"use client";

import type {
  AwardItem,
  CertificationItem,
  CustomItem,
  EducationItem,
  ExperienceItem,
  LanguageItem,
  ProjectItem,
  PublicationItem,
  ResumeSection,
  SummaryContent,
  VolunteerItem,
} from "@scaffold-review/types";
import { ContactSection } from "./contact-section";
import { SummarySection } from "./summary-section";
import { ExperienceSection } from "./experience-section";
import { EducationSection } from "./education-section";
import { SkillsSection, type SkillsContentType } from "./skills-section";
import { ProjectsSection } from "./projects-section";
import { CertificationsSection } from "./certifications-section";
import { LanguagesSection } from "./languages-section";
import { AwardsSection } from "./awards-section";
import { PublicationsSection } from "./publications-section";
import { VolunteerSection } from "./volunteer-section";
import { CustomSection } from "./custom-section";

export {
  ContactSection,
  SummarySection,
  ExperienceSection,
  EducationSection,
  SkillsSection,
  ProjectsSection,
  CertificationsSection,
  LanguagesSection,
  AwardsSection,
  PublicationsSection,
  VolunteerSection,
  CustomSection,
};

interface SectionRendererProps {
  section: ResumeSection;
  readonly?: boolean;
}

export function SectionRenderer({ section, readonly }: SectionRendererProps) {
  if (!section.visible) return null;

  switch (section.type) {
    case "summary":
      return (
        <SummarySection
          title={section.title}
          content={section.content as SummaryContent}
          readonly={readonly}
        />
      );
    case "experience":
      return (
        <ExperienceSection
          title={section.title}
          content={section.content as ExperienceItem[]}
          readonly={readonly}
        />
      );
    case "education":
      return (
        <EducationSection
          title={section.title}
          content={section.content as EducationItem[]}
          readonly={readonly}
        />
      );
    case "skills":
      return (
        <SkillsSection
          title={section.title}
          content={section.content as SkillsContentType}
          readonly={readonly}
        />
      );
    case "projects":
      return (
        <ProjectsSection
          title={section.title}
          content={section.content as ProjectItem[]}
          readonly={readonly}
        />
      );
    case "certifications":
      return (
        <CertificationsSection
          title={section.title}
          content={section.content as CertificationItem[]}
          readonly={readonly}
        />
      );
    case "languages":
      return (
        <LanguagesSection
          title={section.title}
          content={section.content as LanguageItem[]}
          readonly={readonly}
        />
      );
    case "awards":
      return (
        <AwardsSection
          title={section.title}
          content={section.content as AwardItem[]}
          readonly={readonly}
        />
      );
    case "publications":
      return (
        <PublicationsSection
          title={section.title}
          content={section.content as PublicationItem[]}
          readonly={readonly}
        />
      );
    case "volunteer":
      return (
        <VolunteerSection
          title={section.title}
          content={section.content as VolunteerItem[]}
          readonly={readonly}
        />
      );
    case "custom":
      return (
        <CustomSection
          title={section.title}
          content={section.content as CustomItem[]}
          readonly={readonly}
        />
      );
    default:
      return null;
  }
}
