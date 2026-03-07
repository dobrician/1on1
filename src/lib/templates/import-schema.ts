import { z } from "zod";

// answerType enum — sourced from export-schema.ts ExportQuestion, NOT from template.ts
// template.ts omits "scale_custom" — that is a known gap (see MEMORY.md concerns)
const ANSWER_TYPES = [
  "text",
  "rating_1_5",
  "rating_1_10",
  "yes_no",
  "multiple_choice",
  "mood",
  "scale_custom",
] as const;

const importQuestionSchema = z.object({
  questionText: z.string().min(1).max(1000),
  helpText: z.string().max(500).nullable(),
  answerType: z.enum(ANSWER_TYPES),
  answerConfig: z.record(z.string(), z.unknown()).default({}),
  isRequired: z.boolean(),
  sortOrder: z.number().int().min(0),
  scoreWeight: z.number().min(0).max(10),
  conditionalOnQuestionSortOrder: z.number().int().nullable(),
  conditionalOperator: z.enum(["eq", "neq", "lt", "gt", "lte", "gte"]).nullable(),
  conditionalValue: z.string().max(255).nullable(),
});

const importSectionSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).nullable(),
  sortOrder: z.number().int().min(0),
  questions: z.array(importQuestionSchema).min(0),
});

export const templateImportSchema = z.object({
  schemaVersion: z.literal(1),
  language: z.string().min(2).max(10),
  name: z.string().min(1).max(255),
  description: z.string().max(2000).nullable(),
  sections: z.array(importSectionSchema).min(1),
});

export type TemplateImportPayload = z.infer<typeof templateImportSchema>;

// ---------------------------------------------------------------------------
// ImportError
// ---------------------------------------------------------------------------

export interface ImportError {
  path: string;
  message: string;
}

function formatIssuePath(path: (string | number)[]): string {
  if (path.length === 0) return "root";
  const parts: string[] = [];
  let i = 0;
  while (i < path.length) {
    if (path[i] === "sections" && typeof path[i + 1] === "number") {
      parts.push(`Section ${(path[i + 1] as number) + 1}`);
      i += 2;
    } else if (path[i] === "questions" && typeof path[i + 1] === "number") {
      parts.push(`Question ${(path[i + 1] as number) + 1}`);
      i += 2;
    } else {
      parts.push(`field \`${path[i]}\``);
      i += 1;
    }
  }
  return parts.join(", ");
}

export function formatImportErrors(error: z.ZodError): ImportError[] {
  return error.issues.map((issue) => ({
    path: formatIssuePath(issue.path as (string | number)[]),
    message: issue.message,
  }));
}

// ---------------------------------------------------------------------------
// PreviewStats
// ---------------------------------------------------------------------------

export interface PreviewStats {
  name: string;
  description: string | null;
  sectionCount: number;
  questionCount: number;
  typeCounts: Record<string, number>;
}

export function derivePreviewStats(payload: TemplateImportPayload): PreviewStats {
  const typeCounts: Record<string, number> = {};
  let questionCount = 0;
  for (const section of payload.sections) {
    for (const question of section.questions) {
      questionCount++;
      typeCounts[question.answerType] = (typeCounts[question.answerType] ?? 0) + 1;
    }
  }
  return {
    name: payload.name,
    description: payload.description,
    sectionCount: payload.sections.length,
    questionCount,
    typeCounts,
  };
}
