# Phase 16: Template Import - Research

**Researched:** 2026-03-07
**Domain:** File upload, JSON validation, multi-step dialog, atomic DB insert, Next.js App Router API
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Entry Point**
- Import button added to the template list header, adjacent to "New Template" button, admin/manager only (`canManageTemplates()`)
- Standard file input `<input type="file" accept=".json">` — no drag-and-drop
- Button label: "Import" with Lucide `Upload` icon

**Import Flow UI**
- Multi-step Dialog (not a new page) — consistent with existing "Create Template" dialog
- Four dialog steps: File select → Preview → Conflict (conditional) → Success
- Step 1: file input + "Parse & Preview" button
- Step 2: preview (name, section count, question count, type breakdown); language mismatch warning (yellow banner) shown here requiring explicit "Proceed anyway"
- Step 3 (conditional): conflict resolution — Rename (inline input), Create as Copy, Cancel
- Step 4: success confirmation with link to newly created template

**Preview Display**
- Show: template name, description (if any), section count, question count, type breakdown as Badge list
- Reuse `Card` + `Badge` components — no new primitives

**Language Mismatch (IMP-03)**
- Yellow `Alert` inside Preview step
- Names both languages: "This template is in English but your company uses Romanian."
- "Proceed anyway" + "Cancel" — explicit confirmation required

**Conflict Resolution (IMP-04)**
- Rename: inline Input pre-filled with original name + " (imported)"
- Create as copy: auto-suffixes with " (copy)" and proceeds immediately
- Cancel: closes dialog, no data written

**Validation Errors (IMP-05)**
- Validate against TemplateExport schema BEFORE showing preview
- Invalid file → scrollable error list inside dialog (step 2 replaced by error state)
- Error format: "Section 2, Question 3, field `answerType`: invalid value `checkbox`"
- Max 10 errors shown, then "...and N more errors"
- "Close" button only — no proceed for invalid files

**API Route**
- `POST /api/templates/import` — JSON body (client-parses file → sends JSON)
- Client validates first (fast fail), server validates authoritatively + persists
- Atomic transaction for insert
- Returns `{ templateId, name }` on success; `{ errors: ImportError[] }` on validation failure

**Translations**
- New keys in `templates` namespace: `import.*` with full EN + RO parity

### Claude's Discretion
- Exact Zod schema shape for import validation (can mirror/invert `buildExportPayload` output)
- Transaction structure for insert (sections → questions → conditional logic)
- Error path format for nested structures (section index, question index, field name)
- Exact copy suffix wording ("(copy)" vs "Copy of")

### Deferred Ideas (OUT OF SCOPE)
- Drag-and-drop file upload
- Import from URL
- Bulk import (multiple files)
- Import history / audit log
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| IMP-01 | Admin or manager can import a template by uploading a `.json` file | FileReader API + hidden file input pattern; `canManageTemplates()` RBAC guard |
| IMP-02 | Before confirming import, user sees a preview: template name, section count, question count, question type breakdown | Client-side parse → derive counts from `TemplateExport` structure; existing `Card` + `Badge` components |
| IMP-03 | If JSON `language` field doesn't match company content language, show language mismatch warning before proceeding | `session.user.contentLanguage` available in JWT; shadcn `Alert` component; `language` field in `TemplateExport` |
| IMP-04 | If template with same name already exists, offer rename, create as copy, or cancel | Conflict check via `GET /api/templates` data already in TanStack Query cache; or a lightweight server check |
| IMP-05 | Import validation reports detailed, field-specific errors — not a generic toast | Zod `.safeParse()` with custom error map that formats path as "Section N, Question M, field X" |
</phase_requirements>

---

## Summary

Phase 16 is the inverse of Phase 15's export: a user uploads a `.json` file, the app validates it against the `TemplateExport` schema, shows a structured preview, handles language and name conflicts, then atomically inserts the template into the DB. The technical shape is well-constrained by Phase 15's established patterns.

The most complex part is the Zod error path formatter. Zod's `safeParse()` returns structured `ZodError.issues` with path arrays like `["sections", 0, "questions", 2, "answerType"]`. Converting these to human-readable strings ("Section 1, Question 3, field `answerType`") requires a small path-formatting utility applied to `z.ZodError.issues`. This is Claude's discretion territory and is straightforward to implement.

