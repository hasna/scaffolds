import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  jsonb,
  integer,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { tenants } from "./tenants";
import { users } from "./users";

export const resumes = pgTable("resumes", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }),
  isPublic: boolean("is_public").notNull().default(false),
  isMaster: boolean("is_master").notNull().default(false),
  parentResumeId: uuid("parent_resume_id"),
  targetJobTitle: varchar("target_job_title", { length: 255 }),
  targetJobUrl: text("target_job_url"),
  content: jsonb("content").notNull().$type<ResumeContent>(),
  template: varchar("template", { length: 50 }).notNull().default("modern"),
  theme: jsonb("theme").$type<ResumeTheme>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const resumeSections = pgTable("resume_sections", {
  id: uuid("id").primaryKey().defaultRandom(),
  resumeId: uuid("resume_id")
    .notNull()
    .references(() => resumes.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 50 }).notNull(),
  title: varchar("title", { length: 255 }),
  content: jsonb("content").notNull().$type<SectionContent>(),
  orderIndex: integer("order_index").notNull(),
  isVisible: boolean("is_visible").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const resumesRelations = relations(resumes, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [resumes.tenantId],
    references: [tenants.id],
  }),
  user: one(users, {
    fields: [resumes.userId],
    references: [users.id],
  }),
  parentResume: one(resumes, {
    fields: [resumes.parentResumeId],
    references: [resumes.id],
    relationName: "resumeVariants",
  }),
  variants: many(resumes, {
    relationName: "resumeVariants",
  }),
  sections: many(resumeSections),
}));

export const resumeSectionsRelations = relations(resumeSections, ({ one }) => ({
  resume: one(resumes, {
    fields: [resumeSections.resumeId],
    references: [resumes.id],
  }),
}));

// Resume content types
export interface ResumeContent {
  personalInfo?: PersonalInfo;
  contact?: PersonalInfo; // Alias for personalInfo
  summary?: string;
  sections: ResumeSection[];
}

// Alias for backwards compatibility
export type ContactInfo = PersonalInfo;

export interface PersonalInfo {
  fullName?: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
  websiteUrl?: string;
}

export type ResumeSectionType =
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

export type ResumeSectionItemContent =
  | ExperienceItem
  | EducationItem
  | SkillItem
  | ProjectItem
  | CertificationItem
  | LanguageItem
  | AwardItem
  | PublicationItem
  | VolunteerItem
  | CustomItem;

export interface ResumeSection {
  id: string;
  type: ResumeSectionType;
  title: string;
  order: number;
  visible: boolean;
  content: SectionContentType;
}

// Flexible content type to support various section content structures
export type SectionContentType =
  | { text: string } // Summary
  | { categories: Array<{ name: string; skills: string[] }> } // Skills
  | ResumeSectionItemContent[] // Experience, Education, Projects, etc.
  | Record<string, unknown>; // Fallback for other content types

export interface ResumeSectionItem {
  id: string;
  content: ResumeSectionItemContent;
}

export interface ExperienceItem {
  type: "experience";
  company: string;
  position: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  isCurrent?: boolean;
  description?: string;
  highlights?: string[];
}

export interface EducationItem {
  type: "education";
  institution: string;
  degree: string;
  field?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  gpa?: string;
  description?: string;
  highlights?: string[];
}

export interface SkillItem {
  type: "skills";
  category?: string;
  skills: string[];
  level?: "beginner" | "intermediate" | "advanced" | "expert";
}

export interface ProjectItem {
  type: "projects";
  name: string;
  url?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
  highlights?: string[];
  technologies?: string[];
}

export interface CertificationItem {
  type: "certifications";
  name: string;
  issuer: string;
  issueDate?: string;
  expirationDate?: string;
  credentialId?: string;
  credentialUrl?: string;
}

export interface LanguageItem {
  type: "languages";
  language: string;
  proficiency: "native" | "fluent" | "professional" | "intermediate" | "basic";
}

export interface AwardItem {
  type: "awards";
  title: string;
  issuer: string;
  date?: string;
  description?: string;
}

export interface PublicationItem {
  type: "publications";
  title: string;
  publisher?: string;
  date?: string;
  url?: string;
  description?: string;
}

export interface VolunteerItem {
  type: "volunteer";
  organization: string;
  role: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
  highlights?: string[];
}

export interface CustomItem {
  type: "custom";
  title?: string;
  subtitle?: string;
  date?: string;
  description?: string;
  highlights?: string[];
}

// Resume theme types
export interface ResumeTheme {
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
  fontSize?: "small" | "medium" | "large";
  spacing?: "compact" | "normal" | "relaxed";
  headerStyle?: "classic" | "modern" | "minimal";
}

// Section content type (discriminated union for each section type)
export type SectionContent =
  | SummaryContent
  | ExperienceContent
  | EducationContent
  | SkillsContent
  | ProjectsContent
  | CertificationsContent
  | LanguagesContent
  | AwardsContent
  | PublicationsContent
  | VolunteerContent
  | CustomContent;

export interface SummaryContent {
  type: "summary";
  text: string;
}

export interface ExperienceContent {
  type: "experience";
  items: ExperienceItem[];
}

export interface EducationContent {
  type: "education";
  items: EducationItem[];
}

export interface SkillsContent {
  type: "skills";
  items: SkillItem[];
}

export interface ProjectsContent {
  type: "projects";
  items: ProjectItem[];
}

export interface CertificationsContent {
  type: "certifications";
  items: CertificationItem[];
}

export interface LanguagesContent {
  type: "languages";
  items: LanguageItem[];
}

export interface AwardsContent {
  type: "awards";
  items: AwardItem[];
}

export interface PublicationsContent {
  type: "publications";
  items: PublicationItem[];
}

export interface VolunteerContent {
  type: "volunteer";
  items: VolunteerItem[];
}

export interface CustomContent {
  type: "custom";
  items: CustomItem[];
}

export type Resume = typeof resumes.$inferSelect;
export type NewResume = typeof resumes.$inferInsert;
export type ResumeSectionRecord = typeof resumeSections.$inferSelect;
export type NewResumeSectionRecord = typeof resumeSections.$inferInsert;
