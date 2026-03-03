import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  jsonb,
  timestamp,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { tenants } from "./tenants";
import { users } from "./users";
import {
  templateCategoryEnum,
  questionCategoryEnum,
  answerTypeEnum,
  conditionalOperatorEnum,
} from "./enums";

export const questionnaireTemplates = pgTable("questionnaire_template", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: templateCategoryEnum("category").notNull().default("custom"),
  isDefault: boolean("is_default").notNull().default(false),
  isPublished: boolean("is_published").notNull().default(false),
  createdBy: uuid("created_by").references(() => users.id),
  version: integer("version").notNull().default(1),
  isArchived: boolean("is_archived").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const questionnaireTemplatesRelations = relations(
  questionnaireTemplates,
  ({ one, many }) => ({
    tenant: one(tenants, {
      fields: [questionnaireTemplates.tenantId],
      references: [tenants.id],
    }),
    creator: one(users, {
      fields: [questionnaireTemplates.createdBy],
      references: [users.id],
    }),
    questions: many(templateQuestions),
  })
);

export const templateQuestions = pgTable("template_question", {
  id: uuid("id").primaryKey().defaultRandom(),
  templateId: uuid("template_id")
    .notNull()
    .references(() => questionnaireTemplates.id),
  questionText: text("question_text").notNull(),
  helpText: text("help_text"),
  category: questionCategoryEnum("category").notNull().default("custom"),
  answerType: answerTypeEnum("answer_type").notNull(),
  answerConfig: jsonb("answer_config").notNull().default({}),
  isRequired: boolean("is_required").notNull().default(false),
  sortOrder: integer("sort_order").notNull(),
  isArchived: boolean("is_archived").notNull().default(false),
  conditionalOnQuestionId: uuid("conditional_on_question_id"),
  conditionalOperator: conditionalOperatorEnum("conditional_operator"),
  conditionalValue: varchar("conditional_value", { length: 255 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const templateQuestionsRelations = relations(
  templateQuestions,
  ({ one }) => ({
    template: one(questionnaireTemplates, {
      fields: [templateQuestions.templateId],
      references: [questionnaireTemplates.id],
    }),
    conditionalOnQuestion: one(templateQuestions, {
      fields: [templateQuestions.conditionalOnQuestionId],
      references: [templateQuestions.id],
      relationName: "conditionalQuestion",
    }),
  })
);
