import {
  pgTable,
  uuid,
  integer,
  text,
  decimal,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { tenants } from "./tenants";
import { meetingSeries } from "./series";
import { questionnaireTemplates } from "./templates";
import { sessionStatusEnum } from "./enums";

export const sessions = pgTable(
  "session",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    seriesId: uuid("series_id")
      .notNull()
      .references(() => meetingSeries.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    templateId: uuid("template_id").references(
      () => questionnaireTemplates.id
    ),
    sessionNumber: integer("session_number").notNull(),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    status: sessionStatusEnum("status").notNull().default("scheduled"),
    sharedNotes: text("shared_notes"),
    durationMinutes: integer("duration_minutes"),
    sessionScore: decimal("session_score", { precision: 4, scale: 2 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("session_series_scheduled_idx").on(
      table.seriesId,
      table.scheduledAt
    ),
    index("session_tenant_status_scheduled_idx").on(
      table.tenantId,
      table.status,
      table.scheduledAt
    ),
    index("session_tenant_scheduled_idx").on(
      table.tenantId,
      table.scheduledAt
    ),
  ]
);

export const sessionsRelations = relations(sessions, ({ one, many }) => ({
  series: one(meetingSeries, {
    fields: [sessions.seriesId],
    references: [meetingSeries.id],
  }),
  tenant: one(tenants, {
    fields: [sessions.tenantId],
    references: [tenants.id],
  }),
  template: one(questionnaireTemplates, {
    fields: [sessions.templateId],
    references: [questionnaireTemplates.id],
  }),
  answers: many(sessionAnswers),
  privateNotes: many(privateNotes),
  talkingPoints: many(talkingPoints),
  actionItems: many(actionItems),
}));

// Forward references - resolved after modules load
import { sessionAnswers } from "./answers";
import { privateNotes, talkingPoints } from "./notes";
import { actionItems } from "./action-items";
