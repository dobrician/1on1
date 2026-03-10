---
phase: 24
slug: schema-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-10
---

# Phase 24 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (globals: true, environment: node) |
| **Config file** | `vitest.config.ts` at project root |
| **Quick run command** | `bun run test` |
| **Full suite command** | `bun run test && bun run typecheck` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bun run test`
- **After every plan wave:** Run `bun run test && bun run typecheck`
- **Before `/gsd:verify-work`:** `bun run test && bun run typecheck && bun run lint && bunx drizzle-kit migrate` must all be green
- **Max feedback latency:** ~15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 24-01-01 | 01 | 0 | CORR-02 | unit | `bun run test src/lib/db/schema/__tests__/answer-history.test.ts` | ❌ Wave 0 | ⬜ pending |
| 24-01-02 | 01 | 0 | CORR-02 | unit | `bun run test src/lib/db/schema/__tests__/enums.test.ts` | ❌ Wave 0 | ⬜ pending |
| 24-01-03 | 01 | 1 | CORR-02 | unit | `bun run test src/lib/db/schema/__tests__/answer-history.test.ts` | ✅ Wave 0 | ⬜ pending |
| 24-01-04 | 01 | 1 | CORR-02 | unit | `bun run test src/lib/db/schema/__tests__/enums.test.ts` | ✅ Wave 0 | ⬜ pending |
| 24-01-05 | 01 | 2 | CORR-02 | integration | `bunx drizzle-kit migrate` | manual | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/db/schema/__tests__/answer-history.test.ts` — stubs for CORR-02 schema shape (sessionAnswerHistory columns, export)
- [ ] `src/lib/db/schema/__tests__/enums.test.ts` — stubs for notificationTypeEnum includes 'session_correction'

*Wave 0 creates failing tests before implementation begins.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| RLS blocks cross-tenant reads | CORR-02 | Requires live PostgreSQL instance with two tenants | Create two tenants, insert history rows for tenant A, connect as tenant B's SET LOCAL context, confirm query returns 0 rows |
| FORCE ROW LEVEL SECURITY blocks adminDb | CORR-02 | Requires superuser connection test | Connect via adminDb (no SET LOCAL), confirm history table returns 0 rows without tenant context |
| `bunx drizzle-kit migrate` runs cleanly | CORR-02 | Integration step against live DB | Run against local Docker DB, confirm 0 errors, confirm table and enum value exist in DB |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
