# Phase 5: Meeting Series & Session Wizard

**Status**: Complete
**Depends on**: Phase 4

## Goal

Managers can run structured 1:1 sessions through a step-by-step wizard with full context from previous meetings.

## Success Criteria

1. Manager can create a 1:1 series with a report, set cadence (weekly/biweekly/monthly/custom), preferred day/time, and default template
2. Session wizard presents questions one at a time with progress indicator, rendering the correct input widget per question type
3. Context panel shows notes from last 3 sessions, open action items, and score trend sparklines (last 6 sessions)
4. Both parties can add talking points, use shared notes (rich text), create private notes (encrypted), and create action items inline
5. All answers auto-save with 500ms debounce, navigation supports next/previous/jump, and manager confirms completion from a summary screen

## Plans

- **Plan 05-01**: Schema migration, series CRUD, card grid, start session, sidebar nav — Complete
- **Plan 05-02**: Wizard layout, shell, question widgets, category navigation, recap screen — Complete
- **Plan 05-03**: Context panel, question history dialog, score sparklines — Complete
- **Plan 05-04**: Tiptap notes (shared + private), talking points, inline action items — Complete
- **Plan 05-05**: Session scoring, summary screen, completion flow, series updates — Complete

## Key Decisions

- One category/topic per screen — all questions for a category displayed together on a single scrollable screen
- Full-page immersive wizard experience — app sidebar hidden, no navigation chrome
- Context panel as always-visible sidebar showing context relevant to the current category step
- `shared_notes` migrated from TEXT to JSONB (`Record<string, string>` keyed by category)
- Wizard state managed via single `useReducer` at shell level for centralized answer tracking
- `navigator.sendBeacon` for `beforeunload` save — reliable on page close
- Tiptap editors use `immediatelyRender: false` to prevent SSR hydration mismatch
- Private notes stored as JSON-serialized EncryptedPayload, decrypted server-side on GET
- Score normalization uses `SCORABLE_TYPES` set to filter non-numeric types
- Completion API computes score, duration, next_session_at in single transaction

## Requirements

MEET-01 through MEET-06, SESS-01 through SESS-15
