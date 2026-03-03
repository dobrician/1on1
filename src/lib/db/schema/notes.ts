import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { sessions } from "./sessions";
import { users } from "./users";

export const privateNotes = pgTable(
  "private_note",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => sessions.id),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id),
    content: text("content").notNull(),
    keyVersion: integer("key_version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("private_note_session_author_idx").on(
      table.sessionId,
      table.authorId
    ),
  ]
);

export const privateNotesRelations = relations(privateNotes, ({ one }) => ({
  session: one(sessions, {
    fields: [privateNotes.sessionId],
    references: [sessions.id],
  }),
  author: one(users, {
    fields: [privateNotes.authorId],
    references: [users.id],
  }),
}));

export const talkingPoints = pgTable("talking_point", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => sessions.id),
  authorId: uuid("author_id")
    .notNull()
    .references(() => users.id),
  content: text("content").notNull(),
  sortOrder: integer("sort_order").notNull(),
  isDiscussed: boolean("is_discussed").notNull().default(false),
  discussedAt: timestamp("discussed_at", { withTimezone: true }),
  carriedFromSessionId: uuid("carried_from_session_id").references(
    () => sessions.id
  ),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const talkingPointsRelations = relations(talkingPoints, ({ one }) => ({
  session: one(sessions, {
    fields: [talkingPoints.sessionId],
    references: [sessions.id],
    relationName: "sessionTalkingPoints",
  }),
  author: one(users, {
    fields: [talkingPoints.authorId],
    references: [users.id],
  }),
  carriedFromSession: one(sessions, {
    fields: [talkingPoints.carriedFromSessionId],
    references: [sessions.id],
    relationName: "carriedTalkingPoints",
  }),
}));
