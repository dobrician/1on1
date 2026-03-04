import { z } from "zod";

export const summarySchema = z.object({
  keyTakeaways: z
    .array(z.string())
    .min(2)
    .max(5)
    .describe("3-5 key takeaways from the session as bullet points"),
  discussionHighlights: z
    .array(
      z.object({
        category: z.string().describe("The section/category name"),
        summary: z
          .string()
          .describe(
            "1-2 paragraph summary of the discussion in this category"
          ),
      })
    )
    .describe("Per-category discussion highlights"),
  followUpItems: z
    .array(z.string())
    .max(5)
    .describe("Items that need follow-up or attention"),
  overallSentiment: z
    .enum(["positive", "neutral", "mixed", "concerning"])
    .describe("Overall tone of the session"),
});

export type AISummary = z.infer<typeof summarySchema>;
