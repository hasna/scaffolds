"use client";

import { Document, Page, Text, View, StyleSheet, Link } from "@react-pdf/renderer";
import type {
  Resume,
  ResumeSection,
  ExperienceItem,
  EducationItem,
  SkillItem,
  ProjectItem,
  CertificationItem,
  LanguageItem,
  AwardItem,
  PublicationItem,
  VolunteerItem,
  CustomItem,
  SummaryContent,
  ContactInfo,
} from "@scaffold-competition/types";

type SkillsContentType = { categories?: Array<{ name: string; skills: string[] }> } | SkillItem[];

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    fontSize: 10,
    lineHeight: 1.4,
  },
  header: {
    marginBottom: 16,
    textAlign: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#333",
    paddingBottom: 12,
  },
  name: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 4,
  },
  contactInfo: {
    fontSize: 9,
    color: "#666",
  },
  contactLinks: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginTop: 4,
    fontSize: 9,
  },
  link: {
    color: "#0066cc",
    textDecoration: "none",
  },
  section: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
    paddingBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  entry: {
    marginBottom: 8,
  },
  entryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  entryTitle: {
    fontSize: 11,
    fontWeight: "bold",
  },
  entrySubtitle: {
    fontSize: 10,
    color: "#444",
  },
  entryDate: {
    fontSize: 9,
    color: "#666",
  },
  bulletList: {
    marginTop: 4,
    paddingLeft: 12,
  },
  bullet: {
    fontSize: 10,
    marginBottom: 2,
    color: "#333",
  },
  skillsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  skillCategory: {
    marginBottom: 6,
  },
  skillCategoryName: {
    fontSize: 10,
    fontWeight: "bold",
    marginBottom: 2,
  },
  skillTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  skillTag: {
    fontSize: 9,
    backgroundColor: "#f0f0f0",
    padding: "2 6",
    borderRadius: 2,
  },
  text: {
    fontSize: 10,
    color: "#333",
  },
});

interface ModernTemplateProps {
  resume: Resume;
}

function formatDate(dateString?: string): string {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  } catch {
    return dateString;
  }
}

function formatDateRange(start?: string, end?: string, current?: boolean): string {
  const startStr = formatDate(start);
  const endStr = current ? "Present" : formatDate(end) || "Present";
  if (!startStr) return endStr;
  return `${startStr} - ${endStr}`;
}

export function ModernTemplate({ resume }: ModernTemplateProps) {
  const contact = (resume.content.personalInfo ?? resume.content.contact ?? {}) as Partial<ContactInfo>;
  const sections = resume.content.sections ?? [];
  const visibleSections = sections.filter((s) => s.visible).sort((a, b) => a.order - b.order);
  const linkedinUrl = contact.linkedinUrl;
  const githubUrl = contact.githubUrl;
  const websiteUrl = contact.websiteUrl ?? contact.portfolioUrl;

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.name}>{contact.fullName ?? ""}</Text>
          <Text style={styles.contactInfo}>
            [contact.email, contact.phone, contact.location].filter(Boolean).join(" | ")
          </Text>
          <View style={styles.contactLinks}>
            {linkedinUrl && (
              <Link src={linkedinUrl} style={styles.link}>
                LinkedIn
              </Link>
            )}
            {githubUrl && (
              <Link src={githubUrl} style={styles.link}>
                GitHub
              </Link>
            )}
            {websiteUrl && (
              <Link src={websiteUrl} style={styles.link}>
                Website
              </Link>
            )}
          </View>
        </View>

        {/* Sections */}
        {visibleSections.map((section) => (
          <View key={section.id} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <SectionContent section={section} />
          </View>
        ))}
      </Page>
    </Document>
  );
}

