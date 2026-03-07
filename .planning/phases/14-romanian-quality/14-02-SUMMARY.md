---
phase: 14-romanian-quality
plan: 02
subsystem: testing
tags: [i18n, vitest, next-intl, romanian, translations]

# Dependency graph
requires:
  - phase: 14-romanian-quality
    provides: plan 01 diacritic fixes and ICU plural parity — confirmed perfect key parity that parity test validates against
provides:
  - Vitest CI test enforcing en/ro key parity across all 16 translation namespaces
  - Hardcoded English strings eliminated from wizard-shell, wizard-top-bar, and analytics team client
  - Romanian translations for wizard.loadError, wizard.exitWizard, categoryAverages, teamHeatmap
affects: [future translation work — any new en key without ro counterpart fails CI]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "getLeafKeys(obj) flattens nested JSON to dot-path strings for set-comparison parity testing"
    - "queryFn throws generic HTTP status error (not English message) so display layer owns all user-facing strings"

key-files:
  created:
    - src/lib/i18n/__tests__/translation-parity.test.ts
  modified:
    - src/components/session/wizard-shell.tsx
    - src/components/session/wizard-top-bar.tsx
    - src/app/(dashboard)/analytics/team/[id]/client.tsx
    - messages/en/sessions.json
    - messages/ro/sessions.json
    - messages/en/analytics.json
    - messages/ro/analytics.json

key-decisions:
  - "queryFn throws HTTP status code string instead of English message — keeps all user-visible text in translation layer"
  - "exitWizard key is sr-only but still translated — screen reader users in Romanian locale deserve native language labels"
  - "analytics/team/[id]/client.tsx uses useTranslations('analytics') at component scope (client component pattern consistent with phase 12)"

patterns-established:
  - "Translation parity test: one it() per namespace, getLeafKeys Set comparison, missingInRo/missingInEn failure messages"
  - "No queryFn should throw English user-visible messages — throw Error with status code or technical detail only"

requirements-completed: [QUAL-01, QUAL-02, ROLN-04]

# Metrics
duration: 4min
completed: 2026-03-07
---

# Phase 14 Plan 02: Romanian Quality — CI Parity Test + Hardcoded String Fixes Summary

**Vitest CI test enforces en/ro key parity across 16 namespaces; three components converted from hardcoded English to t() calls with full Romanian translations**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-07T06:10:13Z
- **Completed:** 2026-03-07T06:13:47Z
- **Tasks:** 2 (+ checkpoint pending human visual verify)
- **Files modified:** 8

## Accomplishments
- Created `src/lib/i18n/__tests__/translation-parity.test.ts` — 16 namespace tests pass; CI will fail on any future en/ro parity drift
- Eliminated all confirmed hardcoded English strings from wizard-shell.tsx, wizard-top-bar.tsx, and analytics team client.tsx
- Added 4 new translation keys (loadError, exitWizard, categoryAverages, teamHeatmap) to both en and ro files; parity test confirms balance

## Task Commits

Each task was committed atomically:

1. **Task 1: Create CI key parity Vitest test** - `b7657da` (test)
2. **Task 2: Fix hardcoded English strings in 3 components** - `ea69d5e` (feat)

**Plan metadata:** pending (awaiting checkpoint + final commit)

## Files Created/Modified
- `src/lib/i18n/__tests__/translation-parity.test.ts` - 16 parity tests, one per namespace JSON file
- `src/components/session/wizard-shell.tsx` - "Failed to load session" heading → t("wizard.loadError"); queryFn throws HTTP status code
- `src/components/session/wizard-top-bar.tsx` - sr-only "Exit wizard" → t("wizard.exitWizard")
- `src/app/(dashboard)/analytics/team/[id]/client.tsx` - added useTranslations("analytics"); "Category Averages" → t("categoryAverages"); "Team Heatmap" → t("teamHeatmap")
- `messages/en/sessions.json` - added wizard.loadError, wizard.exitWizard
- `messages/ro/sessions.json` - added Romanian: "Sesiunea nu a putut fi încărcată", "Ieși din wizard"
- `messages/en/analytics.json` - added categoryAverages, teamHeatmap
- `messages/ro/analytics.json` - added Romanian: "Medii pe Categorii", "Harta Echipei"

## Decisions Made
- queryFn throws `HTTP ${res.status}` instead of English text — display layer owns all user-visible strings
- exitWizard key translated even though sr-only — screen reader users in Romanian deserve native language
- analytics/team client uses useTranslations at component top (consistent with phase 12 client component pattern)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] queryFn "Failed to load session" was user-visible via error.message**
- **Found during:** Task 2 (wizard-shell.tsx hardcoded string fix)
- **Issue:** The plan targeted line 767 (heading), but line 302 `throw new Error("Failed to load session")` in the queryFn produced the same string shown in the sub-text at line 768 via `error.message`
- **Fix:** Changed queryFn throw to `new Error(\`HTTP \${res.status}\`)` — generic technical string, not user-facing English
- **Files modified:** src/components/session/wizard-shell.tsx
- **Verification:** grep confirms no hardcoded English strings remain; typecheck passes
- **Committed in:** ea69d5e (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 bug — user-visible string hidden in queryFn error throw)
**Impact on plan:** Necessary for correctness — without this fix, Romanian users would still see English text in the error sub-text. No scope creep.

## Issues Encountered
- `bun run test` includes Playwright e2e specs that fail when run under Vitest (pre-existing configuration issue, not introduced by this plan; 27 unit tests pass)

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Task 3 (checkpoint:human-verify) awaits visual confirmation: Romanian strings in wizard top bar and analytics team page, no layout overflow at 1280px
- CI parity test ready — any future translation addition that breaks parity will be caught automatically
- Phase 14 complete after checkpoint approval

---
*Phase: 14-romanian-quality*
*Completed: 2026-03-07*
