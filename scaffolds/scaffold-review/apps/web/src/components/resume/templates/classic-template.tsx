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
} from "@scaffold-review/types";

type SkillsContentType = { categories?: Array<{ name: string; skills: string[] }> } | SkillItem[];

const styles = StyleSheet.create({
  page: {
    padding: 50,
    fontFamily: "Times-Roman",
    fontSize: 11,
    lineHeight: 1.5,
  },
  header: {
    marginBottom: 20,
    textAlign: "center",
  },
  name: {
    fontSize: 20,
    fontFamily: "Times-Bold",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 2,
  },
  contactInfo: {
    fontSize: 10,
    color: "#333",
    marginBottom: 4,
  },
  contactLinks: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    fontSize: 10,
  },
  link: {
    color: "#000",
    textDecoration: "underline",
  },
  section: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Times-Bold",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 1,
    borderBottomWidth: 0.5,
    borderBottomColor: "#000",
    paddingBottom: 4,
  },
  entry: {
    marginBottom: 10,
  },
  entryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  entryTitle: {
    fontSize: 11,
    fontFamily: "Times-Bold",
  },
  entrySubtitle: {
    fontSize: 10,
    fontFamily: "Times-Italic",
    color: "#333",
  },
  entryDate: {
    fontSize: 10,
    color: "#333",
  },
  bulletList: {
    marginTop: 4,
    marginLeft: 16,
  },
  bullet: {
    fontSize: 10,
    marginBottom: 3,
  },
  text: {
    fontSize: 11,
    textAlign: "justify",
  },
  skillCategory: {
    marginBottom: 4,
  },
  skillCategoryName: {
    fontSize: 10,
    fontFamily: "Times-Bold",
  },
});

interface ClassicTemplateProps {
  resume: Resume;
}

function formatDate(dateString?: string): string {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  } catch {
    return dateString;
  }
}

function formatDateRange(start?: string, end?: string, current?: boolean): string {
  const startStr = formatDate(start);
  const endStr = current ? "Present" : formatDate(end) || "Present";
  if (!startStr) return endStr;
  return `${startStr} – ${endStr}`;
}

export function ClassicTemplate({ resume }: ClassicTemplateProps) {
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
            [contact.email, contact.phone, contact.location].filter(Boolean).join(" • ")
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
                Portfolio
              </Link>
            )}
          </View>
        </View>

        {/* Sections */}
        {visibleSections.map((section) => (
          <View key={section.id} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <ClassicSectionContent section={section} />
          </View>
        ))}
      </Page>
    </Document>
  );
}

function ClassicSectionContent({ section }: { section: ResumeSection }) {
  switch (section.type) {
    case "summary":
      return <Text style={styles.text}>{(section.content as SummaryContent).text}</Text>;
    case "experience":
      return <ClassicExperienceContent entries={section.content as ExperienceItem[]} />;
    case "education":
      return <ClassicEducationContent entries={section.content as EducationItem[]} />;
    case "skills":
      return <ClassicSkillsContent content={section.content as SkillsContentType} />;
    case "projects":
      return <ClassicProjectsContent entries={section.content as ProjectItem[]} />;
    case "certifications":
      return <ClassicCertificationsContent entries={section.content as CertificationItem[]} />;
    case "languages":
      return <ClassicLanguagesContent entries={section.content as LanguageItem[]} />;
    case "awards":
      return <ClassicAwardsContent entries={section.content as AwardItem[]} />;
    case "publications":
      return <ClassicPublicationsContent entries={section.content as PublicationItem[]} />;
    case "volunteer":
      return <ClassicVolunteerContent entries={section.content as VolunteerItem[]} />;
    case "custom":
      return <ClassicCustomContent entries={section.content as CustomItem[]} />;
    default:
      return null;
  }
}

function ClassicExperienceContent({ entries }: { entries: ExperienceItem[] }) {
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
                {entry.location && `, ${entry.location}`}
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

function ClassicEducationContent({ entries }: { entries: EducationItem[] }) {
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
                {entry.gpa && ` – GPA: ${entry.gpa}`}
              </Text>
            </View>
            <Text style={styles.entryDate}>{formatDateRange(entry.startDate, entry.endDate)}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function ClassicSkillsContent({ content }: { content: SkillsContentType }) {
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
          <Text style={styles.text}>
            <Text style={styles.skillCategoryName}>{category.name}: </Text>
            {category.skills.join(", ")}
          </Text>
        </View>
      ))}
    </View>
  );
}

function ClassicProjectsContent({ entries }: { entries: ProjectItem[] }) {
  return (
    <View>
      {entries.map((entry, index) => (
        <View key={`${entry.name}-${index}`} style={styles.entry}>
          <Text style={styles.entryTitle}>{entry.name}</Text>
          {entry.description && <Text style={styles.text}>{entry.description}</Text>}
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

function ClassicCertificationsContent({ entries }: { entries: CertificationItem[] }) {
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

function ClassicLanguagesContent({ entries }: { entries: LanguageItem[] }) {
  return (
    <Text style={styles.text}>
      {entries.map((e) => `${e.language} (${e.proficiency})`).join(", ")}
    </Text>
  );
}

function ClassicAwardsContent({ entries }: { entries: AwardItem[] }) {
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

function ClassicPublicationsContent({ entries }: { entries: PublicationItem[] }) {
  return (
    <View>
      {entries.map((entry, index) => (
        <View key={`${entry.title}-${index}`} style={styles.entry}>
          <Text style={styles.entryTitle}>{entry.title}</Text>
          {entry.publisher && <Text style={styles.entrySubtitle}>{entry.publisher}</Text>}
          {entry.description && <Text style={styles.text}>{entry.description}</Text>}
        </View>
      ))}
    </View>
  );
}

function ClassicVolunteerContent({ entries }: { entries: VolunteerItem[] }) {
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
              <Text style={styles.entryTitle}>{entry.organization}</Text>
              <Text style={styles.entrySubtitle}>{entry.role}</Text>
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

function ClassicCustomContent({ entries }: { entries: CustomItem[] }) {
  return (
    <View>
      {entries.map((entry, index) => (
        <View key={`${entry.title ?? "custom"}-${index}`} style={styles.entry}>
          {entry.title && <Text style={styles.entryTitle}>{entry.title}</Text>}
          {entry.description && <Text style={styles.text}>{entry.description}</Text>}
        </View>
      ))}
    </View>
  );
}
