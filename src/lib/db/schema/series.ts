import {
  pgTable,
  uuid,
  integer,
  timestamp,
  time,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { tenants } from "./tenants";
import { users } from "./users";
import { questionnaireTemplates } from "./templates";
import {
  cadenceEnum,
  preferredDayEnum,
  seriesStatusEnum,
} from "./enums";

export const meetingSeries = pgTable(
  "meeting_series",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    managerId: uuid("manager_id")
      .notNull()
      .references(() => users.id),
    reportId: uuid("report_id")
      .notNull()
      .references(() => users.id),
    cadence: cadenceEnum("cadence").notNull().default("biweekly"),
    cadenceCustomDays: integer("cadence_custom_days"),
    defaultDurationMinutes: integer("default_duration_minutes")
      .notNull()
      .default(30),
    defaultTemplateId: uuid("default_template_id").references(
      () => questionnaireTemplates.id
    ),
    preferredDay: preferredDayEnum("preferred_day"),
    preferredTime: time("preferred_time"),
    status: seriesStatusEnum("status").notNull().default("active"),
    reminderHoursBefore: integer("reminder_hours_before").notNull().default(24),
    nextSessionAt: timestamp("next_session_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("meeting_series_tenant_manager_report_idx").on(
      table.tenantId,
      table.managerId,
      table.reportId
    ),
    index("meeting_series_tenant_status_idx").on(
      table.tenantId,
      table.status
    ),
    index("meeting_series_next_session_idx").on(table.nextSessionAt),
  ]
);

export const meetingSeriesRelations = relations(
  meetingSeries,
  ({ one, many }) => ({
    tenant: one(tenants, {
      fields: [meetingSeries.tenantId],
      references: [tenants.id],
    }),
    manager: one(users, {
      fields: [meetingSeries.managerId],
      references: [users.id],
      relationName: "managedSeries",
    }),
    report: one(users, {
      fields: [meetingSeries.reportId],
      references: [users.id],
      relationName: "reportSeries",
    }),
    defaultTemplate: one(questionnaireTemplates, {
      fields: [meetingSeries.defaultTemplateId],
      references: [questionnaireTemplates.id],
    }),
    sessions: many(sessions),
  })
);

// Forward reference - resolved after sessions module loads
import { sessions } from "./sessions";
