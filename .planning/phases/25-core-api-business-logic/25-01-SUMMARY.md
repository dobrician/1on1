---
phase: 25-core-api-business-logic
plan: "01"
subsystem: testing
tags: [tdd, red-tests, validation, rbac, ai-schema, scoring]
dependency_graph:
  requires: []
  provides: [test-scaffold-25]
  affects: [25-02, 25-03, 25-04]
tech_stack:
  added: []
  patterns: [vitest, zod-safeParse, tdd-red-phase]
key_files:
  created:
    - src/lib/validations/__tests__/correction.test.ts
    - src/lib/ai/schemas/__tests__/correction.test.ts
    - src/lib/utils/__tests__/scoring.test.ts
  modified:
    - src/lib/auth/__tests__/rbac.test.ts
    - CHANGELOG.md
decisions:
  - "scoring.test.ts discovered GREEN on first run — computeSessionScore already implements all required behaviors; no implementation gap"
  - "rbac.test.ts extended rather than replaced — existing canManageTemplates tests preserved and verified still passing"
  - "Zod schema test files fail at import stage (module-not-found) — correct RED behavior for non-existent correction.ts modules"
metrics:
  duration: "4 min"
  completed_date: "2026-03-10"
  tasks_completed: 2
  files_changed: 5
---

# Phase 25 Plan 01: RED Test Scaffold Summary

**One-liner:** Four test files establishing the RED scaffold for correction validation, RBAC authorization, AI result schema, and session scoring behaviors.

## What Was Built

Wrote four test files covering all behavioral contracts that Phase 25 must satisfy. No implementation code was written — this plan establishes the test signal that subsequent plans must turn GREEN.

### Test File Status

| File | Tests | State | Reason |
|------|-------|-------|--------|
| `src/lib/validations/__tests__/correction.test.ts` | 10 cases | RED | `src/lib/validations/correction.ts` does not exist |
| `src/lib/ai/schemas/__tests__/correction.test.ts` | 5 cases | RED | `src/lib/ai/schemas/correction.ts` does not exist |
| `src/lib/auth/__tests__/rbac.test.ts` | 4 new + 5 existing | RED (4) / GREEN (5) | `canCorrectSession` not yet in `rbac.ts`; existing tests unaffected |
| `src/lib/utils/__tests__/scoring.test.ts` | 10 cases | GREEN | `computeSessionScore` already fully implemented |

### Behavioral Contracts Covered

**correctionInputSchema (RED — awaits plan 25-02):**
- Rejects reason strings shorter than 20 chars or longer than 500 chars
- Rejects missing answerId, non-UUID answerId
- Accepts valid UUIDs, optional newAnswerText/newAnswerNumeric/newAnswerJson/skipped fields

**validateReasonSchema (RED — awaits plan 25-02):**
- Rejects reason strings shorter than 20 chars

**reasonValidationResultSchema (RED — awaits plan 25-03):**
- Requires `pass: boolean` and `feedback: string` (max 200 chars)
- Rejects missing fields or oversized feedback

**canCorrectSession RBAC (RED — awaits plan 25-02):**
- Admin: true regardless of managerId match
- Manager + managerId match: true
- Manager + managerId mismatch: false
- Member: false regardless

**computeSessionScore (GREEN — already implemented):**
- Null for empty or all-skipped answers
- rating_1_5 direct mapping
- rating_1_10 normalizes via ((v-1)/9)*4+1
- yes_no: 0→1, 1→5
- Text answers excluded
- Weighted average with per-answer scoreWeight

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | e78af94 | test(25-01): add failing correction Zod schema tests |
| 2 | cb1846b | test(25-01): add canCorrectSession and scoring unit tests |

## Deviations from Plan

### Scoring Tests Discovered GREEN

**Finding during Task 2:**
- The plan noted scoring tests "may or may not pass" and marked either outcome as valid
- `computeSessionScore` is fully implemented with correct normalization for all answer types
- All 10 scoring test cases pass against the existing implementation
- No deviation action required — this is expected discovery in a RED-phase plan

**Result:** scoring.test.ts committed as-is; documented in commit message and SUMMARY.

None other — plan executed exactly as written.

## Self-Check: PASSED

- FOUND: src/lib/validations/__tests__/correction.test.ts
- FOUND: src/lib/ai/schemas/__tests__/correction.test.ts
- FOUND: src/lib/auth/__tests__/rbac.test.ts (modified)
- FOUND: src/lib/utils/__tests__/scoring.test.ts
- FOUND commit e78af94: test(25-01): add failing correction Zod schema tests
- FOUND commit cb1846b: test(25-01): add canCorrectSession and scoring unit tests
