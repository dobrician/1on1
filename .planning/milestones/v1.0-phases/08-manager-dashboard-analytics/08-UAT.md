---
status: diagnosed
phase: 08-manager-dashboard-analytics
source: 08-01-SUMMARY.md, 08-02-SUMMARY.md, 08-03-SUMMARY.md, 08-04-SUMMARY.md, 08-05-SUMMARY.md
started: 2026-03-04T20:10:00Z
updated: 2026-03-04T22:15:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Dashboard Overview - Upcoming Sessions
expected: Navigate to /overview. See "Upcoming Sessions" section with session cards. Each card shows report name, series name, scheduled date. Today's sessions have Start/Resume button. Cards with AI nudges show inline nudge preview with expandable "+N more".
result: pass

### 2. Dashboard Overview - Overdue Action Items
expected: On /overview, see "Overdue Items" section. Action items are grouped by report name. Each item shows a red badge with the number of days overdue.
result: pass

### 3. Dashboard Overview - Quick Stats
expected: On /overview, see three stat cards: number of direct reports, sessions this month, and average score. Values should reflect your actual data.
result: pass

### 4. Dashboard Overview - Recent Sessions
expected: On /overview, see "Recent Sessions" section. Each entry shows session date, report name, a color-coded score badge (green for high, red for low), and a short AI summary snippet.
result: issue
reported: "recent sessions are listed on the dashboard, but when i click on them, i get a 404 page. Link used /sessions/{seriesId}/history/{id} instead of /sessions/{id}/summary"
severity: major

### 5. Analytics Sidebar Navigation
expected: Sidebar shows an "Analytics" link with a bar chart icon. Clicking it navigates to /analytics. Visible to all roles (admin, manager, member).
result: issue
reported: "clicking analytics menu item gets a white page with server-side exception. Error: subquery uses ungrouped column session.session_score; also team member counts showed 0"
severity: blocker

### 6. Analytics Overview Page
expected: Navigate to /analytics. See a list of report cards — each shows the person's name, latest score, and session count. Clicking a card navigates to their individual analytics page.
result: pass

### 7. Individual Analytics - Score Trend Chart
expected: On an individual analytics page (/analytics/individual/[id]), see a line chart showing session scores over time. Y-axis ranges 1-5. Hovering data points shows date and score tooltip. If fewer than 3 sessions, a "More data after 3+ sessions" hint appears.
result: issue
reported: "the chart only displays the 3 existing data points, but no line"
severity: major

### 8. Individual Analytics - Category Breakdown
expected: Below the score trend, see a horizontal bar chart showing per-category averages (wellbeing, engagement, performance, etc.). Each bar has a distinct color. Categories with limited data show a dashed/faded visual treatment.
result: issue
reported: "No category data available for this period. Hardcoded English category names didn't match actual template section names."
severity: major

### 9. Individual Analytics - Session Comparison
expected: Below category breakdown, see a session comparison table. Two dropdown selectors let you pick sessions to compare. Table shows each category with scores from both sessions and a green/red/gray delta indicator.
result: issue
reported: "No scorable category data found for these sessions. Same hardcoded category filter bug."
severity: major

### 10. Period Selector
expected: On individual analytics page, see period selector with preset buttons (30d, 3mo, 6mo, 1yr) and a custom date range option. Changing the period updates all charts without a full page reload.
result: pass

### 11. Team Analytics Page
expected: From /analytics, see a "Teams" section with team cards. Click a team to navigate to /analytics/team/[id]. See aggregated category score cards with bar visualizations and a dot matrix heatmap below.
result: issue
reported: "No category data available for this period. No heatmap data available for this period. Team queries only use analytics_snapshot table with no live fallback."
severity: major

### 12. Team Heatmap
expected: On team analytics page, see an SVG dot matrix where rows are team members, columns are categories. Dot size reflects sample count, dot color reflects score (green >= 4, amber 3-3.9, red < 3). Hollow circles appear for insufficient data (< 3 samples). Hovering shows exact score and sample count.
result: issue
reported: "No category data available for this period. No heatmap data available for this period. Only has sessions for two people but team shows 5 members. Team queries only use analytics_snapshot with no live fallback."
severity: major

### 13. Anonymization Toggle
expected: On team analytics page, see an anonymization switch/toggle. Turning it on replaces member names with "Member 1", "Member 2", etc. across the heatmap and overview.
result: issue
reported: "No members visible on the team page, so there's nothing to anonymize"
severity: major

### 14. Velocity Chart
expected: On individual analytics page, see an area chart showing average days to complete action items per month. Chart has a gradient fill and a horizontal dashed reference line at 7 days (target).
result: issue
reported: "Velocity chart is empty: No action item velocity data available for this period."
severity: major