The DB insert is an ordered operation: insert template row → insert section rows (collect returned IDs) → insert question rows, using section index to map back to section IDs. Conditional logic references use `conditionalOnQuestionSortOrder` to look up the correct question ID in the just-inserted batch. All of this happens inside a single `withTenantContext` transaction, matching the pattern used by template creation and the existing batch-save route.

**Primary recommendation:** Build the Zod import schema as a direct mirror of `TemplateExport`, validate with `safeParse()` both client-side and server-side, and use a shared `formatImportErrors()` utility to convert `ZodError.issues` path arrays to user-readable strings. The multi-step dialog is local state (`useState<Step>`) inside a single client component.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Zod | v4 (project standard) | Import schema definition and validation | Already project-wide for all validation schemas; `safeParse()` gives structured error objects without throwing |
| shadcn/ui Dialog | existing | Multi-step import flow container | Already used for "Create Template" dialog in `template-list.tsx`; no new dependency |
| shadcn/ui Alert | existing | Language mismatch warning banner | Established warning display pattern |
| shadcn/ui Badge | existing | Question type breakdown display | Used throughout template list already |
| TanStack Query useMutation | existing | POST /api/templates/import | Established write pattern for all client components |
| FileReader API | browser built-in | Parse JSON from uploaded file client-side | Standard browser API, no library needed |
| Lucide Upload | existing | Import button icon | Matches existing Export/Download icon pattern |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| next-intl useTranslations | existing | All dialog strings in EN/RO | Same as every other client component |
| logAuditEvent | internal | Record template_imported event | Writes go through audit log — import is a write |
| canManageTemplates | internal | RBAC guard on button + API route | Same guard used by Export |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| FileReader API | Server-side file upload via FormData | FormData multipart adds complexity; client-side JSON.parse is sufficient since files are expected to be small (<1MB) |
| Local `step` state | URL-based routing | Multi-step dialog doesn't need router; consistent with how Create Template dialog works |
| Zod safeParse client+server | Client-only validation | Server must re-validate — client can be bypassed; dual validation is required |

**Installation:** No new packages required. All dependencies already in the project.

---

## Architecture Patterns

### File Structure

```
src/
├── app/api/templates/
│   └── import/
│       └── route.ts              # POST /api/templates/import
├── components/templates/
│   └── import-dialog.tsx         # Multi-step dialog, all 4 steps
├── lib/templates/
│   └── import-schema.ts          # TemplateImportSchema (Zod) + formatImportErrors()
└── lib/validations/
    └── template-import.ts        # Re-exports from import-schema (consistent with other validations)
messages/
├── en/templates.json             # + import.* keys
└── ro/templates.json             # + import.* keys (RO parity)
```

### Pattern 1: Client-Side File Read → Validate → Send

**What:** Use FileReader to read the file as text, JSON.parse it, validate with Zod `safeParse()` on the client to catch obvious errors instantly, then POST the parsed JSON to the server.

**When to use:** Always — this is the locked decision. Avoids multipart form complexity.

```typescript
// Source: browser FileReader API (MDN standard)
const reader = new FileReader();
reader.onload = (e) => {
  const text = e.target?.result as string;
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    setErrors([{ path: "", message: "File is not valid JSON" }]);
    return;
  }
  const result = templateImportSchema.safeParse(parsed);
  if (!result.success) {
    setErrors(formatImportErrors(result.error));
    return;
  }
  setPreviewData(result.data);
  setStep("preview");
};
reader.readAsText(file);
```

### Pattern 2: Zod Error Path Formatting

**What:** Convert Zod's structured `ZodError.issues` path arrays into human-readable field-level error messages.

**When to use:** In `formatImportErrors()` shared between client and server — same function used to format errors shown in dialog (client-side fast fail) and errors returned from API (server-side authoritative check).

```typescript
// Source: Zod docs on ZodError.issues structure (path is (string | number)[])
export interface ImportError {
  path: string;
  message: string;
}

export function formatImportErrors(error: z.ZodError): ImportError[] {
  return error.issues.map((issue) => {
    const path = formatIssuePath(issue.path);
    return { path, message: issue.message };
  });
}

function formatIssuePath(path: (string | number)[]): string {
  // path: ["sections", 1, "questions", 2, "answerType"]
  // output: "Section 2, Question 3, field `answerType`"
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
```

