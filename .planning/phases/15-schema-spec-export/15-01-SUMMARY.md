---
phase: 15-schema-spec-export
plan: "01"
subsystem: api
tags: [typescript, vitest, tdd, export, templates]

requires: []
provides:
  - "TemplateExport TypeScript interface (schemaVersion, language, name, description, sections)"
  - "ExportSection and ExportQuestion interfaces with UUID-free field set"
  - "SCHEMA_VERSION constant = 1"
  - "buildExportPayload() function — strips UUIDs, converts scoreWeight string to number, remaps conditionals"
affects:
  - "15-02 (export API route imports buildExportPayload)"
  - "15-03 (schema docs page references TemplateExport shape)"
  - "15-04 (export button calls the route)"

tech-stack:
  added: []
  patterns:
    - "TDD: test file (RED) committed before implementation (GREEN)"
    - "buildExportPayload() as deliberate transform function — never spread DB rows directly into export"
    - "Drizzle decimal-as-string converted via parseFloat() at transform time"

key-files:
  created:
    - src/lib/templates/export-schema.ts
    - src/lib/templates/__tests__/export-schema.test.ts
  modified:
    - CHANGELOG.md

key-decisions:
  - "parseFloat(scoreWeight ?? '1') converts Drizzle decimal string to JS number at export boundary"
  - "conditionalOnQuestionId UUID remapped to sortOrder integer via pre-built Map; named conditionalOnQuestionSortOrder in export"
  - "RawTemplate/RawSection/RawQuestion internal types accept any superset — allows export route to pass DB rows directly without explicit cast"

patterns-established:
  - "Export transform: build UUID→sortOrder map first, then map sections/questions stripping all internal fields"
  - "Test fixtures use makeQuestion/makeSection/makeTemplate helpers with spread overrides"

requirements-completed:
  - EXP-02
  - EXP-03
  - EXP-04
  - EXP-05

duration: 5min
completed: 2026-03-07
---

# Phase 15 Plan 01: TemplateExport Interface + buildExportPayload() Summary

**TemplateExport TypeScript interface and buildExportPayload() function that strips all tenant UUIDs and converts Drizzle decimal scoreWeight to JS number, validated by 7 TDD unit tests**

## Performance

- **Duration:** ~5 min (prerequisite to plan 02)
- **Started:** 2026-03-07T07:37:33Z
- **Completed:** 2026-03-07T07:45:00Z
- **Tasks:** 1 (TDD: RED + GREEN)
- **Files modified:** 3

## Accomplishments

- Defined canonical TemplateExport interface as Wave 0 contract for all downstream plans
- Implemented buildExportPayload() with UUID stripping, scoreWeight parsing, and sortOrder-based conditional remapping
- All 7 unit tests pass (EXP-02 through EXP-05)

## Task Commits

1. **Task 1: TemplateExport interface + buildExportPayload (TDD)** - `cedf9a0` (feat)

## Files Created/Modified

- `src/lib/templates/export-schema.ts` — TemplateExport interface, SCHEMA_VERSION=1, buildExportPayload() function
- `src/lib/templates/__tests__/export-schema.test.ts` — 7 Vitest unit tests covering all EXP requirements
- `CHANGELOG.md` — Added entries for both new files

## Decisions Made

- `parseFloat(scoreWeight ?? "1")` chosen over `Number()` — handles decimal strings like "1.50" correctly
- Internal type `RawTemplate` uses broad types to avoid needing explicit casts when passing DB rows
- Map built from all sections' questions before mapping — ensures cross-section conditional references resolve correctly

## Deviations from Plan

None — plan executed exactly as written. Test file was already present (committed during planning); implementation created from scratch.

## Issues Encountered

None.

## Next Phase Readiness

- `buildExportPayload` ready for import by `GET /api/templates/[id]/export` route (Plan 02)
- Interface types ready for schema docs page (Plan 02/03)

---
*Phase: 15-schema-spec-export*
*Completed: 2026-03-07*
