import { z } from "zod";

/**
 * Schema for upserting a single answer during auto-save.
 */
export const answerUpsertSchema = z.object({
  questionId: z.string().uuid(),
  answerText: z.string().optional(),
  answerNumeric: z.number().optional(),
  answerJson: z.any().optional(),
  skipped: z.boolean().optional(),
});

export type AnswerUpsertInput = z.infer<typeof answerUpsertSchema>;
