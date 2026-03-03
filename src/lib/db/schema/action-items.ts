import {
  pgTable,
  uuid,
  varchar,
  text,
  date,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { tenants } from "./tenants";
import { sessions } from "./sessions";
import { users } from "./users";
import { actionItemStatusEnum } from "./enums";

export const actionItems = pgTable(
  "action_item",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => sessions.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    assigneeId: uuid("assignee_id")
      .notNull()
      .references(() => users.id),
    createdById: uuid("created_by_id")
      .notNull()
      .references(() => users.id),
    title: varchar("title", { length: 500 }).notNull(),
    description: text("description"),
    dueDate: date("due_date"),
    status: actionItemStatusEnum("status").notNull().default("open"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    carriedToSessionId: uuid("carried_to_session_id").references(
      () => sessions.id
    ),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("action_item_tenant_assignee_status_idx").on(
      table.tenantId,
      table.assigneeId,
      table.status
    ),
    index("action_item_session_idx").on(table.sessionId),
    index("action_item_tenant_status_due_idx").on(
      table.tenantId,
      table.status,
      table.dueDate
    ),
  ]
);

export const actionItemsRelations = relations(actionItems, ({ one }) => ({
  session: one(sessions, {
    fields: [actionItems.sessionId],
    references: [sessions.id],
    relationName: "sessionActionItems",
  }),
  tenant: one(tenants, {
    fields: [actionItems.tenantId],
    references: [tenants.id],
  }),
  assignee: one(users, {
    fields: [actionItems.assigneeId],
    references: [users.id],
    relationName: "assignedActionItems",
  }),
  createdBy: one(users, {
    fields: [actionItems.createdById],
    references: [users.id],
    relationName: "createdActionItems",
  }),
  carriedToSession: one(sessions, {
    fields: [actionItems.carriedToSessionId],
    references: [sessions.id],
    relationName: "carriedActionItems",
  }),
}));
