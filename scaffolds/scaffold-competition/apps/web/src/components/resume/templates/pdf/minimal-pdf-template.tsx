import { Document, Page, Text, View, StyleSheet, Link } from "@react-pdf/renderer";
import type { ResumeContent, ResumeSection } from "@scaffold-competition/database/schema/resumes";

const styles = StyleSheet.create({
  page: {
    padding: 45,
    fontFamily: "Helvetica",
    fontSize: 10,
    lineHeight: 1.5,
    color: "#333",
  },
  header: {
    marginBottom: 25,
  },
  name: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 6,
    color: "#000",
  },
  contactInfo: {
    fontSize: 9,
    color: "#666",
  },
  contactLinks: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
    fontSize: 9,
  },
  link: {
    color: "#666",
    textDecoration: "none",
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#999",
    textTransform: "uppercase",
    letterSpacing: 1,
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
    fontWeight: "bold",
    color: "#000",
  },
  entrySubtitle: {
    fontSize: 9,
    color: "#666",
  },
  entryDate: {
    fontSize: 9,
    color: "#999",
  },
  bulletList: {
    marginTop: 4,
    paddingLeft: 10,
  },
  bullet: {
    fontSize: 9,
    marginBottom: 2,
    color: "#444",
  },
  text: {
    fontSize: 9,
    color: "#444",
  },
  skillsText: {
    fontSize: 9,
    color: "#444",
  },
});

interface MinimalPdfTemplateProps {
  content: ResumeContent;
  title: string;
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
  return `${startStr} – ${endStr}`;
}

export function MinimalPdfTemplate({ content }: MinimalPdfTemplateProps) {
  const personalInfo = content.personalInfo || content.contact;
  const visibleSections = (content.sections || [])
    .filter((s) => s.visible)
    .sort((a, b) => a.order - b.order);

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        {personalInfo && (
          <View style={styles.header}>
            <Text style={styles.name}>{personalInfo.fullName || ""}</Text>
            <Text style={styles.contactInfo}>
              {[personalInfo.email, personalInfo.phone, personalInfo.location]
                .filter(Boolean)
                .join("  •  ")}
            </Text>
            <View style={styles.contactLinks}>
              {personalInfo.linkedinUrl && (
                <Link src={personalInfo.linkedinUrl} style={styles.link}>
                  linkedin
                </Link>
              )}
              {personalInfo.githubUrl && (
                <Link src={personalInfo.githubUrl} style={styles.link}>
                  github
                </Link>
              )}
              {personalInfo.websiteUrl && (
                <Link src={personalInfo.websiteUrl} style={styles.link}>
                  website
                </Link>
              )}
            </View>
          </View>
        )}

        {/* Summary */}
        {content.summary && (
          <View style={styles.section}>
            <Text style={styles.text}>{content.summary}</Text>
          </View>
        )}

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
  const sectionContent = section.content;

  switch (section.type) {
    case "summary":
      return <SummarySection content={sectionContent} />;
    case "experience":
      return <ExperienceSection content={sectionContent} />;
    case "education":
      return <EducationSection content={sectionContent} />;
    case "skills":
      return <SkillsSection content={sectionContent} />;
    case "projects":
      return <ProjectsSection content={sectionContent} />;
    default:
      return <GenericSection content={sectionContent} />;
  }
}

function SummarySection({ content }: { content: unknown }) {
  if (!content) return null;
  const text = typeof content === "string" ? content : (content as { text?: string }).text;
  return <Text style={styles.text}>{text || ""}</Text>;
}

