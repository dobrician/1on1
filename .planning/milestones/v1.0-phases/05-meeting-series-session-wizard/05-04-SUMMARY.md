---
phase: 05-meeting-series-session-wizard
plan: 04
subsystem: ui, api
tags: [tiptap, rich-text-editor, notes, talking-points, action-items, encryption, auto-save, context-panel]

# Dependency graph
requires:
  - phase: 05-meeting-series-session-wizard
    plan: 01
    provides: Per-category schema (JSONB shared_notes, category columns), session data structures, encryptNote/decryptNote
  - phase: 05-meeting-series-session-wizard
    plan: 02
    provides: Wizard shell with useReducer state, category step, answer auto-save, useDebounce hook
  - phase: 05-meeting-series-session-wizard
    plan: 03
    provides: Context panel, question history dialog, score sparkline
provides:
  - Tiptap rich text notes editor with shared/private tabs and formatting toolbar
  - Private notes with server-side AES-256-GCM encryption (encrypt on write, decrypt on read)
  - Talking points list with add, check-off, delete, and carried-from badge
  - Inline action item creation with title, assignee, and optional due date
  - API routes for shared notes, private notes, talking points, and action items
  - Context panel integrated into wizard shell with category-scoped historical data
  - Aggregate save status tracking across all mutation types
  - Zod validation schemas for all new session data endpoints
affects: [05-05-summary-completion, 06-action-item-review, 07-ai-insights]

# Tech tracking
tech-stack:
  added: ["@tiptap/react@3.20.0", "@tiptap/pm@3.20.0", "@tiptap/starter-kit@3.20.0", "@tiptap/extension-link@3.20.0"]
  patterns: [tiptap-ssr-safe-editor, per-category-notes-auto-save, encrypted-private-notes-api, optimistic-mutation-pattern, aggregate-save-status]

key-files:
  created:
    - src/components/session/notes-editor.tsx
    - src/components/session/talking-point-list.tsx
    - src/components/session/action-item-inline.tsx
    - src/app/api/sessions/[id]/notes/route.ts
    - src/app/api/sessions/[id]/notes/private/route.ts
    - src/app/api/sessions/[id]/talking-points/route.ts
    - src/app/api/sessions/[id]/action-items/route.ts
  modified:
    - src/components/session/category-step.tsx
    - src/components/session/wizard-shell.tsx
    - src/lib/validations/session.ts
    - CHANGELOG.md
    - package.json
    - bun.lock

key-decisions:
  - "Tiptap editors use immediatelyRender: false to prevent SSR hydration mismatch (per RESEARCH.md Pitfall 1)"
  - "Private notes store EncryptedPayload as JSON string in content column, decrypted server-side on GET"
  - "Notes auto-save via useDebounce with visibilitychange flush for tab-switch data safety"
  - "Talking points and action items use optimistic mutations with rollback on error"
  - "Aggregate save status tracks activeSavingCount from child components plus answer save status"
  - "All useMemo hooks moved before early returns to comply with React hooks rules-of-hooks"

patterns-established:
  - "Tiptap editor pattern: two instances (shared/private) per category, toolbar with chain().focus().toggle*().run()"
  - "Auto-save pattern: useDebounce for periodic saves + visibilitychange/beforeunload for emergency flush"
  - "Encrypted notes API: encryptNote on PUT, JSON.parse + decryptNote on GET, graceful fallback for legacy data"
  - "Category-scoped data: fetch all, group by category client-side, pass slices to CategoryStep"
  - "Aggregate save status: INC_SAVING/DEC_SAVING actions in reducer, combined with answer saveStatus"

requirements-completed: [SESS-07, SESS-08, SESS-09, SESS-10]

# Metrics
duration: 10min
completed: 2026-03-04
---

# Phase 5 Plan 4: Notes, Talking Points & Action Items Summary

**Tiptap rich text notes (shared + encrypted private), inline talking points with check-off, and action item creation per category with auto-save and context panel integration**

## Performance

- **Duration:** 10 min
- **Started:** 2026-03-04T08:11:36Z
- **Completed:** 2026-03-04T08:21:36Z
- **Tasks:** 2
- **Files modified:** 13

## Accomplishments
- Tiptap rich text editor with formatting toolbar (bold, italic, lists, links) renders in shared/private tabs per category
- Private notes encrypted server-side with AES-256-GCM via existing encryptNote/decryptNote infrastructure
- Talking points support add (Enter to submit), check-off toggle, delete, and "carried from Session #N" badges
- Inline action item creation with title, assignee select (from series participants), and optional due date
- All entities auto-save with 500ms debounce; visibilitychange flushes pending saves on tab switch
- Context panel integrated into wizard shell layout (right sidebar desktop, mobile slide-in overlay)
- Question history dialog wired to context panel for per-question answer timeline across sessions
- Aggregate save status indicator reflects all pending mutations (answers, notes, talking points, action items)

