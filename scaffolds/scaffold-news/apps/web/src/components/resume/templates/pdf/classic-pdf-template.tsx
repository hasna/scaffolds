import { Document, Page, Text, View, StyleSheet, Link } from "@react-pdf/renderer";
import type { ResumeContent, ResumeSection } from "@scaffold-news/database/schema/resumes";

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
    fontWeight: "bold",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 2,
  },
  contactInfo: {
    fontSize: 10,
    color: "#333",
  },
  contactLinks: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 15,
    marginTop: 6,
    fontSize: 10,
  },
  link: {
    color: "#000",
    textDecoration: "underline",
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: "#000",
    paddingBottom: 4,
    textTransform: "uppercase",
  },
  entry: {
    marginBottom: 10,
  },
  entryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  entryTitle: {
    fontSize: 11,
    fontWeight: "bold",
  },
  entrySubtitle: {
    fontSize: 10,
    fontStyle: "italic",
  },
  entryDate: {
    fontSize: 10,
    fontStyle: "italic",
  },
  bulletList: {
    marginTop: 4,
    paddingLeft: 15,
  },
  bullet: {
    fontSize: 10,
    marginBottom: 2,
  },
  text: {
    fontSize: 10,
  },
  skillRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  skillLabel: {
    fontSize: 10,
    fontWeight: "bold",
    width: 100,
  },
  skillValue: {
    fontSize: 10,
    flex: 1,
  },
});

interface ClassicPdfTemplateProps {
  content: ResumeContent;
  title: string;
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
  return `${startStr} - ${endStr}`;
}

export function ClassicPdfTemplate({ content }: ClassicPdfTemplateProps) {
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
                .join(" • ")}
            </Text>
            <View style={styles.contactLinks}>
              {personalInfo.linkedinUrl && (
                <Link src={personalInfo.linkedinUrl} style={styles.link}>
                  LinkedIn
                </Link>
              )}
              {personalInfo.githubUrl && (
                <Link src={personalInfo.githubUrl} style={styles.link}>
                  GitHub
                </Link>
              )}
              {personalInfo.websiteUrl && (
                <Link src={personalInfo.websiteUrl} style={styles.link}>
                  Website
                </Link>
              )}
            </View>
          </View>
        )}

        {/* Summary */}
        {content.summary && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Professional Summary</Text>
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
    case "certifications":
      return <CertificationsSection content={sectionContent} />;
    case "languages":
      return <LanguagesSection content={sectionContent} />;
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
    description?: string;
    highlights?: string[];
  }>;
  return (
    <View>
      {entries.map((entry, idx) => (
        <View key={entry.id || idx} style={styles.entry}>
          <View style={styles.entryHeader}>
            <View>
              <Text style={styles.entryTitle}>
                {entry.position}
                {entry.company && `, ${entry.company}`}
              </Text>
              {entry.location && <Text style={styles.entrySubtitle}>{entry.location}</Text>}
            </View>
            <Text style={styles.entryDate}>
              {formatDateRange(entry.startDate, entry.endDate, entry.isCurrent)}
            </Text>
          </View>
          {entry.description && <Text style={styles.text}>{entry.description}</Text>}
          {entry.highlights && entry.highlights.length > 0 && (
            <View style={styles.bulletList}>
              {entry.highlights.map((highlight, i) => (
                <Text key={i} style={styles.bullet}>
                  • {highlight}
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
              <Text style={styles.entryTitle}>{entry.institution}</Text>
              <Text style={styles.entrySubtitle}>
                {entry.degree}
                {entry.field && ` in ${entry.field}`}
                {entry.gpa && ` | GPA: ${entry.gpa}`}
              </Text>
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
    return (
      <View>
        {categories.map((category, idx) => (
          <View key={idx} style={styles.skillRow}>
            <Text style={styles.skillLabel}>{category.name}:</Text>
            <Text style={styles.skillValue}>{category.skills.join(", ")}</Text>
          </View>
        ))}
      </View>
    );
  }

  const items = (Array.isArray(content) ? content : []) as Array<{
    category?: string;
    skills?: string[];
  }>;
  return (
    <View>
      {items.map((item, idx) => (
        <View key={idx} style={styles.skillRow}>
          {item.category && <Text style={styles.skillLabel}>{item.category}:</Text>}
          <Text style={styles.skillValue}>{item.skills?.join(", ") || ""}</Text>
        </View>
      ))}
    </View>
  );
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
            <Text style={styles.entrySubtitle}>Technologies: {entry.technologies.join(", ")}</Text>
          )}
        </View>
      ))}
    </View>
  );
}

function CertificationsSection({ content }: { content: unknown }) {
  const entries = (Array.isArray(content) ? content : []) as Array<{
    id?: string;
    name?: string;
    issuer?: string;
    issueDate?: string;
    date?: string;
  }>;
  return (
    <View>
      {entries.map((entry, idx) => (
        <View key={entry.id || idx} style={styles.entry}>
          <View style={styles.entryHeader}>
            <Text style={styles.entryTitle}>{entry.name || ""}</Text>
            {(entry.issueDate || entry.date) && (
              <Text style={styles.entryDate}>{formatDate(entry.issueDate || entry.date)}</Text>
            )}
          </View>
          {entry.issuer && <Text style={styles.entrySubtitle}>{entry.issuer}</Text>}
        </View>
      ))}
    </View>
  );
}

function LanguagesSection({ content }: { content: unknown }) {
  const entries = (Array.isArray(content) ? content : []) as Array<{
    language?: string;
    proficiency?: string;
  }>;
  return (
    <Text style={styles.text}>
      {entries.map((entry) => `${entry.language} (${entry.proficiency})`).join(", ")}
    </Text>
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
  }>;
  return (
    <View>
      {entries.map((entry, idx) => (
        <View key={entry.id || idx} style={styles.entry}>
          <View style={styles.entryHeader}>
            <Text style={styles.entryTitle}>{entry.title || entry.name || ""}</Text>
            {entry.date && <Text style={styles.entryDate}>{formatDate(entry.date)}</Text>}
          </View>
          {entry.subtitle && <Text style={styles.entrySubtitle}>{entry.subtitle}</Text>}
          {entry.description && <Text style={styles.text}>{entry.description}</Text>}
        </View>
      ))}
    </View>
  );
}
