---
phase: 25-core-api-business-logic
plan: 03
subsystem: api
tags: [drizzle, zod, rbac, ai, anthropic, audit-log, analytics]

# Dependency graph
requires:
  - phase: 25-02
    provides: correctionInputSchema, validateReasonSchema, canCorrectSession, validateCorrectionReason — all imported by these two routes
  - phase: 24-schema-foundation
    provides: sessionAnswerHistory table — INSERT target for atomic snapshot step
provides:
  - POST /api/sessions/[id]/corrections atomic mutation endpoint
  - POST /api/sessions/[id]/corrections/validate-reason AI reason validation endpoint
affects: [26-email-notifications, 27-ui-correction-flow, any analytics pipeline reading analyticsIngestedAt]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Atomic correction transaction: history INSERT → answer UPDATE → all-answers SELECT → score recompute → session UPDATE (analyticsIngestedAt=null) → audit INSERT"
    - "analyticsIngestedAt=null as invalidation signal for async analytics refresh pipeline"
    - "AI endpoint separation: validate-reason is auth-only (no session/series RBAC), no DB writes"
    - "Graceful AI degradation: validateCorrectionReason throws, route catches and returns { pass: true, feedback: null }"
    - "ZodError.issues[0].message used (Zod v4 API — not .errors)"

key-files:
  created:
    - src/app/api/sessions/[id]/corrections/route.ts
    - src/app/api/sessions/[id]/corrections/validate-reason/route.ts
  modified:
    - CHANGELOG.md

key-decisions:
  - "Zod v4 uses .issues not .errors — auto-fixed ZodError property access to error.issues[0].message"
  - "validate-reason is auth-only (no series RBAC) — reason text is not sensitive, AI response is advisory only"
  - "Pre-existing lint errors (user-menu.tsx, import-schema.test.ts) and translation-parity test failure confirmed out-of-scope"

patterns-established:
  - "Correction mutation pattern: always snapshot before update, invalidate analyticsIngestedAt in same transaction"
  - "AI advisory endpoints: separate from mutation, auth-only guard, zero DB writes, graceful fallback"

requirements-completed: [WFLOW-01, WFLOW-02, WFLOW-03, NOTIF-03, ANLT-01]

# Metrics
duration: 12min
completed: 2026-03-10
---

# Phase 25 Plan 03: Core API Business Logic Summary

**Atomic correction mutation (6-step transaction) and AI reason validation endpoint — Phase 25 API layer complete, typecheck clean, build passing**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-03-10T21:00:00Z
- **Completed:** 2026-03-10T21:12:00Z
- **Tasks:** 2
- **Files modified:** 3 (2 created + CHANGELOG)

## Accomplishments

- Created `src/app/api/sessions/[id]/corrections/route.ts` — atomic `withTenantContext` transaction that snapshots answer history, updates answer, recomputes session score, sets `analyticsIngestedAt=null`, and writes `session.answer_corrected` audit log — all in one DB transaction
- Created `src/app/api/sessions/[id]/corrections/validate-reason/route.ts` — auth-only AI endpoint calling `validateCorrectionReason`; AI failures degrade gracefully to `{ pass: true, feedback: null }` so UI never blocks corrections
- Typecheck clean, build passing, all unit tests pass (pre-existing translation-parity failure is out-of-scope)

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement POST /api/sessions/[id]/corrections (atomic mutation)** - `71388fc` (feat)
2. **Task 2: Implement POST /api/sessions/[id]/corrections/validate-reason (AI endpoint)** - `584ced3` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/app/api/sessions/[id]/corrections/route.ts` — 6-step atomic correction transaction; status/RBAC/cross-session guards; no AI imports
- `src/app/api/sessions/[id]/corrections/validate-reason/route.ts` — auth-only AI endpoint; zero DB writes; graceful degradation
- `CHANGELOG.md` — entries added for both routes

## Decisions Made

- Zod v4 uses `.issues` not `.errors` on `ZodError` — auto-fixed error access pattern (this is the correct Zod v4 API)
- `validate-reason` uses `session.user.contentLanguage` (actual field name from `next-auth.d.ts`) not `preferredLanguage` as written in plan spec — actual TypeScript type takes precedence
- `validate-reason` is auth-only (no series/session RBAC) as specified — reason text is advisory AI content, not sensitive data

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed ZodError property access for Zod v4**
- **Found during:** Task 1 (corrections/route.ts typecheck)
- **Issue:** Plan spec used `error.errors[0].message` but this project uses Zod v4 where the property is `issues` not `errors` — TypeScript error `Property 'errors' does not exist on type 'ZodError<unknown>'`
- **Fix:** Changed to `error.issues[0].message` in both route files
- **Files modified:** src/app/api/sessions/[id]/corrections/route.ts, validate-reason/route.ts
- **Verification:** `bun run typecheck` exits 0
- **Committed in:** 71388fc (Task 1), 584ced3 (Task 2)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Essential for TypeScript correctness. No scope creep.

## Issues Encountered

- Pre-existing `translation-parity.test.ts` failure (missing `analytics.chart.sessionHistory` keys in Romanian) — confirmed same failure as in plan 25-02, not introduced by this plan
- Pre-existing lint errors in `src/components/layout/user-menu.tsx` and `src/lib/templates/__tests__/import-schema.test.ts` — not caused by this work

## Manual Verification Checklist (not blocking)

1. Start dev server: `bun run dev`
2. POST /api/sessions/{completed-session-id}/corrections with valid body → expect 200 + history row in DB
3. POST /api/sessions/{in-progress-session-id}/corrections → expect 409
4. POST /api/sessions/{any-id}/corrections as member user → expect 403
5. POST /api/sessions/{any-id}/corrections/validate-reason with reason "too short" → expect 400
6. POST /api/sessions/{any-id}/corrections/validate-reason with valid reason → expect { pass, feedback }

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 25 API layer complete: both route files exported, typecheck clean, build passing
- Phase 26 (email notifications) can import `session.answer_corrected` audit action from the established pattern
- Phase 27 (UI correction flow) can POST to `/api/sessions/[id]/corrections` and `/validate-reason`
- `analyticsIngestedAt=null` pattern ready for analytics pipeline to detect stale snapshots

---
*Phase: 25-core-api-business-logic*
*Completed: 2026-03-10*

## Self-Check: PASSED

- src/app/api/sessions/[id]/corrections/route.ts — FOUND
- src/app/api/sessions/[id]/corrections/validate-reason/route.ts — FOUND
- commit 71388fc (Task 1) — FOUND
- commit 584ced3 (Task 2) — FOUND
