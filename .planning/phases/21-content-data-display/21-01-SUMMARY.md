---
phase: 21-content-data-display
plan: 01
subsystem: ui
tags: [series-card, badge, score, shadcn]

# Dependency graph
requires: []
provides:
  - Conditional numeric score Badge on series cards (no hollow stars for any case)
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Score display: compute score at top of component body, render Badge variant=secondary only when score is non-null"

key-files:
  created: []
  modified:
    - src/components/series/series-card.tsx

key-decisions:
  - "Score is shown as numeric Badge (e.g. 4.2) not stars — more accurate and readable"
  - "No score UI renders when score is null (no completed session or no scorable answers)"

patterns-established:
  - "Conditional score Badge: {score !== null && <Badge variant='secondary' className='text-xs tabular-nums'>…</Badge>}"

requirements-completed:
  - CON-02
  - CON-03

# Metrics
duration: 5min
completed: 2026-03-08
---

# Phase 21 Plan 01: Content Data Display — Score Badge Summary

**Replaced hollow-star rating row on series cards with a conditional numeric score Badge that only appears for completed sessions with a score**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-08T08:35:00Z
- **Completed:** 2026-03-08T08:40:00Z
- **Tasks:** 1
- **Files modified:** 2 (series-card.tsx, CHANGELOG.md)

## Accomplishments
- Removed hollow star icons that rendered for series with no completed sessions
- Replaced complex star-rendering IIFE with a simple conditional Badge
- Score computation moved to top of SeriesCard function body (cleaner, not in IIFE)
- `Star` import from lucide-react removed (no longer needed)
- Typecheck passes with no new errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Replace star row with conditional numeric score badge** - `47e1c2b` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/components/series/series-card.tsx` — removed Star import and star-rendering IIFE; score computed at component top; conditional `<Badge variant="secondary" className="text-xs tabular-nums">` renders only when score is non-null

## Decisions Made
None - followed plan as specified.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Series card score display is clean — ready for subsequent content/data display plans in phase 21

---
*Phase: 21-content-data-display*
*Completed: 2026-03-08*
