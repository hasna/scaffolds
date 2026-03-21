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
} from "@scaffold-social/types";

type SkillsContentType = { categories?: Array<{ name: string; skills: string[] }> } | SkillItem[];

const styles = StyleSheet.create({
  page: {
    padding: 48,
    fontFamily: "Helvetica",
    fontSize: 10,
    lineHeight: 1.6,
    color: "#2d2d2d",
  },
  header: {
    marginBottom: 24,
  },
  name: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  contactInfo: {
    fontSize: 9,
    color: "#666",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  link: {
    color: "#666",
    textDecoration: "none",
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 9,
    fontWeight: "bold",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    color: "#888",
  },
  entry: {
    marginBottom: 12,
  },
  entryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  entryTitle: {
    fontSize: 11,
    fontWeight: "bold",
  },
  entrySubtitle: {
    fontSize: 10,
    color: "#555",
    marginTop: 1,
  },
  entryDate: {
    fontSize: 9,
    color: "#888",
  },
  bulletList: {
    marginTop: 6,
  },
  bullet: {
    fontSize: 10,
    marginBottom: 4,
    color: "#444",
    paddingLeft: 12,
  },
  text: {
    fontSize: 10,
    color: "#444",
  },
  skillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  skillTag: {
    fontSize: 9,
    color: "#555",
    backgroundColor: "#f5f5f5",
    padding: "3 8",
    borderRadius: 3,
  },
  divider: {
    borderBottomWidth: 0.5,
    borderBottomColor: "#e0e0e0",
    marginBottom: 12,
  },
});

interface MinimalTemplateProps {
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
  return `${startStr} — ${endStr}`;
}

export function MinimalTemplate({ resume }: MinimalTemplateProps) {
  const contact = (resume.content.personalInfo ?? resume.content.contact ?? {}) as Partial<ContactInfo>;
  const sections = resume.content.sections ?? [];
  const visibleSections = sections.filter((s) => s.visible).sort((a, b) => a.order - b.order);
  const linkedinUrl = contact.linkedinUrl;
  const githubUrl = contact.githubUrl;

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.name}>{contact.fullName ?? ""}</Text>
          <View style={styles.contactInfo}>
            {contact.email && <Text>{contact.email}</Text>}
            {contact.phone && <Text>{contact.phone}</Text>}
            {contact.location && <Text>{contact.location}</Text>}
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
          </View>
        </View>

        {/* Sections */}
        {visibleSections.map((section, idx) => (
          <View key={section.id} style={styles.section}>
            {idx > 0 && <View style={styles.divider} />}
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <MinimalSectionContent section={section} />
          </View>
        ))}
      </Page>
    </Document>
  );
}

function MinimalSectionContent({ section }: { section: ResumeSection }) {
  switch (section.type) {
    case "summary":
      return <Text style={styles.text}>{(section.content as SummaryContent).text}</Text>;
    case "experience":
      return <MinimalExperienceContent entries={section.content as ExperienceItem[]} />;
    case "education":
      return <MinimalEducationContent entries={section.content as EducationItem[]} />;
    case "skills":
      return <MinimalSkillsContent content={section.content as SkillsContentType} />;
    case "projects":
      return <MinimalProjectsContent entries={section.content as ProjectItem[]} />;
    case "certifications":
      return <MinimalCertificationsContent entries={section.content as CertificationItem[]} />;
    case "languages":
      return <MinimalLanguagesContent entries={section.content as LanguageItem[]} />;
    case "awards":
      return <MinimalAwardsContent entries={section.content as AwardItem[]} />;
    case "publications":
      return <MinimalPublicationsContent entries={section.content as PublicationItem[]} />;
    case "volunteer":
      return <MinimalVolunteerContent entries={section.content as VolunteerItem[]} />;
    case "custom":
      return <MinimalCustomContent entries={section.content as CustomItem[]} />;
    default:
      return null;
  }
}

function MinimalExperienceContent({ entries }: { entries: ExperienceItem[] }) {
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
                {entry.location ? `, ${entry.location}` : ""}
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
                  {bullet}
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

function MinimalEducationContent({ entries }: { entries: EducationItem[] }) {
  return (
    <View>
      {entries.map((entry, index) => (
        <View key={`${entry.institution}-${index}`} style={styles.entry}>
          <View style={styles.entryHeader}>
            <View>
              <Text style={styles.entryTitle}>{entry.degree}</Text>
              <Text style={styles.entrySubtitle}>{entry.institution}</Text>
            </View>
            {entry.endDate && <Text style={styles.entryDate}>{formatDate(entry.endDate)}</Text>}
          </View>
        </View>
      ))}
    </View>
  );
}

function MinimalSkillsContent({ content }: { content: SkillsContentType }) {
  const categories = Array.isArray(content)
    ? content
        .filter((item) => item.skills && item.skills.length > 0)
        .map((item) => ({
          name: item.category || "Skills",
          skills: item.skills || [],
        }))
    : content?.categories || [];

  const allSkills = categories.flatMap((c) => c.skills);
  return (
    <View style={styles.skillsRow}>
      {allSkills.map((skill, i) => (
        <Text key={i} style={styles.skillTag}>
          {skill}
        </Text>
      ))}
    </View>
  );
}

function MinimalProjectsContent({ entries }: { entries: ProjectItem[] }) {
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
                  {bullet}
                </Text>
              ))}
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

function MinimalCertificationsContent({ entries }: { entries: CertificationItem[] }) {
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

function MinimalLanguagesContent({ entries }: { entries: LanguageItem[] }) {
  return (
    <View style={styles.skillsRow}>
      {entries.map((entry, index) => (
        <Text key={`${entry.language}-${index}`} style={styles.skillTag}>
          {entry.language}
        </Text>
      ))}
    </View>
  );
}

function MinimalAwardsContent({ entries }: { entries: AwardItem[] }) {
  return (
    <View>
      {entries.map((entry, index) => (
        <View key={`${entry.title}-${index}`} style={styles.entry}>
          <Text style={styles.entryTitle}>{entry.title}</Text>
          <Text style={styles.entrySubtitle}>{entry.issuer}</Text>
        </View>
      ))}
    </View>
  );
}

function MinimalPublicationsContent({ entries }: { entries: PublicationItem[] }) {
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

function MinimalVolunteerContent({ entries }: { entries: VolunteerItem[] }) {
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
                  {bullet}
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

function MinimalCustomContent({ entries }: { entries: CustomItem[] }) {
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