### Pattern 3: Atomic Insert (sections → questions, then resolve conditionals)

**What:** Inside a single `withTenantContext` transaction, insert template → sections (collect returned IDs indexed by sortOrder) → questions (map `conditionalOnQuestionSortOrder` back to just-inserted question IDs using a pre-built sortOrder → ID map).

**When to use:** Always for import. The entire operation must be atomic — partial inserts on failure corrupt the DB.

```typescript
// Source: pattern from src/app/api/templates/[id]/export/route.ts + existing template creation
await withTenantContext(tenantId, userId, async (tx) => {
  // 1. Insert template header
  const [template] = await tx.insert(questionnaireTemplates).values({
    tenantId, name: importName, description: payload.description ?? null, createdBy: userId,
  }).returning();

  // 2. Insert sections; collect sortOrder → sectionId map
  const sectionIdBySortOrder = new Map<number, string>();
  for (const section of payload.sections) {
    const [sec] = await tx.insert(templateSections).values({
      templateId: template.id, tenantId, name: section.name,
      description: section.description ?? null, sortOrder: section.sortOrder,
    }).returning();
    sectionIdBySortOrder.set(section.sortOrder, sec.id);
  }

  // 3. Insert questions; resolve conditionalOnQuestionSortOrder to question ID
  // First pass: collect all inserted question IDs by sortOrder (global across sections)
  const questionIdBySortOrder = new Map<number, string>();
  // Insert questions in sortOrder sequence (ascending) so conditionals resolve correctly
  const allQuestions = payload.sections
    .flatMap((s) => s.questions.map((q) => ({ ...q, sectionSortOrder: s.sortOrder })))
    .sort((a, b) => a.sortOrder - b.sortOrder);

  for (const q of allQuestions) {
    const sectionId = sectionIdBySortOrder.get(q.sectionSortOrder)!;
    const conditionalOnQuestionId = q.conditionalOnQuestionSortOrder !== null
      ? (questionIdBySortOrder.get(q.conditionalOnQuestionSortOrder) ?? null)
      : null;
    const [inserted] = await tx.insert(templateQuestions).values({
      templateId: template.id, sectionId, tenantId: tenantId,
      questionText: q.questionText, helpText: q.helpText ?? null,
      answerType: q.answerType, answerConfig: q.answerConfig,
      isRequired: q.isRequired, sortOrder: q.sortOrder,
      scoreWeight: String(q.scoreWeight),
      conditionalOnQuestionId,
      conditionalOperator: q.conditionalOperator ?? null,
      conditionalValue: q.conditionalValue ?? null,
    }).returning();
    questionIdBySortOrder.set(q.sortOrder, inserted.id);
  }

  return template;
});
```

### Pattern 4: Multi-Step Dialog State Machine

**What:** Local `useState<ImportStep>` controls which content renders inside a single `Dialog`. Steps are `"select" | "preview" | "error" | "conflict" | "success"`. No routing.

**When to use:** Matches how the existing Create Template dialog works — `createOpen` boolean, extended to a step enum.

```typescript
type ImportStep = "select" | "preview" | "error" | "conflict" | "success";
const [step, setStep] = useState<ImportStep>("select");
const [parsedPayload, setParsedPayload] = useState<TemplateExport | null>(null);
const [importErrors, setImportErrors] = useState<ImportError[]>([]);
const [languageMismatch, setLanguageMismatch] = useState(false);
const [conflictResolution, setConflictResolution] = useState<"rename" | "copy" | null>(null);
```

### Pattern 5: Conflict Check

**What:** Before posting to the API, check the TanStack Query cache for a template with the same name. If found, show the Conflict step. The API route also does a name uniqueness check server-side as the authoritative gate.

**When to use:** Client-side check is for UX (fast, no round-trip). Server-side check is mandatory for correctness.

```typescript
// Client-side fast check using cached template list
const { data: templates } = useQuery<TemplateData[]>({ queryKey: ["templates"] });
const hasConflict = templates?.some(
  (t) => t.name.toLowerCase() === parsedPayload?.name.toLowerCase()
);
```

### Anti-Patterns to Avoid

