import { z } from "zod";

// Template categories (mirrors DB enum)
export const templateCategories = [
  "check_in",
  "career",
  "performance",
  "onboarding",
  "custom",
] as const;

// Question categories (mirrors DB enum)
export const questionCategories = [
  "check_in",
  "wellbeing",
  "engagement",
  "performance",
  "career",
  "feedback",
  "recognition",
  "goals",
  "custom",
] as const;

// Answer types (mirrors DB enum)
export const answerTypes = [
  "text",
  "rating_1_5",
  "rating_1_10",
  "yes_no",
  "multiple_choice",
  "mood",
] as const;

// Conditional operators (mirrors DB enum)
export const conditionalOperators = [
  "eq",
  "neq",
  "lt",
  "gt",
  "lte",
  "gte",
] as const;

// Create template
export const createTemplateSchema = z.object({
  name: z.string().min(1, "Template name is required").max(255),
  description: z.string().max(2000).optional(),
  category: z.enum(templateCategories),
});

// Update template metadata
export const updateTemplateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).nullable().optional(),
  category: z.enum(templateCategories).optional(),
});

// Create/update question
export const questionSchema = z.object({
  questionText: z.string().min(1, "Question text is required").max(1000),
  helpText: z.string().max(500).nullable().optional(),
  category: z.enum(questionCategories),
  answerType: z.enum(answerTypes),
  answerConfig: z.record(z.string(), z.unknown()).default({}),
  isRequired: z.boolean().default(false),
  sortOrder: z.number().int().min(0),
  conditionalOnQuestionId: z.string().uuid().nullable().optional(),
  conditionalOperator: z.enum(conditionalOperators).nullable().optional(),
  conditionalValue: z.string().max(255).nullable().optional(),
});

// Question with optional ID for batch saves (existing questions have IDs, new ones don't)
export const saveQuestionSchema = questionSchema.extend({
  id: z.string().uuid().optional(),
});

// Batch save: template metadata + all questions in one call
export const saveTemplateSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).nullable().optional(),
  category: z.enum(templateCategories),
  questions: z
    .array(saveQuestionSchema)
    .min(1, "Template must have at least 1 question"),
});

// Reorder questions (array of question IDs in desired order)
export const reorderQuestionsSchema = z.object({
  questionIds: z.array(z.string().uuid()).min(1),
});

/**
 * Validates answer_config based on answerType.
 * Returns null if valid, or error string describing the problem.
 */
export function validateAnswerConfig(
  answerType: string,
  answerConfig: Record<string, unknown>
): string | null {
  if (answerType === "multiple_choice") {
    const options = answerConfig.options;
    if (!Array.isArray(options) || options.length < 2) {
      return "Multiple choice questions require at least 2 options";
    }
    for (const opt of options) {
      if (typeof opt !== "string" || opt.trim().length === 0) {
        return "All multiple choice options must be non-empty strings";
      }
    }
  }
  return null;
}
