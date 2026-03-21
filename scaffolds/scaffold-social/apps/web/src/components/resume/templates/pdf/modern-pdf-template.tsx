import { Document, Page, Text, View, StyleSheet, Link } from "@react-pdf/renderer";
import type { ResumeContent, ResumeSection } from "@scaffold-social/database/schema/resumes";

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
  skillCategory: {
    marginBottom: 6,
  },
  skillCategoryName: {
    fontSize: 10,
    fontWeight: "bold",
    marginBottom: 2,
  },
  text: {
    fontSize: 10,
    color: "#333",
  },
});

interface ModernPdfTemplateProps {
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
  return `${startStr} - ${endStr}`;
}

export function ModernPdfTemplate({ content }: ModernPdfTemplateProps) {
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
                .join(" | ")}
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
            <Text style={styles.sectionTitle}>Summary</Text>
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

interface SectionContentProps {
  section: ResumeSection;
}

function SectionContent({ section }: SectionContentProps) {
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
    case "awards":
      return <AwardsSection content={sectionContent} />;
    case "publications":
      return <PublicationsSection content={sectionContent} />;
    case "volunteer":
      return <VolunteerSection content={sectionContent} />;
    case "custom":
      return <CustomSection content={sectionContent} />;
    default:
      return null;
  }
}

function SummarySection({ content }: { content: unknown }) {
  if (!content) return null;
  const text = typeof content === "string" ? content : (content as { text?: string }).text;
  return <Text style={styles.text}>{text || ""}</Text>;
}

interface ExperienceItem {
  id?: string;
  company?: string;
  position?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  isCurrent?: boolean;
  description?: string;
  highlights?: string[];
}

function ExperienceSection({ content }: { content: unknown }) {
  const entries = (Array.isArray(content) ? content : []) as ExperienceItem[];
  return (
    <View>
      {entries.map((entry, idx) => (
        <View key={entry.id || idx} style={styles.entry}>
          <View style={styles.entryHeader}>
            <View>
              <Text style={styles.entryTitle}>{entry.position || ""}</Text>
              <Text style={styles.entrySubtitle}>
                {entry.company}
                {entry.location && ` • ${entry.location}`}
              </Text>
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

interface EducationItem {
  id?: string;
  institution?: string;
  degree?: string;
  field?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  gpa?: string;
}

function EducationSection({ content }: { content: unknown }) {
  const entries = (Array.isArray(content) ? content : []) as EducationItem[];
  return (
    <View>
      {entries.map((entry, idx) => (
        <View key={entry.id || idx} style={styles.entry}>
          <View style={styles.entryHeader}>
            <View>
              <Text style={styles.entryTitle}>{entry.institution || ""}</Text>
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

interface SkillCategory {
  name: string;
  skills: string[];
}

function SkillsSection({ content }: { content: unknown }) {
  // Skills can be { categories: [...] } or array of skill items
  const categories = (content as { categories?: SkillCategory[] })?.categories;

  if (categories && Array.isArray(categories)) {
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

  // Fallback for array format
  const items = (Array.isArray(content) ? content : []) as Array<{
    category?: string;
    skills?: string[];
  }>;
  return (
    <View>
      {items.map((item, idx) => (
        <View key={idx} style={styles.skillCategory}>
          {item.category && <Text style={styles.skillCategoryName}>{item.category}:</Text>}
          <Text style={styles.text}>{item.skills?.join(", ") || ""}</Text>
        </View>
      ))}
    </View>
  );
}

interface ProjectItem {
  id?: string;
  name?: string;
  url?: string;
  description?: string;
  technologies?: string[];
}

function ProjectsSection({ content }: { content: unknown }) {
  const entries = (Array.isArray(content) ? content : []) as ProjectItem[];
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

interface CertificationItem {
  id?: string;
  name?: string;
  issuer?: string;
  issueDate?: string;
  date?: string;
}

function CertificationsSection({ content }: { content: unknown }) {
  const entries = (Array.isArray(content) ? content : []) as CertificationItem[];
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

interface LanguageItem {
  language?: string;
  proficiency?: string;
}

function LanguagesSection({ content }: { content: unknown }) {
  const entries = (Array.isArray(content) ? content : []) as LanguageItem[];
  return (
    <Text style={styles.text}>
      {entries.map((entry) => `${entry.language} (${entry.proficiency})`).join(" • ")}
    </Text>
  );
}

interface AwardItem {
  id?: string;
  title?: string;
  issuer?: string;
  date?: string;
}

function AwardsSection({ content }: { content: unknown }) {
  const entries = (Array.isArray(content) ? content : []) as AwardItem[];
  return (
    <View>
      {entries.map((entry, idx) => (
        <View key={entry.id || idx} style={styles.entry}>
          <View style={styles.entryHeader}>
            <Text style={styles.entryTitle}>{entry.title || ""}</Text>
            {entry.date && <Text style={styles.entryDate}>{formatDate(entry.date)}</Text>}
          </View>
          {entry.issuer && <Text style={styles.entrySubtitle}>{entry.issuer}</Text>}
        </View>
      ))}
    </View>
  );
}

interface PublicationItem {
  id?: string;
  title?: string;
  publisher?: string;
  date?: string;
}

function PublicationsSection({ content }: { content: unknown }) {
  const entries = (Array.isArray(content) ? content : []) as PublicationItem[];
  return (
    <View>
      {entries.map((entry, idx) => (
        <View key={entry.id || idx} style={styles.entry}>
          <View style={styles.entryHeader}>
            <Text style={styles.entryTitle}>{entry.title || ""}</Text>
            {entry.date && <Text style={styles.entryDate}>{formatDate(entry.date)}</Text>}
          </View>
          {entry.publisher && <Text style={styles.entrySubtitle}>{entry.publisher}</Text>}
        </View>
      ))}
    </View>
  );
}

interface VolunteerItem {
  id?: string;
  role?: string;
  organization?: string;
  startDate?: string;
  endDate?: string;
}

function VolunteerSection({ content }: { content: unknown }) {
  const entries = (Array.isArray(content) ? content : []) as VolunteerItem[];
  return (
    <View>
      {entries.map((entry, idx) => (
        <View key={entry.id || idx} style={styles.entry}>
          <View style={styles.entryHeader}>
            <View>
              <Text style={styles.entryTitle}>{entry.role || ""}</Text>
              {entry.organization && <Text style={styles.entrySubtitle}>{entry.organization}</Text>}
            </View>
            <Text style={styles.entryDate}>{formatDateRange(entry.startDate, entry.endDate)}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

interface CustomItem {
  id?: string;
  title?: string;
  subtitle?: string;
  description?: string;
}

function CustomSection({ content }: { content: unknown }) {
  const entries = (Array.isArray(content) ? content : []) as CustomItem[];
  return (
    <View>
      {entries.map((entry, idx) => (
        <View key={entry.id || idx} style={styles.entry}>
          {entry.title && <Text style={styles.entryTitle}>{entry.title}</Text>}
          {entry.subtitle && <Text style={styles.entrySubtitle}>{entry.subtitle}</Text>}
          {entry.description && <Text style={styles.text}>{entry.description}</Text>}
        </View>
      ))}
    </View>
  );
}