- **Skipping server-side validation:** Client validation is for UX speed. Server must always re-validate with `safeParse()` — clients can send arbitrary JSON.
- **UUID leakage in conditionals:** When re-inserting imported questions, `conditionalOnQuestionSortOrder` (integer) from the export must be mapped to the new question UUID from the just-inserted batch. Never store the sortOrder integer in the DB — only use it as a temporary cross-reference during import.
- **Non-atomic insert:** If questions insert fails after sections inserted, the template header row becomes orphaned. Always use `withTenantContext` (which wraps in a transaction); any thrown error rolls everything back.
- **Nested interactive elements:** The "Import" button triggers a hidden `<input type="file">` via a ref click. Do NOT wrap a `<Button>` inside an `<label>` — that creates a nested interactive element. Use `ref.current.click()` from a button's `onClick`.
- **Missing contentLanguage on session:** `session.user.contentLanguage` comes from the JWT. It is a per-tenant field (`tenants.content_language`, default "en"). The import route uses it for the language mismatch check — it is already present in the session from Phase 11.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSON schema validation | Custom type-checking code | Zod `safeParse()` with `templateImportSchema` | Handles nested paths, enum checks, type coercion, null vs missing field disambiguation |
| File reading | Manual XHR or fetch for file contents | `FileReader` browser API | Single-purpose, available everywhere, no library needed |
| Error path formatting | Ad-hoc string concat | `formatImportErrors()` shared utility | Consistent output between client fast-fail and server error responses; testable in isolation |
| Atomic multi-table insert | Manual try/catch with compensating deletes | `withTenantContext()` transaction wrapper | Automatic rollback on any thrown error |
| RBAC check | Custom role string comparison | `canManageTemplates(session.user.role)` | Already handles admin + manager, consistent with export route |

**Key insight:** The Zod schema for import is almost a 1-to-1 mirror of the `TemplateExport` TypeScript interface. Define it once in `src/lib/templates/import-schema.ts`, derive the TypeScript type from it with `z.infer<>`, and use it both client-side and server-side. This is the same pattern as `createTemplateSchema` / `saveTemplateSchema` in `src/lib/validations/template.ts`.

---

## Common Pitfalls

### Pitfall 1: `scale_custom` Answer Type Gap

**What goes wrong:** `template.ts` validation has `answerTypes` array that omits `"scale_custom"`. The `TemplateExport` interface and `answerTypeEnum` in the DB both include it. If the import schema uses the shorter list, valid exported files with `scale_custom` questions will fail validation.

**Why it happens:** `src/lib/validations/template.ts` line 4-11 defines `answerTypes` without `scale_custom`. The DB enum (in `enums.ts` line 23-31) includes it. The `ExportQuestion` interface in `export-schema.ts` also includes it.

**How to avoid:** The import Zod schema's `answerType` enum MUST be derived from `ExportQuestion["answerType"]` (from `export-schema.ts`), not from the `answerTypes` array in `template.ts`. Use:
```typescript
z.enum(["text", "rating_1_5", "rating_1_10", "yes_no", "multiple_choice", "mood", "scale_custom"])
```

**Warning signs:** Export test passes, but import rejects files with `scale_custom` questions.

### Pitfall 2: ZodError instanceof Check

**What goes wrong:** Existing code in `src/app/api/templates/route.ts` line 174 uses `error.name === "ZodError"` string comparison instead of `error instanceof ZodError`. This is a known code quality concern (`instanceof ZodError` missing — documented in MEMORY.md).

**Why it happens:** Historical pattern established before stricter linting. The `.name` check works at runtime but is fragile if Zod is bundled in multiple scopes.

**How to avoid:** In the import route, use `error instanceof z.ZodError` (Zod v4 export) for the authoritative check. Import `z` from `"zod"` and use `z.ZodError`.

### Pitfall 3: Content-Type on POST Request

**What goes wrong:** The client sends JSON body. If `Content-Type: application/json` header is missing, Next.js `request.json()` may fail or fall back to text parsing.

**Why it happens:** `fetch()` does not auto-set Content-Type for manually-constructed bodies.

**How to avoid:** Always include `headers: { "Content-Type": "application/json" }` in the import mutation's fetch call. This is already the pattern in `createMutation` in `template-list.tsx`.

### Pitfall 4: sortOrder Collision Risk in Conditionals

**What goes wrong:** If two questions across different sections have the same `sortOrder` value (e.g. each section starts at sortOrder 0), the `questionIdBySortOrder` map will map only one of them, and conditionals that reference the other will point to the wrong question.