function SectionContent({ section }: { section: ResumeSection }) {
  switch (section.type) {
    case "summary":
      return <SummaryContent content={section.content as SummaryContent} />;
    case "experience":
      return <ExperienceContent entries={section.content as ExperienceItem[]} />;
    case "education":
      return <EducationContent entries={section.content as EducationItem[]} />;
    case "skills":
      return <SkillsContentComponent content={section.content as SkillsContentType} />;
    case "projects":
      return <ProjectsContent entries={section.content as ProjectItem[]} />;
    case "certifications":
      return <CertificationsContent entries={section.content as CertificationItem[]} />;
    case "languages":
      return <LanguagesContent entries={section.content as LanguageItem[]} />;
    case "awards":
      return <AwardsContent entries={section.content as AwardItem[]} />;
    case "publications":
      return <PublicationsContent entries={section.content as PublicationItem[]} />;
    case "volunteer":
      return <VolunteerContent entries={section.content as VolunteerItem[]} />;
    case "custom":
      return <CustomContent entries={section.content as CustomItem[]} />;
    default:
      return null;
  }
}

function SummaryContent({ content }: { content: SummaryContent }) {
  return <Text style={styles.text}>{content.text}</Text>;
}

function ExperienceContent({ entries }: { entries: ExperienceItem[] }) {
  return (
    <View>
      {entries.map((entry, index) => {
        const bullets =
          entry.highlights && entry.highlights.length > 0
            ? entry.highlights
            : entry.description
              ? [entry.description]
              : [];
        return (
        <View key={`${entry.company}-${index}`} style={styles.entry}>
          <View style={styles.entryHeader}>
            <View>
              <Text style={styles.entryTitle}>{entry.position}</Text>
              <Text style={styles.entrySubtitle}>
                {entry.company}
                {entry.location && ` • ${entry.location}`}
              </Text>
            </View>
            <Text style={styles.entryDate}>
              {formatDateRange(entry.startDate, entry.endDate, entry.isCurrent)}
            </Text>
          </View>
          {bullets.length > 0 && (
            <View style={styles.bulletList}>
              {bullets.map((bullet, i) => (
                <Text key={i} style={styles.bullet}>
                  • {bullet}
                </Text>
              ))}
            </View>
          )}
        </View>
        );
      })}
    </View>
  );
}

