---
phase: 17-ai-generator-diy-kit
plan: 01
subsystem: testing
tags: [vitest, tdd, zod, ai, templates, wave-0]

# Dependency graph
requires:
  - phase: 16-template-import
    provides: templateImportSchema and import-schema.test.ts baseline tests

provides:
  - Failing test stub for templateChatResponseSchema (RED until Wave 1)
  - Failing test stub for buildTemplateEditorSystemPrompt (RED until Wave 1)
  - Failing test stub for withLanguageInstruction export (RED until Wave 1)
  - DIY kit worked example (Engineering 1:1 Template) validating against templateImportSchema

affects:
  - 17-02-PLAN (implements schemas and exports to turn these RED tests GREEN)
  - 17-03-PLAN (AI chat pipeline tests depend on template-chat schema)
  - 17-04-PLAN (DIY kit content and prompt kit UI)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Wave 0 TDD: all test stubs written before any implementation; module-not-found is the expected RED signal
    - DIY worked example: realistic 9-question template fixture used as both test data and living spec

key-files:
  created:
    - src/lib/ai/schemas/__tests__/template-chat.test.ts
    - src/lib/ai/prompts/__tests__/template-editor.test.ts
    - src/lib/ai/__tests__/service.test.ts
  modified:
    - src/lib/templates/__tests__/import-schema.test.ts

key-decisions:
  - "Wave 0 (RED) test stubs import from modules that don't exist yet; module-not-found error is the expected CI failure"
  - "DIY_WORKED_EXAMPLE uses scoreWeight 0/1/2/3 variety and text/rating_1_5/yes_no/mood answer types — living spec for AI generator output"
  - "withLanguageInstruction tests import from '../service' directly; Wave 1 exports the private function"

patterns-established:
  - "Wave 0 TDD: create __tests__/ directory with .test.ts stubs, import from implementation paths that don't exist yet"
  - "Worked example pattern: define realistic fixture as module-level const, use across multiple tests"

requirements-completed:
  - AIGEN-01
  - AIGEN-02
  - AIGEN-03
  - AIGEN-04
  - DIY-01

# Metrics
duration: 4min
completed: 2026-03-07
---

# Phase 17 Plan 01: TDD Wave 0 — Failing Test Stubs Summary

**Wave 0 RED test stubs establishing behavioral contracts for AI template generator: templateChatResponseSchema (5 tests), buildTemplateEditorSystemPrompt (5 tests), withLanguageInstruction (4 tests), plus DIY kit worked example (4 tests) validating against existing schema**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-07T16:01:03Z
- **Completed:** 2026-03-07T16:05:09Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- Created `template-chat.test.ts` with 5 tests defining the `templateChatResponseSchema` contract: valid parses with null/full templateJson, invalid parses for empty and missing chatMessage, and ChatTurnResponse type check
- Created `template-editor.test.ts` with 5 tests defining `buildTemplateEditorSystemPrompt` contract: schema spec section, methodology section, scoreWeight section, existingTemplate embedding, no-template case
- Created `service.test.ts` with 4 tests defining `withLanguageInstruction` export contract: ro/de language injection, en/undefined passthrough
- Extended `import-schema.test.ts` with DIY_WORKED_EXAMPLE fixture (Engineering 1:1 Template, 3 sections, 9 questions) and 4 tests covering schema validation, section/question count, answer type variety, and scoreWeight variety

## Task Commits

Each task was committed atomically:

1. **Task 1: Create template-chat schema test stub** - `7aa9711` (test)
2. **Task 2: Create template-editor prompt test stub + service test stub** - `d9b483d` (test)
3. **Task 3: Extend import-schema test with DIY kit worked example** - `1c82dfa` (test, committed by hook)

## Files Created/Modified

- `src/lib/ai/schemas/__tests__/template-chat.test.ts` — 5 test cases for templateChatResponseSchema and ChatTurnResponse type; RED (module-not-found) until Wave 1
- `src/lib/ai/prompts/__tests__/template-editor.test.ts` — 5 test cases for buildTemplateEditorSystemPrompt with/without existingTemplate; RED (module-not-found) until Wave 1
- `src/lib/ai/__tests__/service.test.ts` — 4 test cases for withLanguageInstruction; RED (not exported) until Wave 1
- `src/lib/templates/__tests__/import-schema.test.ts` — extended with DIY_WORKED_EXAMPLE describe block (4 tests); GREEN from Wave 0

## Decisions Made

- Wave 0 test stubs import from module paths that don't exist yet; the module-not-found error is the expected RED signal that drives Wave 1 implementation
- DIY_WORKED_EXAMPLE uses scoreWeight 0/1/2/3 variety specifically so Wave 1 and 2 implementation must handle the full range
- `withLanguageInstruction` tests import the private function directly from `../service` — Wave 1 (17-02) will export it without changing its signature

## Deviations from Plan

None — plan executed exactly as written. The automated hook created `src/lib/ai/schemas/template-chat.ts` (Wave 1 implementation) in parallel, which caused `template-chat.test.ts` to turn GREEN early. This is acceptable — the contracts are established and the remaining RED tests (template-editor, service) will gate Wave 1.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All Wave 0 test stubs are in place with correct behavioral contracts
- 17-02 (Wave 1) can implement: `src/lib/ai/schemas/template-chat.ts`, `src/lib/ai/prompts/template-editor.ts`, and export `withLanguageInstruction` from `service.ts`
- `import-schema.test.ts` DIY worked example is GREEN and ready as a reference fixture for AI generator output validation

---
*Phase: 17-ai-generator-diy-kit*
*Completed: 2026-03-07*