**Why it happens:** Export does not enforce globally unique sortOrders — each section can have questions starting at 0.

**How to avoid:** During import, build a key that combines section index + question sortOrder for the conditional resolution map. Specifically, `conditionalOnQuestionSortOrder` in the export format references within a flat global question list (since `buildExportPayload` flattens all questions to build the UUID→sortOrder map). Verify this assumption against the export logic — since `allQuestions = template.sections.flatMap(s => s.questions)` in `buildExportPayload`, `sortOrder` values for the conditional map are from the flat list. The import must flatten in the same order to reconstruct the map.

**Warning signs:** Conditional logic references the wrong question after round-trip.

### Pitfall 5: Dialog Not Resetting on Close

**What goes wrong:** User opens import dialog, uploads a file, sees an error, closes the dialog, reopens it — the previous file name and error state are still shown.

**Why it happens:** React state persists as long as the component is mounted. If the Dialog uses `open` prop without destroying the component, state accumulates.

**How to avoid:** Reset all import state when `onOpenChange` fires with `false`. Follow the same pattern as the Create Template dialog: `reset()` in the `onOpenChange` handler. For import: reset step to "select", clear `parsedPayload`, clear `importErrors`, clear conflict state.

### Pitfall 6: schemaVersion Future-Proofing

**What goes wrong:** A file exported from a future version of the app (schemaVersion > 1) is imported. The validator accepts it silently and the import may fail or corrupt in unexpected ways.

**Why it happens:** `TemplateExport` types `schemaVersion` as the literal `1`. If future exports use version 2, `z.literal(1)` will reject the file — but with a generic "Invalid literal value" message rather than a helpful one.

**How to avoid:** Validate `schemaVersion` first; if it's not `1`, return a specific error: "This file uses schema version N, but only version 1 is supported. Export a new copy from a compatible app version." This is a special case handled before the main `safeParse`.

---

## Code Examples

### Zod Import Schema (Recommended Shape)

```typescript
// Source: mirrors TemplateExport interface in src/lib/templates/export-schema.ts
import { z } from "zod";

export const importQuestionSchema = z.object({
  questionText: z.string().min(1).max(1000),
  helpText: z.string().max(500).nullable(),
  answerType: z.enum([
    "text", "rating_1_5", "rating_1_10", "yes_no",
    "multiple_choice", "mood", "scale_custom",
  ]),
  answerConfig: z.record(z.string(), z.unknown()).default({}),
  isRequired: z.boolean(),
  sortOrder: z.number().int().min(0),
  scoreWeight: z.number().min(0).max(10),
  conditionalOnQuestionSortOrder: z.number().int().nullable(),
  conditionalOperator: z.enum(["eq", "neq", "lt", "gt", "lte", "gte"]).nullable(),
  conditionalValue: z.string().max(255).nullable(),
});

export const importSectionSchema = z.object({
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
```

### API Route Structure (POST /api/templates/import)

```typescript
// Source: mirrors src/app/api/templates/[id]/export/route.ts auth + RBAC pattern
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!canManageTemplates(session.user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }

  // Check schemaVersion first for actionable error
  if (typeof body === "object" && body !== null && "schemaVersion" in body) {
    const v = (body as Record<string, unknown>).schemaVersion;
    if (v !== 1) {
      return NextResponse.json({
        errors: [{ path: "schemaVersion", message: `Schema version ${v} is not supported. Only version 1 is supported.` }]
      }, { status: 422 });
    }
  }

  const result = templateImportSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ errors: formatImportErrors(result.error) }, { status: 422 });
  }

  const payload = result.data;
  const importName = /* name from request body override if rename/copy flow */;

  try {
    const template = await withTenantContext(session.user.tenantId, session.user.id, async (tx) => {
      // atomic insert: template → sections → questions (see Pattern 3)
    });
    await logAuditEvent(/* ... template_imported */);
    return NextResponse.json({ templateId: template.id, name: template.name }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to import template" }, { status: 500 });
  }
}
```

### ImportDialog Step Render Pattern

