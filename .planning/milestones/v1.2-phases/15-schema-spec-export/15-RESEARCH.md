# Phase 15: Schema, Spec & Export - Research

**Researched:** 2026-03-07
**Domain:** JSON schema specification, in-app documentation pages, client-side file download, template data export, i18n content language integration
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SPEC-01 | JSON schema document for templates accessible in-app — downloadable and copyable — all fields, types, constraints in English | Schema shape fully known from DB + Zod + docs; copy-to-clipboard + blob download patterns exist in codebase |
| SPEC-02 | In-app methodology documentation rendered in company's content language | `session.user.contentLanguage` is in JWT; `getTranslations()` / `useTranslations()` patterns established; new namespace needed |
| SPEC-03 | Weight system documentation showing how `scoreWeight` affects analytics, valid values, examples — in content language | `scoreWeight` is `decimal(4,2)` default 1, range 0–10 per Zod; methodology content goes in translation namespace |
| EXP-01 | Admin or manager can export a single template as `.json` from template list or builder | `canManageTemplates()` RBAC exists; client-side blob download pattern established in `csv-export-button.tsx` |
| EXP-02 | Exported JSON includes `schemaVersion` field | Static constant — no DB change needed |
| EXP-03 | Exported JSON is tenant-neutral — no internal tenant IDs or per-org UUIDs | Strip `tenantId`, `createdBy`, `id` fields; remap conditional references by `sortOrder` not UUID |
| EXP-04 | Exported JSON includes `language` field indicating template content language | `session.user.contentLanguage` available server-side; include at export time |
| EXP-05 | Exported JSON captures all question metadata: `scoreWeight`, `answerConfig`, conditional logic, section structure | All fields exist in `templateQuestions`; GET `/api/templates/[id]` already fetches everything |
</phase_requirements>

---

## Summary

Phase 15 has two distinct deliverables: (1) a documentation page for the template JSON schema, methodology, and weight system; and (2) a server-side API endpoint plus client button that exports a single template as a portable, tenant-neutral `.json` file.

The codebase already has all the building blocks. The GET `/api/templates/[id]` route returns the full template structure including all question fields. Client-side blob download is established in `csv-export-button.tsx`. The `canManageTemplates()` RBAC function gates both admin and manager access. The i18n pipeline — `getTranslations()` for server components, `useTranslations()` for client components, `session.user.contentLanguage` in the JWT — is fully in place from Phases 11-14.

The main work is: define the canonical export JSON shape (the "schema"), write a new export API route that serializes a template in that shape, add an Export button in the template list and builder, and build a static documentation page for the spec + methodology + weight system. The methodology and weight docs must use the translation namespace system for content language. The JSON schema itself stays in English.

**Primary recommendation:** Add a new `/api/templates/[id]/export` GET route that returns `Content-Disposition: attachment; filename="..."` with the sanitized JSON. Add a new documentation page at `/templates/schema`. Add Export button to `template-editor.tsx` header and `template-list.tsx` card context menus. All doc content goes into a new `spec.json` translation namespace.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js App Router | 15 | API routes + Server Components for docs page | Already the project framework |
| next-intl | 4 | Content-language rendering for methodology docs | Established in Phase 11-14 |
| shadcn/ui | current | Button, Card, Dialog, Tabs, Separator | Already used everywhere |
| Lucide React | current | Download icon for export button | Already used in csv-export-button |
| Zod | 3 | Runtime validation of export shape (for self-documentation purposes) | Already project standard |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| TanStack Query | 5 | Client-side export mutation (loading state) | When export button is in a Client Component |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| API route for export | Pure client-side serialization | API route is more correct: auth is server-side, tenant strip is server-side, no risk of client leaking tenant IDs |
| Static JSON schema as code constant | Generate from Zod schema | Code constant is simpler and less fragile; Zod-to-JSON-Schema adds a library dep with non-trivial output |

**Installation:**
No new packages needed. All required libraries are already installed.

---

## Architecture Patterns

