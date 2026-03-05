---
phase: 08-manager-dashboard-analytics
plan: 01
subsystem: analytics
tags: [inngest, drizzle, analytics, cron, snapshot, metrics]

requires:
  - phase: 05-meeting-series-session-wizard
    provides: Session completion flow, session_answer and template_question tables
  - phase: 07-ai-pipeline
    provides: Inngest client with session/completed event, post-session pipeline pattern
provides:
  - Analytics snapshot compute engine (computeSessionSnapshot)
  - Analytics query layer (getScoreTrend, getCategoryAverages, getSessionComparison, getTeamAverages, getTeamHeatmapData)
  - Inngest analytics snapshot function (session/completed trigger)
  - Inngest daily cron sweep for un-ingested sessions
  - Metric name constants and category mappings
affects: [08-03-individual-analytics, 08-04-team-analytics, 08-05-analytics-api]

tech-stack:
  added: []
  patterns: [delete-then-insert for NULL-safe unique indexes, snapshot-first with live fallback queries, rating normalization 1-10 to 1-5]

key-files:
  created:
    - src/lib/analytics/constants.ts
    - src/lib/analytics/compute.ts
    - src/lib/analytics/queries.ts
    - src/inngest/functions/analytics-snapshot.ts
    - src/lib/db/migrations/0011_analytics_ingestion.sql
  modified:
    - src/lib/db/schema/sessions.ts
    - src/inngest/functions/index.ts

key-decisions:
  - "Delete-then-insert instead of onConflictDoUpdate for analytics_snapshot upserts -- PostgreSQL unique indexes treat NULLs as distinct, making conflict detection unreliable for nullable columns (teamId, seriesId)"
  - "Section name maps to category -- template_section.name lowercased matches CATEGORY_METRICS keys (wellbeing, engagement, performance, career, feedback, mood)"
  - "Monthly period granularity for initial snapshots -- periodType always 'month' with first/last day boundaries"
  - "Team averages enforce minimum 3 data points for anonymization -- prevents identifying individual scores in small teams"

patterns-established:
  - "Snapshot-first query pattern: query analytics_snapshot first, fall back to live joins on session_answer+template_question+template_section if no snapshots exist"
  - "Rating normalization: rating_1_10 values transformed to 1-5 scale via ((value-1)/9)*4+1"

requirements-completed: [ANLT-08]

duration: 4min
completed: 2026-03-04
---

# Phase 8 Plan 1: Analytics Snapshot Pipeline Summary

**Inngest-driven analytics snapshot pipeline with per-category score computation, daily cron sweep, and query layer with snapshot-first live fallback**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-04T19:35:35Z
- **Completed:** 2026-03-04T19:39:09Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Analytics snapshot compute engine that processes session answers by category, normalizes ratings, and stores atomic snapshots
- Query layer providing score trends, category averages, session comparison, team averages (3-member minimum), and team heatmap with anonymization
- Inngest function triggered by session/completed event with 3 retries for reliable snapshot computation
- Daily cron sweep at 3 AM catches any sessions that missed ingestion

## Task Commits

Each task was committed atomically:

1. **Task 1: Schema migration and analytics constants** - `398c3d1` (feat)
2. **Task 2: Snapshot compute logic, Inngest functions, and query layer** - `a94bc58` (feat)

## Files Created/Modified
- `src/lib/analytics/constants.ts` - Metric name constants, category mappings, scorable answer types
- `src/lib/analytics/compute.ts` - computeSessionSnapshot with per-category averages and rating normalization
- `src/lib/analytics/queries.ts` - getScoreTrend, getCategoryAverages, getSessionComparison, getTeamAverages, getTeamHeatmapData
- `src/inngest/functions/analytics-snapshot.ts` - computeAnalyticsSnapshot (event-driven) and analyticsSnapshotSweep (cron)
- `src/inngest/functions/index.ts` - Registered both new Inngest functions
- `src/lib/db/schema/sessions.ts` - Added analyticsIngestedAt column
- `src/lib/db/migrations/0011_analytics_ingestion.sql` - Migration for analytics_ingested_at column

## Decisions Made
- Delete-then-insert for analytics_snapshot upserts: PostgreSQL unique indexes treat NULLs as distinct, making onConflictDoUpdate unreliable for nullable columns (teamId, seriesId)
- Section name as category key: template_section.name lowercased matches CATEGORY_METRICS keys
- Monthly period granularity: periodType always "month" for initial implementation
- Team averages require minimum 3 data points to prevent individual identification in small teams

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Snapshot pipeline ready for Plans 03-05 (individual analytics, team analytics, analytics API)
- Query layer exports all functions needed by dashboard and analytics page components
- Inngest functions registered and will run when session/completed events fire

---
*Phase: 08-manager-dashboard-analytics*
*Completed: 2026-03-04*
