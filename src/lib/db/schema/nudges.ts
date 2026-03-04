import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { tenants } from "./tenants";
import { meetingSeries } from "./series";
import { sessions } from "./sessions";

export const aiNudges = pgTable(
  "ai_nudge",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    seriesId: uuid("series_id")
      .notNull()
      .references(() => meetingSeries.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    targetSessionAt: timestamp("target_session_at", { withTimezone: true }),
    content: text("content").notNull(),
    reason: text("reason"),
    priority: text("priority")
      .$type<"high" | "medium" | "low">()
      .default("medium"),
    sourceSessionId: uuid("source_session_id").references(() => sessions.id),
    isDismissed: boolean("is_dismissed").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    refreshedAt: timestamp("refreshed_at", { withTimezone: true }),
  },
  (table) => [
    index("ai_nudge_series_target_idx").on(
      table.seriesId,
      table.targetSessionAt
    ),
    index("ai_nudge_tenant_dismissed_idx").on(
      table.tenantId,
      table.isDismissed
    ),
  ]
);

export const aiNudgesRelations = relations(aiNudges, ({ one }) => ({
  series: one(meetingSeries, {
    fields: [aiNudges.seriesId],
    references: [meetingSeries.id],
  }),
  tenant: one(tenants, {
    fields: [aiNudges.tenantId],
    references: [tenants.id],
  }),
  sourceSession: one(sessions, {
    fields: [aiNudges.sourceSessionId],
    references: [sessions.id],
  }),
}));
