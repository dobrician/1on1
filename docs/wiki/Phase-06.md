# Phase 6: Action Items & Session History

**Status**: Complete
**Depends on**: Phase 5

## Goal

Action items carry over between sessions creating accountability, and users can browse and search their complete session history.

## Success Criteria

1. User can create action items with title, description, assignee, due date, and track status (Open, In Progress, Completed, Cancelled)
2. Unfinished action items automatically carry over and appear flagged in the next session's context panel
3. Dedicated list view shows all open action items across all series
4. User can view a chronological timeline of sessions in a series and open read-only detail views of completed sessions
5. User can search across session notes (full-text) and filter sessions by date range and status

## Plans

- **Plan 06-01**: Standalone action item APIs, Action Items page, context panel overdue badges, sidebar nav — Complete
- **Plan 06-02**: Session summary page, enhanced timeline click-through, History page with filters — Complete
- **Plan 06-03**: Full-text search GIN indexes, search API, Cmd+K command palette, History search bar — Complete

## Key Decisions

- Simple two-state status model in UI (Open/Done) mapping to DB enum values (open/completed)
- No explicit carry-over mechanism — open items queried by series + status (always visible, not copied)
- Drizzle `alias()` for self-join on users table (assignee + report in single query)
- Optimistic update on status toggle: completed items removed from list immediately
- Sheet component (slide-in panel) for editing action items
- `websearch_to_tsquery` for natural language query handling (handles quotes and minus operators)
- Shared notes searched on-the-fly via JSONB text extraction (no GIN index) — acceptable for v1 volumes
- Cursor-based pagination using `scheduledAt+id` for stable ordering
- History page uses manual fetch with URL state instead of useQuery for filter changes
- SearchTrigger dispatches synthetic Cmd+K keydown to toggle palette

## Requirements

ACTN-01, ACTN-02, ACTN-03, ACTN-04, ACTN-05, HIST-01, HIST-02, HIST-03, HIST-04

> **Note**: This phase can execute in parallel with Phases 7 and 9 (all depend only on Phase 5).