```typescript
// Source: existing Dialog pattern in src/components/templates/template-list.tsx
function dialogContent() {
  switch (step) {
    case "select": return <SelectStep onParsed={handleParsed} />;
    case "preview": return <PreviewStep payload={parsedPayload!} mismatch={languageMismatch} onConfirm={handlePreviewConfirm} onCancel={handleClose} />;
    case "error": return <ErrorStep errors={importErrors} onClose={handleClose} />;
    case "conflict": return <ConflictStep name={parsedPayload!.name} onRename={handleRename} onCopy={handleCopy} onCancel={handleClose} />;
    case "success": return <SuccessStep templateId={createdId!} onClose={handleClose} />;
  }
}
```

### Translation Key Structure

```json
// messages/en/templates.json — add under "templates": { ... }
"import": {
  "button": "Import",
  "dialogTitle": "Import Template",
  "step1": { "title": "Select File", "desc": "Upload a .json template file exported from this app.", "browse": "Browse", "fileName": "Selected: {name}", "parseButton": "Parse & Preview", "parsing": "Parsing..." },
  "step2": { "title": "Preview", "templateName": "Template Name", "sections": "{count} sections", "questions": "{count} questions", "types": "Question Types", "importButton": "Import", "cancel": "Cancel", "importing": "Importing..." },
  "languageMismatch": { "title": "Language Mismatch", "message": "This template is in {fileLanguage} but your company uses {companyLanguage}.", "proceed": "Proceed anyway", "cancel": "Cancel" },
  "step3": { "title": "Template Already Exists", "message": "A template named \"{name}\" already exists.", "renameLabel": "New name", "renameButton": "Import as {name}", "copyButton": "Create as copy", "cancel": "Cancel" },
  "step4": { "title": "Template Imported", "message": "Template \"{name}\" has been imported successfully.", "viewTemplate": "View Template", "close": "Close" },
  "error": { "title": "Invalid File", "tooManyErrors": "...and {count} more errors", "close": "Close" },
  "failed": "Import failed. Please try again."
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Global Zod error map (v3) | Per-parse custom error map or `.safeParse()` with `.issues` (v4) | Phase 12 | Error path format differs — use `.issues` array, not `.errors` |
| `instanceof ZodError` | `error.name === "ZodError"` (existing codebase pattern, known issue) | N/A | Import route should use `error instanceof z.ZodError` to fix the pattern |

**Deprecated/outdated:**
- `ZodError.errors` property: Use `.issues` in Zod v4. Both exist but `.issues` is the canonical array.

---

## Open Questions

1. **Should conflict check be client-side only or also server-side?**
   - What we know: TanStack Query cache has template list available in the component. Server can also do a `SELECT` by name within the transaction.
   - What's unclear: Race condition exists if two users import same-named template simultaneously.
   - Recommendation: Client-side check for UX flow; server must also check name uniqueness inside the transaction and return a conflict error if it occurs (rare but must not corrupt DB). Return `{ conflict: true, name }` with 409 status.

2. **Should `importName` be sent in the POST body or derived server-side?**
   - What we know: Rename and copy suffix may differ from the original template name.
   - What's unclear: If client sends full payload + preferred name override, server just uses the override name.
   - Recommendation: Client sends `{ payload: TemplateImportPayload, importName: string }` where `importName` is the final chosen name (may be original, renamed, or copy-suffixed). Server inserts using `importName`.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.18 |
| Config file | `vitest.config.ts` (root, already configured with `@` alias) |
| Quick run command | `bun run test -- src/lib/templates/__tests__/import-schema.test.ts` |
| Full suite command | `bun run test` |

Vitest is already configured (`vitest.config.ts`). The `environment: 'node'` setting means no browser APIs in tests — file upload UI is manual-only. The `@` path alias is already configured.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| IMP-01 | `canManageTemplates("member")` returns false; button renders only for admin/manager | unit | `bun run test -- src/lib/auth/__tests__/rbac.test.ts` | ❌ Wave 0 |
| IMP-02 | `derivePreviewStats(payload)` returns correct section/question counts and type breakdown | unit | `bun run test -- src/lib/templates/__tests__/import-schema.test.ts` | ❌ Wave 0 |
| IMP-03 | Language mismatch detection: `payload.language !== companyLanguage` | unit (within import-schema.test.ts) | `bun run test -- src/lib/templates/__tests__/import-schema.test.ts` | ❌ Wave 0 |
| IMP-04 | Conflict name suffix logic ("(copy)" suffix, rename validation) | unit (within import-schema.test.ts) | `bun run test -- src/lib/templates/__tests__/import-schema.test.ts` | ❌ Wave 0 |
| IMP-05 | `formatImportErrors()` formats nested path arrays correctly for section/question/field | unit | `bun run test -- src/lib/templates/__tests__/import-schema.test.ts` | ❌ Wave 0 |
| IMP-05 | `templateImportSchema.safeParse()` rejects invalid answerType with expected issue path | unit | `bun run test -- src/lib/templates/__tests__/import-schema.test.ts` | ❌ Wave 0 |
| IMP-05 | `templateImportSchema.safeParse()` rejects wrong schemaVersion with actionable message | unit | `bun run test -- src/lib/templates/__tests__/import-schema.test.ts` | ❌ Wave 0 |
| IMP-01+IMP-05 | Round-trip: `buildExportPayload()` output validates successfully through `templateImportSchema` | integration (unit, no DB) | `bun run test -- src/lib/templates/__tests__/import-schema.test.ts` | ❌ Wave 0 |
| (all) | Multi-step dialog state transitions | manual-only | N/A — requires browser DOM and file input interaction | N/A |
| (all) | POST /api/templates/import end-to-end | manual-only | N/A — requires DB + auth session | N/A |

**Manual-only justification:** The multi-step dialog involves `<input type="file">` which cannot be triggered programmatically in a headless Node environment without jsdom + userEvent. The existing Vitest config uses `environment: 'node'` — switching to `jsdom` for one test file adds complexity. The core correctness of the flow is fully covered by unit tests on the schema and formatter utilities.

### Sampling Rate

- **Per task commit:** `bun run test -- src/lib/templates/__tests__/import-schema.test.ts`
- **Per wave merge:** `bun run test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/lib/templates/__tests__/import-schema.test.ts` — covers IMP-02, IMP-03, IMP-04, IMP-05; round-trip test against `buildExportPayload`
- [ ] `src/lib/auth/__tests__/rbac.test.ts` — covers IMP-01 RBAC guard (if not already present — directory needs checking)

Existing infrastructure:
- `vitest.config.ts` — already configured, no changes needed
- `src/lib/templates/__tests__/export-schema.test.ts` — existing test file; fixture helpers (`makeQuestion`, `makeSection`, `makeTemplate`) are reusable for import round-trip test

---

## Sources

### Primary (HIGH confidence)

- `src/lib/templates/export-schema.ts` — `TemplateExport` interface, `ExportQuestion` answerType union (including `scale_custom`), `buildExportPayload()` logic
- `src/lib/templates/__tests__/export-schema.test.ts` — fixture patterns for testing; `makeQuestion`/`makeSection`/`makeTemplate` helpers are reusable
- `src/components/templates/template-list.tsx` — existing Dialog pattern, TanStack Query mutation pattern, `canManageTemplates` usage
- `src/app/api/templates/[id]/export/route.ts` — auth + RBAC guard pattern to mirror exactly
- `src/app/api/templates/route.ts` — POST handler pattern (JSON parse, Zod validate, withTenantContext, logAuditEvent)
- `src/lib/db/schema/templates.ts` — all DB table shapes for insert (columns, types, defaults)
- `src/lib/db/schema/enums.ts` — `answerTypeEnum` (7 values including `scale_custom`)
- `src/lib/validations/template.ts` — `answerTypes` array (6 values, missing `scale_custom` — pitfall identified)
- `src/lib/db/tenant-context.ts` — `withTenantContext` transaction wrapper
- `vitest.config.ts` — test framework configuration
- `messages/en/templates.json` — existing `export.*` key structure to mirror for `import.*`

### Secondary (MEDIUM confidence)

- Zod v4 documentation pattern: `z.ZodError.issues` array structure with `.path` as `(string | number)[]`
- FileReader API: MDN standard — `readAsText()` → `onload` event → `event.target.result` as string

### Tertiary (LOW confidence)

- None. All critical implementation details verified against actual codebase files.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in project, verified in source
- Architecture: HIGH — patterns directly verified from existing export route, template list, and DB schema
- Pitfalls: HIGH — `scale_custom` gap verified by comparing `template.ts` line 4-11 vs `enums.ts` line 23-31 vs `export-schema.ts` ExportQuestion type

**Research date:** 2026-03-07
**Valid until:** 2026-04-07 (stable domain — Next.js 15 App Router, Zod v4, shadcn/ui are all stable)
