import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  pgEnum,
  unique,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";

// ─── Enums ───────────────────────────────────────────────────────────────────

export const competitionStatusEnum = pgEnum("competition_status", [
  "draft",
  "open",
  "judging",
  "closed",
]);

export const teamMemberRoleEnum = pgEnum("team_member_role", [
  "leader",
  "member",
]);

export const submissionStatusEnum = pgEnum("submission_status", [
  "draft",
  "submitted",
  "approved",
  "disqualified",
]);

// ─── competitions ─────────────────────────────────────────────────────────────

export const competitions = pgTable(
  "competitions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: varchar("title", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull().unique(),
    description: text("description").notNull(),
    rules: text("rules").notNull(),
    prizes: text("prizes").notNull(),
    status: competitionStatusEnum("status").notNull().default("draft"),
    startDate: timestamp("start_date", { withTimezone: true }).notNull(),
    endDate: timestamp("end_date", { withTimezone: true }).notNull(),
    submissionDeadline: timestamp("submission_deadline", {
      withTimezone: true,
    }).notNull(),
    maxTeamSize: integer("max_team_size").notNull().default(4),
    organizerId: uuid("organizer_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    bannerImage: text("banner_image"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("competitions_status_idx").on(t.status),
    index("competitions_slug_idx").on(t.slug),
    index("competitions_organizer_id_idx").on(t.organizerId),
  ]
);

export const competitionsRelations = relations(
  competitions,
  ({ one, many }) => ({
    organizer: one(users, {
      fields: [competitions.organizerId],
      references: [users.id],
    }),
    teams: many(teams),
    submissions: many(submissions),
    judges: many(judges),
  })
);

// ─── teams ────────────────────────────────────────────────────────────────────

export const teams = pgTable(
  "teams",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    competitionId: uuid("competition_id")
      .notNull()
      .references(() => competitions.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    leaderId: uuid("leader_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("teams_competition_name_unique").on(t.competitionId, t.name),
    index("teams_competition_id_idx").on(t.competitionId),
    index("teams_leader_id_idx").on(t.leaderId),
  ]
);

export const teamsRelations = relations(teams, ({ one, many }) => ({
  competition: one(competitions, {
    fields: [teams.competitionId],
    references: [competitions.id],
  }),
  leader: one(users, {
    fields: [teams.leaderId],
    references: [users.id],
  }),
  members: many(teamMembers),
  submissions: many(submissions),
}));

// ─── team_members ─────────────────────────────────────────────────────────────

export const teamMembers = pgTable(
  "team_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: teamMemberRoleEnum("role").notNull().default("member"),
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [unique("team_members_team_user_unique").on(t.teamId, t.userId)]
);

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  team: one(teams, {
    fields: [teamMembers.teamId],
    references: [teams.id],
  }),
  user: one(users, {
    fields: [teamMembers.userId],
    references: [users.id],
  }),
}));

// ─── submissions ──────────────────────────────────────────────────────────────

export const submissions = pgTable(
  "submissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    competitionId: uuid("competition_id")
      .notNull()
      .references(() => competitions.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description").notNull(),
    projectUrl: text("project_url").notNull(),
    demoUrl: text("demo_url"),
    repoUrl: text("repo_url"),
    status: submissionStatusEnum("status").notNull().default("draft"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("submissions_team_id_idx").on(t.teamId),
    index("submissions_competition_id_idx").on(t.competitionId),
    index("submissions_status_idx").on(t.status),
  ]
);

export const submissionsRelations = relations(submissions, ({ one, many }) => ({
  team: one(teams, {
    fields: [submissions.teamId],
    references: [teams.id],
  }),
  competition: one(competitions, {
    fields: [submissions.competitionId],
    references: [competitions.id],
  }),
  scores: many(scores),
}));

// ─── judges ───────────────────────────────────────────────────────────────────

export const judges = pgTable(
  "judges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    competitionId: uuid("competition_id")
      .notNull()
      .references(() => competitions.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("judges_competition_user_unique").on(t.competitionId, t.userId),
  ]
);

export const judgesRelations = relations(judges, ({ one }) => ({
  competition: one(competitions, {
    fields: [judges.competitionId],
    references: [competitions.id],
  }),
  user: one(users, {
    fields: [judges.userId],
    references: [users.id],
  }),
}));

// ─── scores ───────────────────────────────────────────────────────────────────

export const scores = pgTable(
  "scores",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    submissionId: uuid("submission_id")
      .notNull()
      .references(() => submissions.id, { onDelete: "cascade" }),
    judgeId: uuid("judge_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    score: integer("score").notNull(), // 1-10
    feedback: text("feedback"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("scores_submission_judge_unique").on(t.submissionId, t.judgeId),
  ]
);

export const scoresRelations = relations(scores, ({ one }) => ({
  submission: one(submissions, {
    fields: [scores.submissionId],
    references: [submissions.id],
  }),
  judge: one(users, {
    fields: [scores.judgeId],
    references: [users.id],
  }),
}));

// ─── Types ────────────────────────────────────────────────────────────────────

export type Competition = typeof competitions.$inferSelect;
export type NewCompetition = typeof competitions.$inferInsert;
export type CompetitionStatus = "draft" | "open" | "judging" | "closed";

export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;

export type TeamMember = typeof teamMembers.$inferSelect;
export type NewTeamMember = typeof teamMembers.$inferInsert;
export type TeamMemberRole = "leader" | "member";

export type Submission = typeof submissions.$inferSelect;
export type NewSubmission = typeof submissions.$inferInsert;
export type SubmissionStatus = "draft" | "submitted" | "approved" | "disqualified";

export type Judge = typeof judges.$inferSelect;
export type NewJudge = typeof judges.$inferInsert;

export type Score = typeof scores.$inferSelect;
export type NewScore = typeof scores.$inferInsert;
