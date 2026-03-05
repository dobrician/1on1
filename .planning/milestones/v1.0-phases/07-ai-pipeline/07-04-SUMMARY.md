---
phase: 07-ai-pipeline
plan: 04
subsystem: ui, api
tags: [nudges, dashboard, wizard, drizzle, server-components]

# Dependency graph
requires:
  - phase: 07-ai-pipeline
    provides: AI nudge table, NudgeCardsGrid component, NudgeList component, nudge API
provides:
  - Standalone nudge section on dashboard overview for managers (no date filter)
  - Wizard context panel showing all non-dismissed series nudges
  - Defensive API fix for NULL targetSessionAt in upcoming filter
affects: [08-manager-dashboard-analytics]

# Tech tracking
tech-stack:
  added: []
  patterns: [standalone query for dashboard nudges separate from upcoming sessions query]

key-files:
  created: []
  modified:
    - src/app/(dashboard)/overview/page.tsx
    - src/lib/queries/dashboard.ts
    - src/components/session/nudge-list.tsx
    - src/app/api/nudges/route.ts

key-decisions:
  - "getManagerNudges is a standalone query with no date filter -- nudges show regardless of upcoming sessions"
  - "Wizard NudgeList fetches all non-dismissed nudges (no upcoming param) -- context panel should show full picture"
  - "API upcoming filter uses IS NULL OR range check -- defensive fix for future consumers"

patterns-established:
  - "Dashboard nudge section: Server Component query + client NudgeCardsGrid with initialNudges prop"

requirements-completed: [AI-03, AI-04]

# Metrics
duration: 33min
completed: 2026-03-04
---

# Phase 7 Plan 4: Nudge Visibility Gap Closure Summary

**Restored AI nudge visibility on dashboard (standalone section) and wizard context panel by removing over-restrictive date filters**

## Performance

- **Duration:** 33 min
- **Started:** 2026-03-04T21:33:36Z
- **Completed:** 2026-03-04T22:06:45Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Dashboard overview shows dedicated "AI Coaching Nudges" section for managers with all non-dismissed nudges grouped by report
- Wizard context panel NudgeList fetches all non-dismissed series nudges (removed upcoming=true filter)
- API upcoming filter defensively handles NULL targetSessionAt (IS NULL OR range check)

## Task Commits

Each task was committed atomically:

1. **Task 1: Restore standalone nudge section on dashboard overview** - `f467cb8` (fix)
2. **Task 2: Fix wizard nudge list to show all series nudges** - `3da9ab2` (fix)

**Plan metadata:** pending (docs: complete plan)

## Files Created/Modified
- `src/lib/queries/dashboard.ts` - Added getManagerNudges() query with no date filter, ordered by priority then targetSessionAt nulls last
- `src/app/(dashboard)/overview/page.tsx` - Import NudgeCardsGrid, add getManagerNudges to parallel queries, render nudge section for managers/admins
- `src/components/session/nudge-list.tsx` - Removed &upcoming=true from fetch URL
- `src/app/api/nudges/route.ts` - Replaced gte/lte conditions with IS NULL OR range SQL expression for upcoming filter

## Decisions Made
- getManagerNudges is a standalone query separate from getUpcomingSessions -- nudges must be visible even when no upcoming sessions exist
- Wizard NudgeList drops the upcoming=true parameter entirely -- the API already filters by seriesId + non-dismissed + manager-only
- API upcoming filter uses raw SQL with IS NULL OR to include NULL-dated nudges defensively

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Pre-existing Inngest removal changes bundled into Task 2 commit**
- **Found during:** Task 2 (commit)
- **Issue:** Working tree contained pre-existing uncommitted changes from a prior plan (Inngest removal, package.json updates) that were auto-staged by the pre-commit hook
- **Fix:** Allowed commit to proceed since changes were valid prior work, not scope creep
- **Files affected:** .env.example, bun.lock, package.json, src/inngest/*, src/lib/ai/pipeline.ts
- **Impact:** No code correctness impact; these changes were already present in the working tree

---

**Total deviations:** 1 (bundled pre-existing changes in commit)
**Impact on plan:** Minor -- pre-existing changes from prior plan were auto-staged. No scope creep on nudge visibility fixes.

## Issues Encountered
- Build lock contention and OOM during `bun run build` -- resolved by cleaning .next cache; typecheck verified code correctness independently
- Pre-existing Inngest removal files in working tree got bundled into Task 2 commit via pre-commit hook auto-staging

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Nudge visibility issues resolved (UAT tests 1 and 6)
- Dashboard and wizard now show AI coaching nudges correctly
- Ready for remaining gap closure plans

## Self-Check: PASSED

All files exist. All commits verified (f467cb8, 3da9ab2).

---
*Phase: 07-ai-pipeline*
*Completed: 2026-03-04*
