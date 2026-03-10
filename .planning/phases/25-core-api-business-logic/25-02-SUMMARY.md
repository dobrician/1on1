---
phase: 25-core-api-business-logic
plan: 02
subsystem: api
tags: [zod, validation, rbac, ai, anthropic, haiku]

# Dependency graph
requires:
  - phase: 25-01
    provides: RED test scaffolds for correctionInputSchema, validateReasonSchema, canCorrectSession, reasonValidationResultSchema
  - phase: 24-schema-foundation
    provides: sessionAnswerHistory table and session_correction notification enum
provides:
  - correctionInputSchema Zod schema with UUID + 20/500 char reason validation
  - validateReasonSchema Zod schema for standalone reason validation endpoint
  - canCorrectSession RBAC helper — admin bypass + own-series manager check
  - reasonValidationResultSchema AI output schema with pass/feedback fields
  - validateCorrectionReason async service function using generateObject
  - models.correctionValidator model entry (claude-haiku-4-5)
affects: [25-03-api-routes, any route importing from validations/correction or auth/rbac]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "AI validation via dedicated endpoint with degraded fallback — validateCorrectionReason throws, caller returns { pass: true, feedback: null }"
    - "Zod schemas co-located in src/lib/validations/ with named exports for both schema and inferred type"
    - "RBAC helpers follow existing pattern: boolean function accepting userId + userRole + resource"

key-files:
  created:
    - src/lib/validations/correction.ts
    - src/lib/ai/schemas/correction.ts
  modified:
    - src/lib/auth/rbac.ts
    - src/lib/ai/models.ts
    - src/lib/ai/service.ts

key-decisions:
  - "validateCorrectionReason throws on error — caller (route) returns degraded { pass: true, feedback: null } so AI outages never block the mutation"
  - "correctionValidator uses claude-haiku-4-5 — short structured output, Haiku is sufficient and cost-effective"
  - "canCorrectSession uses existing isAdmin() helper — consistent with all other RBAC helpers in rbac.ts"
  - "Pre-existing translation-parity test failure (analytics.chart.sessionHistory keys) confirmed out-of-scope — not introduced by this plan"

patterns-established:
  - "AI result schemas live in src/lib/ai/schemas/ following z.object with .describe() on every field"
  - "AI service functions use generateObject (not generateText) for structured output"

requirements-completed: [WFLOW-01, WFLOW-02, WFLOW-03, ANLT-01]

# Metrics
duration: 4min
completed: 2026-03-10
---

# Phase 25 Plan 02: Core API Business Logic Summary

**Zod correction schemas, canCorrectSession RBAC helper, AI reasonValidationResultSchema, and validateCorrectionReason service function — all 25-01 RED tests now GREEN**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-03-10T20:55:35Z
- **Completed:** 2026-03-10T20:57:30Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Created `src/lib/validations/correction.ts` with `correctionInputSchema` (UUID required, reason 20-500 chars) and `validateReasonSchema` — all 10 Zod tests pass GREEN
- Added `canCorrectSession` to `src/lib/auth/rbac.ts` — admin bypass + own-series manager check — 4 new RBAC tests pass GREEN, 5 existing tests unchanged
- Created `src/lib/ai/schemas/correction.ts` with `reasonValidationResultSchema` (pass: boolean, feedback: max 200 chars) — all 5 AI schema tests pass GREEN
- Added `correctionValidator: anthropic("claude-haiku-4-5")` to `src/lib/ai/models.ts`
- Added `validateCorrectionReason` async function to `src/lib/ai/service.ts` using `generateObject` with `reasonValidationResultSchema`

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement Zod schemas and RBAC helper** - `5b92b7c` (feat)
2. **Task 2: Implement AI schema, model tier, and service function** - `96f6433` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/lib/validations/correction.ts` - correctionInputSchema + validateReasonSchema exports
- `src/lib/auth/rbac.ts` - canCorrectSession appended at end
- `src/lib/ai/schemas/correction.ts` - reasonValidationResultSchema + ReasonValidationResult type
- `src/lib/ai/models.ts` - correctionValidator entry added
- `src/lib/ai/service.ts` - validateCorrectionReason function + reasonValidationResultSchema import

## Decisions Made
- validateCorrectionReason throws on error — caller in route.ts returns degraded `{ pass: true, feedback: null }` so AI outages never block the correction mutation
- claude-haiku-4-5 selected for correctionValidator — short structured output task, cost-effective tier
- Used existing `isAdmin()` helper inside `canCorrectSession` — consistent with established RBAC pattern

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Pre-existing `translation-parity.test.ts` failure detected (missing `analytics.chart.sessionHistory` keys in Romanian locale). Verified this failure existed before any changes on this plan — not caused by this work, logged as out-of-scope.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All 24 tests from Plans 25-01 RED scaffolds now pass GREEN
- `correctionInputSchema`, `validateReasonSchema`, `canCorrectSession`, `reasonValidationResultSchema`, `validateCorrectionReason` all exported and ready for Plan 25-03 API route implementation
- Typecheck clean (0 errors)
- Plan 25-03 can import directly from these five files to build the two API routes

---
*Phase: 25-core-api-business-logic*
*Completed: 2026-03-10*

## Self-Check: PASSED

- src/lib/validations/correction.ts — FOUND
- src/lib/auth/rbac.ts — FOUND
- src/lib/ai/schemas/correction.ts — FOUND
- src/lib/ai/models.ts — FOUND
- src/lib/ai/service.ts — FOUND
- commit 5b92b7c (Task 1) — FOUND
- commit 96f6433 (Task 2) — FOUND
