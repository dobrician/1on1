---
phase: 15-schema-spec-export
plan: "02"
subsystem: api
tags: [next-intl, i18n, api-routes, typescript, templates, export, shadcn-ui]

requires:
  - phase: 15-01
    provides: "buildExportPayload() function and TemplateExport interface"

provides:
  - "GET /api/templates/[id]/export — tenant-neutral JSON download route with Content-Disposition: attachment"
  - "messages/en/spec.json — English translations for schema docs page"
  - "messages/ro/spec.json — Romanian translations with identical key structure"
  - "/templates/schema page — three-tab Server Component (JSON Schema, Methodology, Score Weights)"
  - "SchemaActions client component — copy-to-clipboard and JSON download"

affects:
  - "15-03 (export button imports or links to /templates/schema)"
  - "15-04 (export button calls GET /api/templates/[id]/export)"
  - "Phase 16 (import validates against the JSON schema displayed here)"
  - "Phase 17 (AI generation uses methodology as prompt context)"

tech-stack:
  added: []
  patterns:
    - "bare Response constructor for file downloads (no NextResponse) — matches analytics/export pattern"
    - "getTranslations() without namespace + (tSpec as any)(`spec.${key}`) for complex union type workaround"
    - "SchemaActions client component receives translated labels as props from Server Component parent"

key-files:
  created:
    - src/app/api/templates/[id]/export/route.ts
    - messages/en/spec.json
    - messages/ro/spec.json
    - src/app/(dashboard)/templates/schema/page.tsx
    - src/app/(dashboard)/templates/schema/schema-actions.tsx
  modified:
    - src/global.d.ts
    - CHANGELOG.md

key-decisions:
  - "bare Response (not NextResponse) for export route — consistent with analytics/export pattern, simpler for file downloads"
  - "getTranslations() without namespace + as any cast — TypeScript union type for NamespaceKeys has exceeded complexity limit with 16+ namespaces; established codebase pattern (12-04)"
  - "Romanian curly quotes replaced with angle quotes «»  in spec.json — U+201D right double quote breaks JSON string parsing"
  - "SchemaActions receives labels as props rather than using useTranslations() — keeps parent as Server Component, avoids hydration boundary"
  - "Template JSON schema embedded as static JSON string (not generated at runtime) — simpler, no library dependency"

patterns-established:
  - "Export route: auth → RBAC → fetchFromDB → buildExportPayload → bare Response with Content-Disposition"
  - "Docs page: Server Component tabs with getTranslations; only interactive bits (copy/download) extracted to client"

requirements-completed:
  - SPEC-01
  - SPEC-02
  - SPEC-03

duration: 20min
completed: 2026-03-07
---

# Phase 15 Plan 02: Export API Route + spec.json + Schema Docs Page Summary

**Export API at GET /api/templates/[id]/export with Content-Disposition attachment, en+ro spec.json namespace, and three-tab /templates/schema documentation page**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-03-07T07:37:33Z
- **Completed:** 2026-03-07T08:00:00Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Export API route auth-gated (401/403), calls buildExportPayload(), returns JSON with attachment header
- spec.json translation namespace created in en + ro; all 17 translation parity tests pass
- /templates/schema page with three tabs: JSON Schema (hardcoded English technical schema), Methodology (t() keys), Score Weights (t() keys)
- SchemaActions client component handles copy-to-clipboard and blob download

## Task Commits

1. **Task 1: Export API route** - `49f0259` (feat)
2. **Task 2: spec.json + schema docs page** - `c4969ec` (feat)

**Plan 01 prerequisite committed in this session:** `cedf9a0` (feat — export-schema.ts + tests)

## Files Created/Modified

- `src/app/api/templates/[id]/export/route.ts` — GET route, RBAC, withTenantContext, buildExportPayload, Response with Content-Disposition
- `messages/en/spec.json` — Complete English translations for all three tabs
- `messages/ro/spec.json` — Romanian translations with identical key structure
- `src/app/(dashboard)/templates/schema/page.tsx` — Server Component, three-tab layout, hardcoded JSON schema block
- `src/app/(dashboard)/templates/schema/schema-actions.tsx` — Client Component: copy and download buttons
- `src/global.d.ts` — Added spec.json to Messages type
- `CHANGELOG.md` — Added entries for all new files

## Decisions Made

- **As any cast for getTranslations**: `(tSpec as any)(\`spec.${key}\`)` used because TypeScript's NamespaceKeys union exceeds type complexity limits at 16+ namespaces. Established pattern (see decision 12-04 in STATE.md).
- **Romanian curly quotes**: Used `«»` angle quotes instead of `„"` typographic quotes in spec.json to avoid JSON parse errors (U+201D right double quote is a valid JSON string terminator).
- **Bare Response**: Matches analytics/export pattern; no NextResponse needed for simple file responses.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Plan 01 prerequisite not executed**
- **Found during:** Pre-task setup
- **Issue:** `src/lib/templates/export-schema.ts` did not exist (Plan 01 had not been executed). Plan 02 imports `buildExportPayload` from that file.
- **Fix:** Executed Plan 01 inline (TDD RED/GREEN: test file existed; wrote export-schema.ts implementation). All 7 unit tests pass.
- **Files modified:** `src/lib/templates/export-schema.ts`, `CHANGELOG.md`
- **Committed in:** `cedf9a0` (prerequisite feat commit)

**2. [Rule 1 - Bug] Romanian spec.json had invalid JSON from curly quotes**
- **Found during:** Task 2 (translation parity test run)
- **Issue:** Romanian typographic quotes `"` (U+201D) inside JSON string values terminated the string prematurely, causing SyntaxError in JSON.parse
- **Fix:** Replaced `„...?"` pattern with `«...?»` using French angle quotes, which are safe inside JSON strings
- **Files modified:** `messages/ro/spec.json`
- **Verification:** `python3 -c "import json; json.load()"` passes, parity test passes

**3. [Rule 1 - Bug] TypeScript type complexity: spec namespace not recognized**
- **Found during:** Task 2 (typecheck after creating page.tsx)
- **Issue:** next-intl NamespaceKeys union type exceeded TypeScript's complexity limit after adding spec namespace to global.d.ts — getTranslations("spec") fails type check
- **Fix:** Used `getTranslations()` (no namespace) and `(tSpec as any)(\`spec.${key}\`)` — same pattern as decision 12-04
- **Files modified:** `src/app/(dashboard)/templates/schema/page.tsx`
- **Verification:** `bun run typecheck` exits 0

---

**Total deviations:** 3 auto-fixed (1 missing prerequisite, 1 JSON parse bug, 1 TypeScript complexity)
**Impact on plan:** All auto-fixes necessary for plan execution. No scope creep.

## Issues Encountered

- Playwright E2E tests (`e2e/`) fail with version conflict error — pre-existing issue unrelated to this plan's changes. Unit tests (Vitest, `src/lib/`) all pass.

## Next Phase Readiness

- Export route ready for export button integration (Plan 03/04)
- /templates/schema page ready for nav link addition (Plan 03/04)
- spec.json translations complete — no work needed for i18n in downstream plans

---
*Phase: 15-schema-spec-export*
*Completed: 2026-03-07*
