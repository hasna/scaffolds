import { pgTable, uuid, varchar, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { tenants } from "./tenants";

export const jobPostings = pgTable("job_postings", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id),
  url: text("url"),
  title: varchar("title", { length: 255 }),
  company: varchar("company", { length: 255 }),
  location: varchar("location", { length: 255 }),
  description: text("description"),
  requirements: jsonb("requirements").$type<string[]>(),
  keywords: jsonb("keywords").$type<string[]>(),
  salary: varchar("salary", { length: 255 }),
  employmentType: varchar("employment_type", { length: 50 }),
  experienceLevel: varchar("experience_level", { length: 50 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const jobPostingsRelations = relations(jobPostings, ({ one }) => ({
  tenant: one(tenants, {
    fields: [jobPostings.tenantId],
    references: [tenants.id],
  }),
}));

export type JobPosting = typeof jobPostings.$inferSelect;
export type NewJobPosting = typeof jobPostings.$inferInsert;