### 15. Adherence Chart
expected: On individual analytics page, see a stacked bar chart showing meeting adherence per month — green bars for completed sessions, amber for cancelled, red for missed. Tooltip shows adherence percentage.
result: pass

### 16. CSV Export
expected: On individual analytics page, see small download/export icon buttons on each chart section header. Also see an "Export All Data" button. Clicking any export button downloads a CSV file. The file opens correctly in a spreadsheet app with proper column headers and data.
result: issue
reported: "CSV saves but encoding is all wrong — Romanian characters garbled: Aplica»õie finalizatƒÉ etc."
severity: major

## Summary

total: 16
passed: 6
issues: 10
pending: 0
skipped: 0

## Gaps

- truth: "Clicking a recent session navigates to session summary page"
  status: resolved
  reason: "User reported: recent sessions link used /sessions/{seriesId}/history/{id} instead of /sessions/{id}/summary — resulted in 404"
  severity: major
  test: 4
  root_cause: "Incorrect href template in recent-sessions.tsx — used seriesId/history/id pattern instead of id/summary"
  artifacts:
    - path: "src/components/dashboard/recent-sessions.tsx"
      issue: "Wrong URL pattern in Link href"
  missing: []
  debug_session: ""

- truth: "Analytics page loads without server error"
  status: failed
  reason: "User reported: clicking analytics menu item gets a white page with server-side exception. Error: subquery uses ungrouped column session.session_score; also team member counts showed 0"
  severity: blocker
  test: 5
  root_cause: "Correlated scalar subquery selects bare s2.session_score inside a GROUP BY outer query — PostgreSQL rejects ungrouped column. Team count=0 is cascade from crash killing withTenantContext block."
  artifacts:
    - path: "src/app/(dashboard)/analytics/page.tsx"
      issue: "Lines 61-69: latestScore subquery uses ungrouped column in GROUP BY context"
  missing:
    - "Remove correlated subquery for latestScore — compute in app code or use lateral join"
    - "After fixing crash, verify team_members seed data exists"
  debug_session: ".planning/debug/analytics-ungrouped-column-team-count.md"

- truth: "Score trend chart shows line connecting data points over time"
  status: failed
  reason: "User reported: the chart only displays the 3 existing data points, but no line"
  severity: major
  test: 7
  root_cause: "parseFloat on Drizzle decimal strings may produce NaN. Recharts skips line segments for NaN y-values, rendering dots but no connecting line."
  artifacts:
    - path: "src/lib/analytics/queries.ts"
      issue: "Lines 114-119: parseFloat(r.score!) on decimal column; lines 87-91: same on snapshot path"
  missing:
    - "Use Number() instead of parseFloat for Drizzle decimal strings"
    - "Add .filter(r => !isNaN(r.score)) after mapping"
  debug_session: ""

- truth: "Category breakdown shows per-category averages from actual template sections"
  status: failed
  reason: "User reported: No category data available for this period. Hardcoded English category names didn't match actual template section names."
  severity: major
  test: 8
  root_cause: "CATEGORY_METRICS dict in constants.ts only has 6 English keys. Actual templates have 13 section names (including Romanian). 10/13 sections silently dropped by compute.ts line 108 and filtered out by queries.ts."
  artifacts:
    - path: "src/lib/analytics/constants.ts"
      issue: "Lines 27-34: CATEGORY_METRICS hardcodes only 6 English category names"
    - path: "src/lib/analytics/compute.ts"
      issue: "Lines 106-108: silently skips sections not in CATEGORY_METRICS"
    - path: "src/lib/analytics/queries.ts"
      issue: "getCategoryAverages, getTeamAverages, getTeamHeatmapData all filter by hardcoded metric names"
  missing:
    - "Derive categories dynamically from template sections instead of hardcoded list"
    - "Remove CATEGORY_METRICS as runtime filter — keep METRIC_NAMES for operational metrics only"
    - "Store snapshot row for every section with scorable answers"
  debug_session: ".planning/debug/analytics-hardcoded-categories.md"

- truth: "Session comparison shows category scores from two selected sessions"
  status: failed
  reason: "User reported: No scorable category data found for these sessions. Same hardcoded category filter bug."
  severity: major
  test: 9
  root_cause: "Same CATEGORY_METRICS hardcoding issue as test 8. Additionally, seed sessions may lack answerNumeric values for scorable question types."
  artifacts:
    - path: "src/lib/analytics/queries.ts"
      issue: "getSessionComparison uses live query but seed data may lack scorable answers"
    - path: "src/lib/analytics/constants.ts"
      issue: "Same hardcoded CATEGORY_METRICS coupling"
  missing:
    - "Fix hardcoded categories (same as test 8)"
    - "Verify seed sessions have answerNumeric populated for scorable question types"
  debug_session: ".planning/debug/analytics-hardcoded-categories.md"

