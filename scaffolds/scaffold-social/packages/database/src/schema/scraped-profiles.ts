import { pgTable, uuid, varchar, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { tenants } from "./tenants";

export const scrapedProfiles = pgTable("scraped_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id),
  url: text("url").notNull(),
  source: varchar("source", { length: 50 }),
  rawData: jsonb("raw_data"),
  extractedData: jsonb("extracted_data").$type<ExtractedProfileData>(),
  scrapedAt: timestamp("scraped_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
});

export const scrapedProfilesRelations = relations(scrapedProfiles, ({ one }) => ({
  tenant: one(tenants, {
    fields: [scrapedProfiles.tenantId],
    references: [tenants.id],
  }),
}));

// Extracted profile data normalized to match resume content structure
export interface ExtractedProfileData {
  source: "linkedin" | "github" | "website" | "other";
  personalInfo?: ExtractedPersonalInfo;
  summary?: string;
  experience?: ExtractedExperience[];
  education?: ExtractedEducation[];
  skills?: string[];
  projects?: ExtractedProject[];
  certifications?: ExtractedCertification[];
  languages?: ExtractedLanguage[];
  publications?: ExtractedPublication[];
  rawText?: string;
}

export interface ExtractedPersonalInfo {
  fullName?: string;
  headline?: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  websiteUrl?: string;
  avatarUrl?: string;
}

export interface ExtractedExperience {
  company: string;
  position: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  isCurrent?: boolean;
  description?: string;
}

export interface ExtractedEducation {
  institution: string;
  degree?: string;
  field?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
}

export interface ExtractedProject {
  name: string;
  description?: string;
  url?: string;
  technologies?: string[];
  stars?: number;
  forks?: number;
}

export interface ExtractedCertification {
  name: string;
  issuer?: string;
  date?: string;
  url?: string;
}

export interface ExtractedLanguage {
  language: string;
  proficiency?: string;
}

export interface ExtractedPublication {
  title: string;
  publisher?: string;
  date?: string;
  url?: string;
}

export type ScrapedProfile = typeof scrapedProfiles.$inferSelect;
export type NewScrapedProfile = typeof scrapedProfiles.$inferInsert;
