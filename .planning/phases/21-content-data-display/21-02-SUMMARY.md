---
phase: 21-content-data-display
plan: 02
subsystem: ui
tags: [collapsible, badge, category-step, wizard, talking-points, action-items]

# Dependency graph
requires:
  - phase: 19-design-system
    provides: Badge component (shadcn/ui variant=secondary pattern)
provides:
  - Collapsible Talking Points section with count Badge in wizard CategoryStep
  - Collapsible Action Items section with count Badge in wizard CategoryStep
affects: [wizard, category-step, sessions]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Collapsible section pattern: CollapsibleTrigger contains SectionLabel + ChevronDown; CollapsibleContent holds section body"
    - "Count Badge only renders when count > 0 (conditional on count !== undefined && count > 0)"
    - "Chevron rotation: empty string when open, -rotate-90 when closed"

key-files:
  created: []
  modified:
    - src/components/session/category-step.tsx

key-decisions:
  - "Count badge omitted when count = 0 to avoid visual noise in empty sections"
  - "Both sections expanded by default (useState(true)) — consistent with plan spec"
  - "Notes section not wrapped in Collapsible — it is the primary writing area, always visible"

patterns-established:
  - "SectionLabel accepts optional count prop — Badge renders inline after label text when count > 0"

requirements-completed: [CON-04]

# Metrics
duration: 5min
completed: 2026-03-08
---

# Phase 21 Plan 02: Content & Data Display — Collapsible CategoryStep Sections Summary

**Collapsible Talking Points and Action Items sections with count Badges added to wizard CategoryStep using shadcn Collapsible and existing Badge (variant=secondary)**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-08T09:05:00Z
- **Completed:** 2026-03-08T09:10:00Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments
- `SectionLabel` component updated to accept optional `count` prop, renders `Badge` (variant=secondary) inline when count > 0
- Talking Points section wrapped in `Collapsible` with chevron toggle; count badge shows total talking points
- Action Items section wrapped in `Collapsible` with chevron toggle; count badge shows total action items
- Both sections default to open (`useState(true)`); Notes section left unchanged
- TypeScript passes with no errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Add collapsible sections with count badges to CategoryStep** - `bf70d10` (feat)

**Plan metadata:** _(docs commit follows)_

## Files Created/Modified
- `src/components/session/category-step.tsx` - Added useState, Collapsible imports, ChevronDown; updated SectionLabel with count prop; replaced Talking Points and Action Items divs with Collapsible wrappers
- `CHANGELOG.md` - Added CON-04 entry under Changed

## Decisions Made
- Count Badge omitted when count = 0 — no badge shown for empty sections (cleaner UI)
- Both sections start expanded — users see all content on first load
- Notes section not made collapsible — it is the primary writing area

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- CON-04 satisfied: Talking Points and Action Items sections now have collapse affordance and item count visibility
- Ready for next plan in phase 21-content-data-display

---
*Phase: 21-content-data-display*
*Completed: 2026-03-08*
