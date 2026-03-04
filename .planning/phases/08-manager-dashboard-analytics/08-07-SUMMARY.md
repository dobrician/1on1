---
phase: 08-manager-dashboard-analytics
plan: 07
subsystem: analytics
tags: [drizzle, postgresql, live-fallback, team-analytics, velocity, seed-data]

# Dependency graph
requires:
  - phase: 08-manager-dashboard-analytics
    provides: "Analytics snapshot compute, queries, constants, dynamic categories"
provides:
  - "Live fallback queries for team averages and heatmap when snapshots empty"
  - "Fixed velocity chart manager roleFilter using Drizzle constructs"
  - "Conditional anonymization filter (memberCount>=3 only when anonymize=true)"
  - "Seed data: completed action items for Dave, analytics snapshot rows"
affects: [09-notifications-reminders]

# Tech tracking
tech-stack:
  added: []
  patterns: [live fallback after snapshot query for team analytics, conditional anonymization filter]

key-files:
  created: []
  modified:
    - src/lib/analytics/queries.ts
    - src/lib/db/seed.ts
    - src/app/api/analytics/team/[id]/route.ts
    - CHANGELOG.md

key-decisions:
  - "Live fallback queries join session_answers through meeting_series to filter by team member reportIds"
  - "memberCount>=3 filter conditional on anonymize flag -- non-anonymized views show all data"
  - "Delete-then-insert pattern for analytics snapshot seeding (consistent with compute.ts)"

patterns-established:
  - "Team queries: snapshot first, live fallback via session_answers+meeting_series join"

requirements-completed: [ANLT-04, ANLT-05, ANLT-06, ANLT-07, ANLT-08]

# Metrics
duration: 4min
completed: 2026-03-04
---

# Phase 8 Plan 07: Team Analytics Gap Closure Summary

**Live fallback queries for team averages/heatmap, fixed velocity roleFilter, and seed data for snapshots and completed action items**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-04T22:07:59Z
- **Completed:** 2026-03-04T22:11:48Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Team analytics page shows aggregated category scores from live session data when snapshots are empty
- Team heatmap returns per-member per-category scores via live fallback query
- Velocity chart works for managers with proper Drizzle subquery instead of raw SQL with wrong table names
- Anonymization memberCount>=3 filter is now conditional (only when anonymize=true)
- Seed data includes 3 completed action items for Dave and 12 analytics snapshot rows

## Task Commits

Each task was committed atomically:

1. **Task 1: Add live fallback to team queries and fix velocity roleFilter** - `4422718` (fix)
2. **Task 2: Seed completed action items for Dave and analytics snapshots** - `814ea05` (feat)

## Files Created/Modified
- `src/lib/analytics/queries.ts` - Live fallback for getTeamAverages and getTeamHeatmapData; fixed velocity manager roleFilter; conditional anonymize filter
- `src/lib/db/seed.ts` - 3 completed action items for Dave; seedAnalyticsSnapshots function with 12 snapshot rows
- `src/app/api/analytics/team/[id]/route.ts` - Passes anonymize flag to getTeamAverages
- `CHANGELOG.md` - Documented all fixes

## Decisions Made
- Live fallback queries join session_answers through meeting_series.reportId to filter by team members -- same pattern as getCategoryAverages but with GROUP BY on reportId for heatmap
- memberCount>=3 filter made conditional on anonymize flag -- non-anonymized team views should show all data regardless of member count
- Analytics snapshot seed uses delete-then-insert pattern consistent with compute.ts (NULL-safe unique index handling)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All Phase 8 analytics UAT gaps (tests 11, 12, 13, 14) are resolved
- Team analytics, heatmap, anonymization, and velocity chart all functional
- Phase 8 is complete -- ready for Phase 9 (notifications/reminders)

---
*Phase: 08-manager-dashboard-analytics*
*Completed: 2026-03-04*
