# Phase 8: Manager Dashboard & Analytics

**Status**: Not Started
**Depends on**: Phase 6, Phase 7

## Goal

Managers have a home screen that surfaces everything they need, and analytics charts reveal trends across sessions and teams.

## Success Criteria

1. Dashboard shows upcoming sessions (next 7 days), overdue action items grouped by report, and quick stats (total reports, sessions this month, average score)
2. Dashboard shows last 5 completed sessions with scores and a "Start session" button for today's scheduled sessions
3. Analytics shows line charts of individual scores over time, bar charts of per-category averages, and session-over-session comparison
4. Team analytics shows aggregated scores across reports (with anonymized option) and a heatmap of team x category scores
5. Action item velocity chart, meeting adherence chart, and CSV export are available, all powered by pre-computed analytics snapshots

## Planned Scope

- **Plan 08-01**: Dashboard layout (upcoming sessions, overdue items, quick stats, recent sessions)
- **Plan 08-02**: Analytics snapshot computation (Inngest background job)
- **Plan 08-03**: Individual analytics charts (score trends, category breakdown, session comparison)
- **Plan 08-04**: Team analytics (aggregated scores, heatmap, anonymization)
- **Plan 08-05**: Action item velocity, meeting adherence, and CSV export

## Requirements

DASH-01 through DASH-05, ANLT-01 through ANLT-09