### Recommended Project Structure

New files this phase creates:

```
src/
├── app/
│   ├── (dashboard)/
│   │   └── templates/
│   │       └── schema/
│   │           └── page.tsx              # /templates/schema docs page (Server Component)
│   └── api/
│       └── templates/
│           └── [id]/
│               └── export/
│                   └── route.ts          # GET /api/templates/[id]/export
├── components/
│   └── templates/
│       └── export-button.tsx             # Client component: export button with loading state
└── messages/
    ├── en/
    │   └── spec.json                     # Methodology + weight docs in English
    └── ro/
        └── spec.json                     # Romanian equivalents
```

### Pattern 1: API Route for File Download (JSON)

Follows the exact same pattern as `/api/analytics/export/route.ts`.

**What:** GET route that fetches template data, strips tenant-specific fields, serializes to JSON, returns with `Content-Disposition: attachment`.
**When to use:** Any time a server-auth-gated file download is needed.

```typescript
// /api/templates/[id]/export/route.ts
export async function GET(request: Request, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user) return new Response("Not authenticated", { status: 401 });
  if (!canManageTemplates(session.user.role)) return new Response("Forbidden", { status: 403 });

  const { id } = await params;

  const template = await withTenantContext(session.user.tenantId, session.user.id, async (tx) => {
    // Fetch template + sections + questions (same logic as GET /api/templates/[id])
    ...
  });

  if (!template) return new Response("Not found", { status: 404 });

  const exported = buildExportPayload(template, session.user.contentLanguage);
  const json = JSON.stringify(exported, null, 2);
  const filename = `${slugify(template.name)}-v${template.version}.json`;

  return new Response(json, {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
```

### Pattern 2: Export Payload Shape

This is the canonical "schema" that SPEC-01 documents and EXP-02 through EXP-05 enforce.

```typescript
// src/lib/templates/export-schema.ts
export const SCHEMA_VERSION = 1;

export interface TemplateExport {
  schemaVersion: 1;                    // EXP-02: always present
  language: string;                    // EXP-04: company content language ("en" | "ro")
  name: string;
  description: string | null;
  sections: ExportSection[];
}

export interface ExportSection {
  name: string;
  description: string | null;
  sortOrder: number;
  questions: ExportQuestion[];
}

export interface ExportQuestion {
  questionText: string;
  helpText: string | null;
  answerType: "text" | "rating_1_5" | "rating_1_10" | "yes_no" | "multiple_choice" | "mood" | "scale_custom";
  answerConfig: Record<string, unknown>;
  isRequired: boolean;
  sortOrder: number;
  scoreWeight: number;                 // EXP-05: 0–10, default 1
  // Conditional logic — uses sortOrder-based ref, not UUID (EXP-03)
  conditionalOnQuestionSortOrder: number | null;
  conditionalOperator: "eq" | "neq" | "lt" | "gt" | "lte" | "gte" | null;
  conditionalValue: string | null;
}
```

**CRITICAL tenant-neutral rule (EXP-03):** The export MUST omit:
- `id` (UUID) from template, sections, questions
- `tenantId` from any level
- `createdBy` (user UUID)
- `templateId`, `sectionId` (internal join keys)
- `isArchived`, `createdAt`, `updatedAt`, `version` (internal state)

Conditional logic references use `sortOrder` integer (a stable, portable reference) instead of `conditionalOnQuestionId` UUID.

### Pattern 3: Client-Side Export Button

Follows `csv-export-button.tsx` exactly — fetch the route, get blob, programmatic anchor click.

```typescript
// src/components/templates/export-button.tsx
"use client";
const handleExport = async () => {
  const res = await fetch(`/api/templates/${templateId}/export`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `template-export.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
```

### Pattern 4: Schema Documentation Page

Static Server Component at `/templates/schema`. Uses `getTranslations("spec")` for methodology + weight content, renders the JSON schema as a code block in English.

```typescript
// src/app/(dashboard)/templates/schema/page.tsx
import { getTranslations } from "next-intl/server";

