import { z } from "zod";

export const managerAddendumSchema = z.object({
  sentimentAnalysis: z
    .string()
    .describe(
      "Brief analysis of the report's emotional state and engagement level"
    ),
  patterns: z
    .array(z.string())
    .describe("Recurring themes or patterns noticed across sessions (max 3)"),
  coachingSuggestions: z
    .array(z.string())
    .describe(
      "Suggestions for the manager to improve support for this report"
    ),
  followUpPriority: z
    .enum(["low", "medium", "high"])
    .describe("How urgently the manager should follow up on this session"),
});

export type AIManagerAddendum = z.infer<typeof managerAddendumSchema>;