function EducationContent({ entries }: { entries: EducationItem[] }) {
  return (
    <View>
      {entries.map((entry, index) => (
        <View key={`${entry.institution}-${index}`} style={styles.entry}>
          <View style={styles.entryHeader}>
            <View>
              <Text style={styles.entryTitle}>{entry.institution}</Text>
              <Text style={styles.entrySubtitle}>
                {entry.degree}
                {entry.field && ` in ${entry.field}`}
                {entry.gpa && ` • GPA: ${entry.gpa}`}
              </Text>
            </View>
            <Text style={styles.entryDate}>{formatDateRange(entry.startDate, entry.endDate)}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function SkillsContentComponent({ content }: { content: SkillsContentType }) {
  const categories = Array.isArray(content)
    ? content
        .filter((item) => item.skills && item.skills.length > 0)
        .map((item) => ({
          name: item.category || "Skills",
          skills: item.skills || [],
        }))
    : content?.categories || [];

  return (
    <View>
      {categories.map((category, idx) => (
        <View key={idx} style={styles.skillCategory}>
          <Text style={styles.skillCategoryName}>{category.name}:</Text>
          <Text style={styles.text}>{category.skills.join(", ")}</Text>
        </View>
      ))}
    </View>
  );
}

function ProjectsContent({ entries }: { entries: ProjectItem[] }) {
  return (
    <View>
      {entries.map((entry, index) => (
        <View key={`${entry.name}-${index}`} style={styles.entry}>
          <Text style={styles.entryTitle}>{entry.name}</Text>
          {entry.description && <Text style={styles.text}>{entry.description}</Text>}
          {entry.technologies && entry.technologies.length > 0 && (
            <Text style={styles.entrySubtitle}>Technologies: {entry.technologies.join(", ")}</Text>
          )}
          {entry.highlights && entry.highlights.length > 0 && (
            <View style={styles.bulletList}>
              {entry.highlights.map((bullet, i) => (
                <Text key={i} style={styles.bullet}>
                  • {bullet}
                </Text>
              ))}
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

function CertificationsContent({ entries }: { entries: CertificationItem[] }) {
  return (
    <View>
      {entries.map((entry, index) => {
        const issuedDate = entry.issueDate ?? entry.expirationDate;
        return (
          <View key={`${entry.name}-${index}`} style={styles.entry}>
            <View style={styles.entryHeader}>
              <Text style={styles.entryTitle}>{entry.name}</Text>
              {issuedDate && <Text style={styles.entryDate}>{formatDate(issuedDate)}</Text>}
            </View>
            <Text style={styles.entrySubtitle}>{entry.issuer}</Text>
          </View>
        );
      })}
    </View>
  );
}

function LanguagesContent({ entries }: { entries: LanguageItem[] }) {
  return (
    <Text style={styles.text}>
      {entries.map((entry) => `${entry.language} (${entry.proficiency})`).join(" • ")}
    </Text>
  );
}

function AwardsContent({ entries }: { entries: AwardItem[] }) {
  return (
    <View>
      {entries.map((entry, index) => (
        <View key={`${entry.title}-${index}`} style={styles.entry}>
          <View style={styles.entryHeader}>
            <Text style={styles.entryTitle}>{entry.title}</Text>
            {entry.date && <Text style={styles.entryDate}>{formatDate(entry.date)}</Text>}
          </View>
          <Text style={styles.entrySubtitle}>{entry.issuer}</Text>
        </View>
      ))}
    </View>
  );
}

function PublicationsContent({ entries }: { entries: PublicationItem[] }) {
  return (
    <View>
      {entries.map((entry, index) => (
        <View key={`${entry.title}-${index}`} style={styles.entry}>
          <View style={styles.entryHeader}>
            <Text style={styles.entryTitle}>{entry.title}</Text>
            {entry.date && <Text style={styles.entryDate}>{formatDate(entry.date)}</Text>}
          </View>
          {entry.publisher && <Text style={styles.entrySubtitle}>{entry.publisher}</Text>}
          {entry.description && <Text style={styles.text}>{entry.description}</Text>}
        </View>
      ))}
    </View>
  );
}

function VolunteerContent({ entries }: { entries: VolunteerItem[] }) {
  return (
    <View>
      {entries.map((entry, index) => {
        const bullets =
          entry.highlights && entry.highlights.length > 0
            ? entry.highlights
            : entry.description
              ? [entry.description]
              : [];
        return (
        <View key={`${entry.organization}-${index}`} style={styles.entry}>
          <View style={styles.entryHeader}>
            <View>
              <Text style={styles.entryTitle}>{entry.role}</Text>
              <Text style={styles.entrySubtitle}>{entry.organization}</Text>
            </View>
            <Text style={styles.entryDate}>{formatDateRange(entry.startDate, entry.endDate)}</Text>
          </View>
          {bullets.length > 0 && (
            <View style={styles.bulletList}>
              {bullets.map((bullet, i) => (
                <Text key={i} style={styles.bullet}>
                  • {bullet}
                </Text>
              ))}
            </View>
          )}
        </View>
        );
      })}
    </View>
  );
}

function CustomContent({ entries }: { entries: CustomItem[] }) {
  return (
    <View>
      {entries.map((entry, index) => (
        <View key={`${entry.title ?? "custom"}-${index}`} style={styles.entry}>
          {entry.title && <Text style={styles.entryTitle}>{entry.title}</Text>}
          {entry.subtitle && <Text style={styles.entrySubtitle}>{entry.subtitle}</Text>}
          {entry.description && <Text style={styles.text}>{entry.description}</Text>}
        </View>
      ))}
    </View>
  );
}