export default async function SchemaPage() {
  const t = await getTranslations("spec");
  // Render: JSON schema block (hardcoded EN) + methodology section (t("methodology.*")) + weight section (t("weights.*"))
}
```

The JSON schema displayed on this page is the TypeScript interface above, rendered as a JSON Schema draft-07 object (static string or JSON object, not generated at runtime).

### Pattern 5: Copy-to-Clipboard

Use the browser Clipboard API for the "Copy" button on the schema block. This is already used in the codebase (search command palette). No library needed.

```typescript
await navigator.clipboard.writeText(schemaJsonString);
toast.success(t("spec.copied"));
```

### Anti-Patterns to Avoid

- **Never expose internal UUIDs in the export.** `conditionalOnQuestionId` is a UUID and MUST be replaced with the stable `conditionalOnQuestionSortOrder` integer.
- **Never put methodology content in hardcoded English JSX.** Even if initial implementation only has English, all user-facing text goes through `t()` from the `spec` namespace so Romanian follows naturally.
- **Never generate the JSON schema at runtime from Drizzle types.** Keep it as a static documented constant in the spec page. Runtime generation adds complexity with no benefit.
- **Never put the export button inside the form submit flow.** Export is a separate GET fetch, not tied to save.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| File download trigger | Custom downloader | Same anchor-click pattern as `csv-export-button.tsx` | Edge cases (Firefox, Safari) already handled |
| Copy to clipboard | Custom copy logic | `navigator.clipboard.writeText()` | Browser standard, no dependency needed |
| JSON pretty-printing | Custom formatter | `JSON.stringify(obj, null, 2)` | Built-in |
| Filename slugification | External library | Simple inline: `name.toLowerCase().replace(/[^a-z0-9]+/g, '-')` | No library needed for this |
| RBAC check | Custom role logic | `canManageTemplates(session.user.role)` from `src/lib/auth/rbac.ts` | Already exists and tested |

---

## Common Pitfalls

### Pitfall 1: Leaking Tenant UUIDs via Conditional Logic
**What goes wrong:** The `conditionalOnQuestionId` field is a UUID pointing to another question. If included verbatim in the export, Phase 16 import would try to use a UUID that doesn't exist in the importing tenant.
**Why it happens:** The field is easy to include when doing a naive spread of the question row.
**How to avoid:** Build `buildExportPayload()` as a deliberate transform function, not a spread. Map `conditionalOnQuestionId` UUID to the target question's `sortOrder` value (which is meaningful and portable).
**Warning signs:** The export JSON contains any `uuid` pattern strings.

### Pitfall 2: Missing Fields Breaks Phase 16 Import
**What goes wrong:** Phase 16 (Import) validates against the schema this phase defines. If Phase 15 exports are missing fields or use different key names, Phase 16 validation will fail immediately.
**Why it happens:** Quick implementation without thinking about the downstream consumer.
**How to avoid:** Define the `TemplateExport` TypeScript interface first (as the canonical schema), write the export serializer against it, and write the JSON schema documentation from that interface. They must be identical.
**Warning signs:** The TypeScript interface and the JSON schema on the docs page diverge.

### Pitfall 3: Methodology Docs Hardcoded in English
**What goes wrong:** A Romanian company's admin reads methodology docs in English, contradicting SPEC-02.
**Why it happens:** Temptation to write methodology prose directly in JSX.
**How to avoid:** Every user-facing string in `schema/page.tsx` goes through `t()`. The JSON schema block itself (code/technical standard) is English — but surrounding narrative, section headings, and methodology text are translated.
**Warning signs:** Any JSX string literal that isn't wrapped in `t()` on the docs page.

### Pitfall 4: Export Button Visible to Members
**What goes wrong:** The RBAC requirement says "admin or manager" (EXP-01). A member seeing the button gets a 403 from the API — confusing UX.
**Why it happens:** Export button rendered without role check.
**How to avoid:** Export button receives `userRole` prop; render conditionally like the existing publish/duplicate/archive buttons in `template-editor.tsx`. The API also enforces via `canManageTemplates()`.
**Warning signs:** The button is visible in the UI when logged in as member role.

### Pitfall 5: Translation Parity CI Will Fail
**What goes wrong:** Adding `messages/en/spec.json` without `messages/ro/spec.json` (or with different keys) causes the existing CI test `translation-parity.test.ts` to fail.
**Why it happens:** New namespace added without corresponding Romanian translations.
**How to avoid:** Both `en/spec.json` and `ro/spec.json` must be created with identical keys in the same plan/wave that adds the namespace.
**Warning signs:** `bun test` fails on the `spec.json: en and ro have identical keys` test.

### Pitfall 6: scoreWeight Stored as Decimal String from DB
**What goes wrong:** `scoreWeight` comes from DB as a Drizzle `decimal` type, which Drizzle returns as a string (e.g., `"1.00"`). If exported verbatim, it's a string in the JSON, not a number.
**Why it happens:** Drizzle returns `decimal` columns as strings by default.
**How to avoid:** In the export transform: `scoreWeight: parseFloat(q.scoreWeight ?? "1")`. Confirmed by `template-editor.tsx` line: `scoreWeight: q.scoreWeight ? Number(q.scoreWeight) : 1`.
**Warning signs:** The exported JSON has `"scoreWeight": "1.00"` (string) instead of `"scoreWeight": 1` (number).

---

## Code Examples

### Export Transform Function (Reference)
```typescript
// Source: derived from GET /api/templates/[id]/route.ts structure + EXP-03 requirements
function buildExportPayload(
  template: ServerTemplateWithSections,
  contentLanguage: string
): TemplateExport {
  // Build a flat sortOrder -> question map for conditional reference resolution
  const allQuestions = template.sections.flatMap((s) => s.questions);
  const questionSortOrderById = new Map(allQuestions.map((q) => [q.id, q.sortOrder]));

  return {
    schemaVersion: SCHEMA_VERSION,
    language: contentLanguage,
    name: template.name,
    description: template.description,
    sections: template.sections.map((section) => ({
      name: section.name,
      description: section.description,
      sortOrder: section.sortOrder,
      questions: section.questions.map((q) => ({
        questionText: q.questionText,
        helpText: q.helpText,
        answerType: q.answerType,
        answerConfig: (q.answerConfig as Record<string, unknown>) ?? {},
        isRequired: q.isRequired,
        sortOrder: q.sortOrder,
        scoreWeight: parseFloat(q.scoreWeight ?? "1"),
        conditionalOnQuestionSortOrder: q.conditionalOnQuestionId
          ? (questionSortOrderById.get(q.conditionalOnQuestionId) ?? null)
          : null,
        conditionalOperator: q.conditionalOperator,
        conditionalValue: q.conditionalValue,
      })),
    })),
  };
}
```

### JSON Schema (for SPEC-01 docs page)
This is the human-readable schema to display and download. Always English.

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "1on1 Template Export",
  "version": "1",
  "type": "object",
  "required": ["schemaVersion", "language", "name", "sections"],
  "properties": {
    "schemaVersion": { "type": "integer", "enum": [1] },
    "language": { "type": "string", "example": "en" },
    "name": { "type": "string", "maxLength": 255 },
    "description": { "type": ["string", "null"], "maxLength": 2000 },
    "sections": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "required": ["name", "sortOrder", "questions"],
        "properties": {
          "name": { "type": "string", "maxLength": 255 },
          "description": { "type": ["string", "null"], "maxLength": 2000 },
          "sortOrder": { "type": "integer", "minimum": 0 },
          "questions": {
            "type": "array",
            "items": {
              "type": "object",
              "required": ["questionText", "answerType", "isRequired", "sortOrder", "scoreWeight"],
              "properties": {
                "questionText": { "type": "string", "maxLength": 1000 },
                "helpText": { "type": ["string", "null"], "maxLength": 500 },
                "answerType": {
                  "type": "string",
                  "enum": ["text", "rating_1_5", "rating_1_10", "yes_no", "multiple_choice", "mood", "scale_custom"]
                },
                "answerConfig": { "type": "object" },
                "isRequired": { "type": "boolean" },
                "sortOrder": { "type": "integer", "minimum": 0 },
                "scoreWeight": { "type": "number", "minimum": 0, "maximum": 10, "default": 1 },
                "conditionalOnQuestionSortOrder": { "type": ["integer", "null"] },
                "conditionalOperator": {
                  "type": ["string", "null"],
                  "enum": ["eq", "neq", "lt", "gt", "lte", "gte", null]
                },
                "conditionalValue": { "type": ["string", "null"], "maxLength": 255 }
              }
            }
          }
        }
      }
    }
  }
}
```

