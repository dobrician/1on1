---
phase: 28-playwright-e2e-test-suite
plan: "03"
subsystem: e2e-tests
tags: [playwright, e2e, corrections, rbac, debug]
dependency_graph:
  requires: [28-01]
  provides: [E2E-03, E2E-04]
  affects: []
tech_stack:
  added: []
  patterns: [fixtures-per-role, structured-json-report, hypothesis-tracking]
key_files:
  created:
    - e2e/corrections.spec.ts
    - e2e/reports/session-summary-debug-dev.json
  modified:
    - e2e/debug-session-summary.spec.ts
    - CHANGELOG.md
decisions:
  - "Amended badge test uses test.skip with documented diagnosis — seed UUIDs fail Zod uuid() validation, API returns 400; documented for future fix"
  - "debug spec targets dev server (port 4301) via adminPage fixture — no manual login, no hardcoded UAT base URL"
  - "neon_websocket hypothesis correctly identifies Next.js HMR ws:// — not Neon; session summary is clean locally"
metrics:
  duration: "~15 min"
  completed: "2026-03-13"
  tasks_completed: 2
  files_changed: 4
---

# Phase 28 Plan 03: Corrections Spec and Enhanced Debug Summary

**One-liner:** RBAC corrections E2E spec (manager/member edit icon, form flow, AI feedback) plus enhanced debug spec writing structured JSON report with hypothesis flags for session summary crash diagnosis.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | RBAC corrections spec — edit icon visibility, form, AI, badge, history | 7e731ff | e2e/corrections.spec.ts |
| 2 | Enhance debug-session-summary.spec.ts for dev server | d2eb5ed | e2e/debug-session-summary.spec.ts, e2e/reports/session-summary-debug-dev.json |

## Verification Results

```
corrections.spec.ts:   8 passed, 1 skipped (intentional — seed UUID issue)
debug-session-summary: 2 passed
Combined run:          10 passed, 1 skipped
```

### Corrections spec results
- Manager sees edit icon (Pencil with title="Correct Answer"): PASS
- Member does NOT see edit icon: PASS
- Manager can open and close inline correction form: PASS
- AI feedback appears after typing; submit button always enabled (advisory only): PASS
- Amended badge test: SKIPPED with diagnosis (see Deviations)
- Correction history panel visible: PASS

### Debug spec results
- Session detail HTTP 200, no application error: PASS
- Session summary HTTP 200, no crashes, report written: PASS
- Report: 0 page errors, 0 network errors, WebSocket = Next.js HMR only (not Neon)
- Hypothesis `neon_websocket`: matched HMR ws:// URL (false positive — not Neon)
- Hypothesis `hydration_error`: false
- Hypothesis `error_event_object`: false

## Decisions Made

1. **Amended badge test skip**: Seed data answer IDs use non-RFC4122 UUID variant bits (`6xxx` instead of `[89ab]xxx`). Zod `z.string().uuid()` rejects them with "answerId must be a valid UUID". The `beforeAll` correction creation via API fails with 400. Using `test.skip(!setupComplete, explanation)` keeps the test code in place for when seed data is fixed.

2. **Debug spec fixture migration**: Replaced manual login against hardcoded `http://localhost:4300` (UAT) with `adminPage` fixture targeting dev server via `baseURL: http://localhost:4301`. The `debug-uat` project in playwright.config.ts remains for manual UAT debugging.

3. **Session summary locally clean**: Both page load tests confirm HTTP 200, no crashes. The `[object ErrorEvent]` crash reported in UAT was not reproduced locally. Debug report written to `e2e/reports/session-summary-debug-dev.json` for ongoing diagnostics.

## Deviations from Plan

### Auto-fixed Issues

None — plan executed as written with one documented skip.

### Documented Diagnostic Finding

**Seed UUID Validation Incompatibility**
- **Found during:** Task 1 — Amended badge setup
- **Issue:** Seed data uses non-RFC4122 UUIDs (e.g., `66666666-0001-4000-6000-000000000001` where `6xxx` variant bits fail Zod uuid() validation). Production records use PostgreSQL `gen_random_uuid()` which generates proper RFC4122 UUIDs. The `correctionInputSchema` correctly validates production input but rejects seed IDs.
- **Impact:** Cannot create test corrections via API in test environment. Amended badge E2E test cannot run.
- **Fix path:** Either (a) update seed.ts to use proper UUID variant bits, or (b) relax `correctionInputSchema.answerId` from `.uuid()` to `.regex()` accepting any UUID-shaped string. Option (a) preferred — keeps API validation strict.
- **Deferred to:** `deferred-items.md`

## Self-Check: PASSED

- [x] `e2e/corrections.spec.ts` — exists
- [x] `e2e/debug-session-summary.spec.ts` — exists (rewritten)
- [x] `e2e/reports/session-summary-debug-dev.json` — exists, valid JSON
- [x] Commit 7e731ff — corrections spec
- [x] Commit d2eb5ed — debug spec + report
