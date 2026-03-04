import { z } from "zod";

export const nudgesSchema = z.object({
  nudges: z
    .array(
      z.object({
        content: z.string().describe("The nudge text in coaching tone"),
        reason: z
          .string()
          .describe("Brief explanation of why this nudge is relevant"),
        priority: z.enum(["high", "medium", "low"]),
        sourceSessionId: z
          .string()
          .optional()
          .describe("Session ID that triggered this nudge"),
      })
    )
    .describe("2-3 pre-session nudges for the manager"),
});

export type AINudges = z.infer<typeof nudgesSchema>;
