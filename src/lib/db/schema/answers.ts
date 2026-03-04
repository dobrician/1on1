import {
  pgTable,
  uuid,
  text,
  decimal,
  jsonb,
  boolean,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { sessions } from "./sessions";
import { templateQuestions } from "./templates";
import { users } from "./users";

export const sessionAnswers = pgTable(
  "session_answer",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => sessions.id),
    questionId: uuid("question_id")
      .notNull()
      .references(() => templateQuestions.id),
    respondentId: uuid("respondent_id")
      .notNull()
      .references(() => users.id),
    answerText: text("answer_text"),
    answerNumeric: decimal("answer_numeric", { precision: 6, scale: 2 }),
    answerJson: jsonb("answer_json"),
    skipped: boolean("skipped").notNull().default(false),
    answeredAt: timestamp("answered_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("session_answer_session_question_unique_idx").on(
      table.sessionId,
      table.questionId
    ),
    index("session_answer_question_respondent_idx").on(
      table.questionId,
      table.respondentId,
      table.answeredAt
    ),
    index("session_answer_session_idx").on(table.sessionId),
  ]
);

export const sessionAnswersRelations = relations(
  sessionAnswers,
  ({ one }) => ({
    session: one(sessions, {
      fields: [sessionAnswers.sessionId],
      references: [sessions.id],
    }),
    question: one(templateQuestions, {
      fields: [sessionAnswers.questionId],
      references: [templateQuestions.id],
    }),
    respondent: one(users, {
      fields: [sessionAnswers.respondentId],
      references: [users.id],
    }),
  })
);