### answerConfig Shapes (All Answer Types)
```
text:             {}
rating_1_5:       { "labels": { "1": "...", "5": "..." } }  -- optional
rating_1_10:      { "labels": { "1": "...", "10": "..." } } -- optional
yes_no:           {}
multiple_choice:  { "options": ["...", "..."], "allow_multiple": false }
mood:             { "scale": ["😞", "😐", "😊", "😄", "🤩"] }  -- optional custom
scale_custom:     {}  -- rarely used, treat same as text
```

### Translation Namespace: spec.json
```json
{
  "spec": {
    "pageTitle": "Template Schema & Documentation",
    "pageDescription": "Reference documentation for the 1on1 template format",
    "tabs": {
      "schema": "JSON Schema",
      "methodology": "Methodology",
      "weights": "Score Weights"
    },
    "schema": {
      "title": "Template JSON Schema",
      "description": "The canonical schema for template export/import. Always in English as a technical standard.",
      "download": "Download Schema",
      "copy": "Copy",
      "copied": "Copied!"
    },
    "methodology": {
      "title": "1:1 Meeting Principles",
      "intro": "...",
      "principles": { ... }
    },
    "weights": {
      "title": "Score Weight System",
      "intro": "...",
      "validRange": "Valid range: 0–10",
      "examples": { ... }
    }
  }
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Include UUIDs in export | Use sortOrder as portable reference for conditional logic | Phase 15 | Portability across orgs |
| Hardcoded English docs | Translation namespace for methodology content | Phase 15 | Content-language compliance |

---

## Open Questions

1. **Where exactly does the Export button appear in the template list?**
   - What we know: EXP-01 says "template list or template builder"
   - What's unclear: The list uses Link cards (no context menu exists yet). Options: (a) add a `...` context menu dropdown to each card, (b) add Export to the existing template editor toolbar alongside Publish/Duplicate/Archive.
   - Recommendation: Add Export to the template editor toolbar (same row as Publish, Duplicate, Archive). For the template list, add a simple dropdown per card (3-dot menu). This matches the requirement "from the template list OR builder" — both surfaces.

2. **Should the schema docs page be linked from the nav?**
   - What we know: Nav items are defined in `top-nav.tsx`; Templates is already a nav item for managers.
   - What's unclear: Whether the schema page is a sub-page under `/templates/` or a link in a different nav group.
   - Recommendation: Add a "Schema Docs" link as a secondary link within the `/templates` section (or a link from the Templates page itself with `BookOpen` icon). No new top-level nav item needed — it's a reference page under templates.

3. **Should `scale_custom` be included in the schema?**
   - What we know: It appears in `enums.ts` but not in `validations/template.ts` `answerTypes` array. It's not in the template builder UI.
   - What's unclear: Is it planned, abandoned, or an oversight?
   - Recommendation: Include it in the schema as a valid `answerType` (since the DB enum accepts it), but note in docs that it has no UI builder support in v1.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.18 |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `bun test` |
| Full suite command | `bun test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SPEC-01 | JSON schema is valid JSON that matches expected shape | unit | `bun test src/lib/templates/__tests__/export-schema.test.ts` | Wave 0 |
| SPEC-02 | Methodology content uses `t()` — verified structurally via translation parity | unit | `bun test` (parity test catches missing spec.json keys) | existing |
| SPEC-03 | Weight docs namespace keys exist in both en and ro | unit | `bun test` (parity test) | existing |
| EXP-01 | Export button renders for admin/manager, not member | manual | — | manual only |
| EXP-02 | `buildExportPayload` includes `schemaVersion: 1` | unit | `bun test src/lib/templates/__tests__/export-schema.test.ts` | Wave 0 |
| EXP-03 | Export payload contains no UUID patterns | unit | `bun test src/lib/templates/__tests__/export-schema.test.ts` | Wave 0 |
| EXP-04 | Export payload contains `language` field matching contentLanguage | unit | `bun test src/lib/templates/__tests__/export-schema.test.ts` | Wave 0 |
| EXP-05 | `scoreWeight` is a number (not string), answerConfig present | unit | `bun test src/lib/templates/__tests__/export-schema.test.ts` | Wave 0 |

