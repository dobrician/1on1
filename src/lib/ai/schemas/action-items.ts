import { z } from "zod";

export const actionSuggestionsSchema = z.object({
  suggestions: z
    .array(
      z.object({
        title: z
          .string()
          .max(200)
          .describe("Clear, actionable title for the action item"),
        description: z
          .string()
          .max(500)
          .describe("Brief description with context"),
        suggestedAssignee: z
          .enum(["manager", "report"])
          .describe("Who should own this action item"),
        reasoning: z
          .string()
          .describe("Why this action item was suggested"),
      })
    )
    .min(1)
    .max(3)
    .describe("1-3 suggested action items based on session content"),
});

export type AIActionSuggestions = z.infer<typeof actionSuggestionsSchema>;
