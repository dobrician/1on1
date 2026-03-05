---
status: testing
phase: 05-meeting-series-session-wizard
source: 05-01-SUMMARY.md, 05-02-SUMMARY.md, 05-03-SUMMARY.md, 05-04-SUMMARY.md, 05-05-SUMMARY.md
started: 2026-03-04T09:00:00Z
updated: 2026-03-04T09:00:00Z
---

## Current Test
<!-- OVERWRITE each test - shows where we are -->

number: 1
name: Sessions sidebar navigation
expected: |
  Sidebar shows a "Sessions" item with a calendar icon. Clicking it navigates to the sessions page.
awaiting: user response

## Tests

### 1. Sessions sidebar navigation
expected: Sidebar shows a "Sessions" item with a calendar icon. Clicking it navigates to the sessions page.
result: [pending]

### 2. Empty state and create series
expected: Sessions page shows an empty state with a message and a button/link to create a new meeting series. Clicking it navigates to /sessions/new.
result: [pending]

### 3. Create series form
expected: Form shows fields for selecting a report (team member), cadence (weekly/biweekly/monthly/custom), preferred day and time, and a questionnaire template. Submitting creates the series and redirects to the sessions page or series detail.
result: [pending]

### 4. Series card grid
expected: After creating a series, the sessions page shows a card with the report's name/avatar, cadence info, next session date, and a "Start" button. Multiple series display in a responsive grid.
result: [pending]

### 5. Series detail page
expected: Clicking a series card opens a detail page showing series settings (report, cadence, template, preferred day/time) and a session history timeline. A "Start Session" or "Resume" button is visible.
result: [pending]

### 6. Start session opens wizard
expected: Clicking "Start" on a series card or "Start Session" on the detail page opens the wizard in a full-page layout with no sidebar. The URL is /wizard/[sessionId].
result: [pending]

### 7. Wizard category navigation
expected: Wizard shows category pill tabs at the top. Clicking a tab switches to that category's questions. Prev/Next buttons navigate between categories. A "Recap" tab appears first showing previous session highlights or a first-session welcome.
result: [pending]

### 8. Question type widgets
expected: Each question renders the appropriate input widget based on its type: text area for text, clickable stars for rating 1-5, numbered buttons (1-10) for rating 1-10, two large toggle buttons for yes/no, radio-style buttons for multiple choice, and emoji buttons for mood.
result: [pending]

### 9. Answer auto-save
expected: After filling in an answer and waiting ~1 second, the top bar shows a "Saved" or "All changes saved" indicator. Refreshing the page retains the answers.
result: [pending]

### 10. Rich text notes editor
expected: Each category step shows a notes editor below the questions. The editor has a formatting toolbar (bold, italic, lists, links). Two tabs: "Shared" (visible to both) and "Private" (encrypted, manager-only).
result: [pending]

### 11. Talking points
expected: Each category step shows a talking points section. You can add a new talking point by typing and pressing Enter. Items can be checked off (toggled) and deleted. Carried-over points show a "from Session #N" badge.
result: [pending]

### 12. Inline action items
expected: Each category step shows an action items section. You can create an action item with a title, select an assignee (from series participants), and optionally set a due date. Created items appear in the list.
result: [pending]

### 13. Context panel (desktop)
expected: On desktop, a right sidebar panel shows historical context scoped to the current category: previous session's notes, previous answers with "View history" buttons, and open action items. On the recap step, it shows a score trend sparkline and all open action items.
result: [pending]

### 14. Summary screen
expected: After filling all categories, a "Summary" or "Review" tab appears as the final step. It shows a read-only recap of all answers, notes, talking points, and action items grouped by category, with a computed score at the top.
result: [pending]

### 15. Complete session
expected: Clicking "Complete Session" on the summary screen marks the session as completed, computes a score, and navigates back to the series detail page. The series card now shows the session score and the next scheduled session date.
result: [pending]

## Summary

total: 15
passed: 0
issues: 0
pending: 15
skipped: 0

## Gaps

[none yet]
