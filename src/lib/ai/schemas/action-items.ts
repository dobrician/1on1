import { z } from "zod";

export const actionSuggestionsSchema = z.object({
  suggestions: z
    .array(
      z.object({
        title: z
          .string()
          .describe("Clear, actionable title for the action item (max 200 chars)"),
        description: z
          .string()
          .describe("Brief description with context (max 500 chars)"),
        suggestedAssignee: z
          .enum(["manager", "report"])
          .describe("Who should own this action item"),
        reasoning: z
          .string()
          .describe("Why this action item was suggested"),
      })
    )
    .describe("1-3 suggested action items based on session content"),
});

export type AIActionSuggestions = z.infer<typeof actionSuggestionsSchema>;
