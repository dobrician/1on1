---
phase: 18-critical-bugs
plan: 01
subsystem: testing
tags: [vitest, tiptap, unit-test, tdd, red-phase]

# Dependency graph
requires: []
provides:
  - "Failing unit tests (RED) for contentToHtml() helper — behavioral contract for Plan 02 GREEN phase"
affects: [18-02]

# Tech tracking
tech-stack:
  added: []
  patterns: ["TDD RED phase: write failing tests before implementation exists"]

key-files:
  created: ["src/lib/session/__tests__/tiptap-render.test.ts"]
  modified: ["CHANGELOG.md"]

key-decisions:
  - "Test 2 asserts result != '[object Object]' and contains text 'Hello' — avoids fragile exact-HTML assertions since generateHTML output may vary by extension config"
  - "src/lib/session/ directory created fresh — no prior module existed at this path"

patterns-established:
  - "TDD pattern: test file imports from non-existent module; confirmed RED by running vitest (module not found error)"

requirements-completed: [BUG-01]

# Metrics
duration: 3min
completed: 2026-03-08
---

# Phase 18 Plan 01: contentToHtml Failing Tests (RED Phase) Summary

**5 failing Vitest tests establish the behavioral contract for the `contentToHtml()` helper: HTML passthrough, Tiptap JSON-to-HTML rendering, null/undefined safety, and malformed-object guard**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-08T06:57:18Z
- **Completed:** 2026-03-08T06:57:58Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments
- Created `src/lib/session/__tests__/tiptap-render.test.ts` with all 5 required test cases
- Confirmed RED state: vitest exits with "Cannot find module '../tiptap-render'" — module intentionally absent
- CHANGELOG.md updated under [Unreleased] → Added

## Task Commits

Each task was committed atomically:

1. **Task 1: Write failing tests for contentToHtml** - `aff2d1f` (test)

**Plan metadata:** _(docs commit follows)_

_Note: TDD RED phase — single test commit, no implementation commit in this plan._

## Files Created/Modified
- `src/lib/session/__tests__/tiptap-render.test.ts` - 5 failing unit tests for contentToHtml() covering all specified behaviors
- `CHANGELOG.md` - Added entry under [Unreleased] documenting the new test file

## Decisions Made
- Test 2 asserts `result != '[object Object]'` and `result.contains('Hello')` rather than exact HTML — avoids fragility from Tiptap extension config differences
- Created `src/lib/session/` directory as a new module boundary for session utility helpers

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None — directory creation (`src/lib/session/__tests__/`) was needed since the path didn't exist, but this was expected setup work.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Plan 02 can now implement `src/lib/session/tiptap-render.ts` with `contentToHtml()` to make these 5 tests pass (GREEN phase)
- Test file is committed; implementation module does not exist — clean handoff state

---
*Phase: 18-critical-bugs*
*Completed: 2026-03-08*