### Sampling Rate
- **Per task commit:** `bun run typecheck && bun run lint`
- **Per wave merge:** `bun test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/templates/__tests__/export-schema.test.ts` — unit tests for `buildExportPayload()` covering EXP-02, EXP-03, EXP-04, EXP-05
- [ ] `src/lib/templates/export-schema.ts` — `TemplateExport` interface + `SCHEMA_VERSION` constant + `buildExportPayload()` (created as part of Wave 1, not Wave 0 — no separate stub needed; test file is Wave 0 gap)

---

## Sources

### Primary (HIGH confidence)
- `/home/dc/work/1on1/src/lib/db/schema/templates.ts` — Drizzle schema: all column names, types, and constraints verified directly
- `/home/dc/work/1on1/src/lib/db/schema/enums.ts` — All enum values for `answerType`, `conditionalOperator`
- `/home/dc/work/1on1/src/lib/validations/template.ts` — Zod validation: `scoreWeight` range 0–10, answerConfig rules, conditional logic rules
- `/home/dc/work/1on1/src/app/api/templates/[id]/route.ts` — Verified which fields are returned from DB; `scoreWeight` comes back as string
- `/home/dc/work/1on1/src/components/analytics/csv-export-button.tsx` — Established blob download pattern
- `/home/dc/work/1on1/src/app/api/analytics/export/route.ts` — `Content-Disposition: attachment` pattern confirmed
- `/home/dc/work/1on1/src/lib/auth/rbac.ts` — `canManageTemplates` = admin | manager
- `/home/dc/work/1on1/src/types/next-auth.d.ts` — `contentLanguage` is in JWT and `session.user`
- `/home/dc/work/1on1/src/lib/email/translator.ts` — `createEmailTranslator` pattern for standalone content translation
- `/home/dc/work/1on1/messages/en/templates.json` — Existing translation namespace structure to follow
- `/home/dc/work/1on1/src/lib/i18n/__tests__/translation-parity.test.ts` — CI parity test covers all JSON files in `messages/en/` and `messages/ro/`
- `/home/dc/work/1on1/docs/questionnaires.md` — All `answerConfig` shapes documented and verified

### Secondary (MEDIUM confidence)
- `REQUIREMENTS.md` + `STATE.md` — Phase scope, decisions, and constraints confirmed from project planning docs
- `ROADMAP.md` — Phase 15 goal and success criteria

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all required libraries already installed and in use
- Architecture: HIGH — export pattern, auth pattern, i18n pattern all verified from existing code
- Pitfalls: HIGH — scoreWeight-as-string verified from code; UUID leakage via conditional logic is a design trap confirmed by reading the schema
- Export shape: HIGH — all DB fields verified directly from schema files
- Open questions: MEDIUM — nav placement and scale_custom are design calls, not technical unknowns

**Research date:** 2026-03-07
**Valid until:** 2026-04-07 (stable tech stack)
