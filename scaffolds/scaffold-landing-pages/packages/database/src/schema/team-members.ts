import { pgTable, uuid, varchar, text, timestamp, pgEnum, unique } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { tenants } from "./tenants";
import { users } from "./users";

export const teamRoleEnum = pgEnum("team_role", ["member", "manager", "owner"]);

export const teamMembers = pgTable(
  "team_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: teamRoleEnum("role").notNull().default("member"),
    invitedBy: uuid("invited_by").references(() => users.id, { onDelete: "set null" }),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uniqueTenantUser: unique("unique_tenant_user").on(table.tenantId, table.userId),
  })
);

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  tenant: one(tenants, {
    fields: [teamMembers.tenantId],
    references: [tenants.id],
  }),
  user: one(users, {
    fields: [teamMembers.userId],
    references: [users.id],
  }),
  inviter: one(users, {
    fields: [teamMembers.invitedBy],
    references: [users.id],
  }),
}));

export const teamInvitations = pgTable("team_invitations", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  email: varchar("email", { length: 255 }).notNull(),
  role: teamRoleEnum("role").notNull().default("member"),
  token: text("token").notNull().unique(),
  invitedBy: uuid("invited_by")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const teamInvitationsRelations = relations(teamInvitations, ({ one }) => ({
  tenant: one(tenants, {
    fields: [teamInvitations.tenantId],
    references: [tenants.id],
  }),
  inviter: one(users, {
    fields: [teamInvitations.invitedBy],
    references: [users.id],
  }),
}));

export type TeamMember = typeof teamMembers.$inferSelect;
export type NewTeamMember = typeof teamMembers.$inferInsert;
export type TeamRole = "member" | "manager" | "owner";
export type TeamInvitation = typeof teamInvitations.$inferSelect;
export type NewTeamInvitation = typeof teamInvitations.$inferInsert;