- truth: "Team analytics page shows aggregated category scores and heatmap"
  status: failed
  reason: "User reported: No category data available for this period. No heatmap data available for this period. Team queries only use analytics_snapshot table with no live fallback."
  severity: major
  test: 11
  root_cause: "getTeamAverages() and getTeamHeatmapData() query only analytics_snapshots table with no live fallback. Seed never populates analytics_snapshots. Unconditional memberCount>=3 filter suppresses data even when anonymize=false."
  artifacts:
    - path: "src/lib/analytics/queries.ts"
      issue: "Lines 293-341: getTeamAverages no live fallback; line 334: unconditional memberCount>=3 filter"
    - path: "src/lib/analytics/queries.ts"
      issue: "Lines 351-418: getTeamHeatmapData no live fallback"
    - path: "src/lib/db/seed.ts"
      issue: "No seedAnalyticsSnapshots() call — table always empty in dev"
  missing:
    - "Add live fallback to getTeamAverages() querying session_answers directly"
    - "Add live fallback to getTeamHeatmapData()"
    - "Make memberCount>=3 filter conditional on anonymize=true"
    - "Add seedAnalyticsSnapshots() to seed.ts"
  debug_session: ".planning/debug/team-analytics-no-data.md"

- truth: "Team heatmap shows SVG dot matrix with members, categories, color-coded scores"
  status: failed
  reason: "User reported: No category data or heatmap data available. Only 2 people have sessions but team shows 5 members. Team queries only use analytics_snapshot with no live fallback."
  severity: major
  test: 12
  root_cause: "Same as test 11 — getTeamHeatmapData() has no live fallback and analytics_snapshots is empty."
  artifacts:
    - path: "src/lib/analytics/queries.ts"
      issue: "Lines 351-418: getTeamHeatmapData no live fallback"
  missing:
    - "Same fix as test 11"
  debug_session: ".planning/debug/team-analytics-no-data.md"

- truth: "Anonymization toggle replaces member names with Member 1, Member 2, etc."
  status: failed
  reason: "User reported: No members visible on the team page, so there's nothing to anonymize"
  severity: major
  test: 13
  root_cause: "UI renders heatmap rows only for HeatmapDataPoint entries. Since getTeamHeatmapData returns [] (no snapshots/no live fallback), zero rows render — looks like no members exist. Can't test anonymization toggle without visible members."
  artifacts:
    - path: "src/lib/analytics/queries.ts"
      issue: "getTeamHeatmapData returns [] — cascade from test 11/12 root cause"
  missing:
    - "Fix team data queries (test 11/12) — anonymization toggle can be retested after"
  debug_session: ".planning/debug/team-analytics-no-data.md"

- truth: "Velocity chart shows area chart of average days to complete action items per month"
  status: failed
  reason: "User reported: Velocity chart is empty — No action item velocity data available for this period."
  severity: major
  test: 14
  root_cause: "Seed data has zero completed action items for Dave (the report being viewed). Only completed item is assigned to Bob. Additionally, manager roleFilter uses fragile raw SQL subquery."
  artifacts:
    - path: "src/lib/db/seed.ts"
      issue: "Lines 1175-1213: only 1 completed action item, assigned to Bob not Dave"
    - path: "src/lib/analytics/queries.ts"
      issue: "Lines 446-451: manager roleFilter uses raw SQL subquery instead of Drizzle constructs"
  missing:
    - "Add 2-3 completed action items assigned to Dave with completedAt spread across past months"
    - "Replace raw SQL manager roleFilter with Drizzle inArray subquery"
  debug_session: ".planning/debug/velocity-chart-empty.md"

- truth: "CSV export downloads correctly encoded file with proper column headers and data"
  status: failed
  reason: "User reported: CSV saves but encoding is all wrong — Romanian characters garbled"
  severity: major
  test: 16
  root_cause: "CSV response has no UTF-8 BOM. Excel ignores Content-Type charset=utf-8 after file is saved to disk — relies on BOM byte sequence to detect encoding."
  artifacts:
    - path: "src/app/api/analytics/export/route.ts"
      issue: "Line 271: result.csv returned as-is with no BOM prefix"
  missing:
    - "Prepend \\uFEFF (UTF-8 BOM) to response body"
  debug_session: ".planning/debug/csv-export-encoding.md"
