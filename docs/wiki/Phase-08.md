# Phase 8: Manager Dashboard & Analytics

**Status**: Complete
**Depends on**: Phase 6, Phase 7
**Completed**: 2026-03-04

## Goal

Managers have a home screen that surfaces everything they need, and analytics charts reveal trends across sessions and teams.

## Success Criteria

1. Dashboard shows upcoming sessions (next 7 days), overdue action items grouped by report, and quick stats (total reports, sessions this month, average score)
2. Dashboard shows last 5 completed sessions with scores and a "Start session" button for today's scheduled sessions
3. Analytics shows line charts of individual scores over time, bar charts of per-category averages, and session-over-session comparison
4. Team analytics shows aggregated scores across reports (with anonymized option) and a heatmap of team x category scores
5. Action item velocity chart, meeting adherence chart, and CSV export are available, all powered by pre-computed analytics snapshots

## What Was Built

- **Plan 08-01**: Analytics snapshot computation via Inngest background job with cron scheduling
- **Plan 08-02**: Dashboard home screen with upcoming sessions, overdue action items, quick stats, and recent sessions cards
- **Plan 08-03**: Individual analytics — score trend line chart, category breakdown bar chart, session comparison view
- **Plan 08-04**: Team analytics — SVG dot matrix heatmap (size+color encoding), aggregated category scores, anonymization toggle
- **Plan 08-05**: Action item velocity chart, meeting adherence chart, CSV export with UTF-8 BOM
- **Plan 08-06**: Gap closure — fixed analytics page crash, NaN scores, hardcoded category filter, CSV encoding; all categories now derived dynamically from template sections
- **Plan 08-07**: Gap closure — live fallback queries for team averages/heatmap, fixed velocity roleFilter, added seed data for snapshots and completed action items

## Key Decisions

- All analytics charts use Recharts with CSS variable-based theming (no hardcoded colors)
- Categories are derived dynamically from template sections rather than hardcoded
- Team heatmap uses custom SVG dot matrix rather than a third-party library
- Live fallback queries ensure analytics work even when snapshots haven't been computed yet
- CSV export includes UTF-8 BOM for Excel compatibility

## Key Files

- `src/app/(dashboard)/overview/page.tsx` — Dashboard home screen
- `src/app/(dashboard)/analytics/page.tsx` — Individual analytics
- `src/app/(dashboard)/analytics/team/page.tsx` — Team analytics
- `src/components/analytics/` — All chart components (score-trend, category-breakdown, velocity, adherence, heatmap, etc.)
- `src/lib/inngest/functions/compute-analytics.ts` — Background analytics computation

## Requirements

DASH-01 through DASH-05, ANLT-01 through ANLT-09