function ExperienceSection({ content }: { content: unknown }) {
  const entries = (Array.isArray(content) ? content : []) as Array<{
    id?: string;
    company?: string;
    position?: string;
    location?: string;
    startDate?: string;
    endDate?: string;
    isCurrent?: boolean;
    highlights?: string[];
  }>;
  return (
    <View>
      {entries.map((entry, idx) => (
        <View key={entry.id || idx} style={styles.entry}>
          <View style={styles.entryHeader}>
            <View>
              <Text style={styles.entryTitle}>{entry.position || ""}</Text>
              <Text style={styles.entrySubtitle}>{entry.company}</Text>
            </View>
            <Text style={styles.entryDate}>
              {formatDateRange(entry.startDate, entry.endDate, entry.isCurrent)}
            </Text>
          </View>
          {entry.highlights && entry.highlights.length > 0 && (
            <View style={styles.bulletList}>
              {entry.highlights.map((highlight, i) => (
                <Text key={i} style={styles.bullet}>
                  – {highlight}
                </Text>
              ))}
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

function EducationSection({ content }: { content: unknown }) {
  const entries = (Array.isArray(content) ? content : []) as Array<{
    id?: string;
    institution?: string;
    degree?: string;
    field?: string;
    startDate?: string;
    endDate?: string;
    gpa?: string;
  }>;
  return (
    <View>
      {entries.map((entry, idx) => (
        <View key={entry.id || idx} style={styles.entry}>
          <View style={styles.entryHeader}>
            <View>
              <Text style={styles.entryTitle}>
                {entry.degree}
                {entry.field && `, ${entry.field}`}
              </Text>
              <Text style={styles.entrySubtitle}>{entry.institution}</Text>
            </View>
            <Text style={styles.entryDate}>{formatDateRange(entry.startDate, entry.endDate)}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function SkillsSection({ content }: { content: unknown }) {
  const categories = (content as { categories?: Array<{ name: string; skills: string[] }> })
    ?.categories;

  if (categories && Array.isArray(categories)) {
    const allSkills = categories.flatMap((c) => c.skills);
    return <Text style={styles.skillsText}>{allSkills.join("  •  ")}</Text>;
  }

  const items = (Array.isArray(content) ? content : []) as Array<{
    skills?: string[];
  }>;
  const allSkills = items.flatMap((item) => item.skills || []);
  return <Text style={styles.skillsText}>{allSkills.join("  •  ")}</Text>;
}

function ProjectsSection({ content }: { content: unknown }) {
  const entries = (Array.isArray(content) ? content : []) as Array<{
    id?: string;
    name?: string;
    description?: string;
    technologies?: string[];
  }>;
  return (
    <View>
      {entries.map((entry, idx) => (
        <View key={entry.id || idx} style={styles.entry}>
          <Text style={styles.entryTitle}>{entry.name || ""}</Text>
          {entry.description && <Text style={styles.text}>{entry.description}</Text>}
          {entry.technologies && entry.technologies.length > 0 && (
            <Text style={styles.entrySubtitle}>{entry.technologies.join(", ")}</Text>
          )}
        </View>
      ))}
    </View>
  );
}

function GenericSection({ content }: { content: unknown }) {
  const entries = (Array.isArray(content) ? content : []) as Array<{
    id?: string;
    title?: string;
    name?: string;
    subtitle?: string;
    description?: string;
    date?: string;
    issuer?: string;
    language?: string;
    proficiency?: string;
  }>;
  return (
    <View>
      {entries.map((entry, idx) => (
        <View key={entry.id || idx} style={styles.entry}>
          {(entry.title || entry.name || entry.language) && (
            <View style={styles.entryHeader}>
              <Text style={styles.entryTitle}>
                {entry.title || entry.name || entry.language || ""}
                {entry.proficiency && ` (${entry.proficiency})`}
              </Text>
              {entry.date && <Text style={styles.entryDate}>{formatDate(entry.date)}</Text>}
            </View>
          )}
          {(entry.subtitle || entry.issuer) && (
            <Text style={styles.entrySubtitle}>{entry.subtitle || entry.issuer}</Text>
          )}
          {entry.description && <Text style={styles.text}>{entry.description}</Text>}
        </View>
      ))}
    </View>
  );
}