## Task Commits

Each task was committed atomically:

1. **Task 1: Install tiptap, build notes editor, talking points, action items, and API routes** - `ddcd01d` (feat)
2. **Task 2: Integrate notes, talking points, action items, and context panel into wizard shell** - `da49fba` (feat)

## Files Created/Modified

- `src/components/session/notes-editor.tsx` - Tiptap rich text editor with shared/private tabs, formatting toolbar, auto-save via debounce
- `src/components/session/talking-point-list.tsx` - Talking points with add/check-off/delete and carried-from badge
- `src/components/session/action-item-inline.tsx` - Inline action item form with title, assignee select, due date
- `src/app/api/sessions/[id]/notes/route.ts` - Shared notes PUT (updates session JSONB per category)
- `src/app/api/sessions/[id]/notes/private/route.ts` - Private notes GET (decrypt) and PUT (encrypt)
- `src/app/api/sessions/[id]/talking-points/route.ts` - Talking points GET/POST/PATCH/DELETE with category filter
- `src/app/api/sessions/[id]/action-items/route.ts` - Action items GET/POST/PATCH with assignee resolution
- `src/components/session/category-step.tsx` - Now renders questions + notes + talking points + action items
- `src/components/session/wizard-shell.tsx` - Fetches private notes/talking points/action items, integrates context panel
- `src/lib/validations/session.ts` - Added 7 new Zod schemas for notes, talking points, and action items
- `CHANGELOG.md` - Phase 5 Plan 4 entries
- `package.json` - tiptap dependencies added
- `bun.lock` - lockfile updated

## Decisions Made

- **Tiptap SSR safety**: Both editors use `immediatelyRender: false` to prevent hydration mismatch, per RESEARCH.md Pitfall 1 guidance.
- **Private notes storage format**: EncryptedPayload serialized as JSON string in the text content column. GET route parses JSON and decrypts; graceful fallback for legacy unencrypted data.
- **Auto-save with visibility flush**: Notes use useDebounce for periodic auto-save plus visibilitychange listener that flushes pending saves immediately on tab switch (Pitfall 3 from RESEARCH.md).
- **Optimistic mutations**: Talking points and action items use optimistic insert/toggle with rollback on error for snappy UX.
- **Aggregate save status**: Added activeSavingCount to wizard reducer (INC_SAVING/DEC_SAVING actions). Combined with answer save status to show unified "Saving..."/"All changes saved" indicator.
- **Hooks before early returns**: Moved all useMemo hooks with data dependency before the loading/error early returns, using null guards, to comply with React rules-of-hooks lint rule.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] EditorToolbar type mismatch with useEditor return type**
- **Found during:** Task 1 (notes editor component)
- **Issue:** `ReturnType<typeof useEditor>` was `Editor` (non-null) in tiptap v3, but `useEditor` returns `Editor | null`
- **Fix:** Added `| null` to EditorToolbar's editor prop type
- **Files modified:** src/components/session/notes-editor.tsx
- **Verification:** TypeScript compiles without errors
- **Committed in:** ddcd01d (Task 1 commit)

**2. [Rule 1 - Bug] React hooks called after early return in wizard-shell**
- **Found during:** Task 2 (wizard shell integration)
- **Issue:** 6 useMemo hooks were placed after the loading/error early returns, violating React rules-of-hooks
- **Fix:** Moved all useMemo hooks before the early returns with null guards (`if (!data) return []`)
- **Files modified:** src/components/session/wizard-shell.tsx
- **Verification:** ESLint rules-of-hooks passes, no conditional hook calls
- **Committed in:** da49fba (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 bugs)
**Impact on plan:** Both auto-fixes necessary for correct TypeScript compilation and React rules compliance. No scope creep.

## Issues Encountered
None beyond the auto-fixed deviations above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All per-category discussion tools complete (notes, talking points, action items)
- Context panel shows category-specific historical data from previous sessions
- Ready for Plan 05 (summary screen and session completion flow)
- Score computation and session lifecycle transitions are the remaining wizard features

## Self-Check: PASSED

All 10 created/modified files verified as present on disk. Both task commits (ddcd01d, da49fba) verified in git log.

---
*Phase: 05-meeting-series-session-wizard, Plan: 04*
*Completed: 2026-03-04*
