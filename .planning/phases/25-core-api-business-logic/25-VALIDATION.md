---
phase: 25
slug: core-api-business-logic
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-10
---

# Phase 25 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (globals: true, environment: node) |
| **Config file** | `vitest.config.ts` at project root |
| **Quick run command** | `bun run test` |
| **Full suite command** | `bun run test && bun run typecheck && bun run lint` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bun run test`
- **After every plan wave:** Run `bun run test && bun run typecheck`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 25-01-01 | 01 | 0 | WFLOW-02 | unit | `bun run test src/lib/validations/__tests__/correction.test.ts` | ❌ W0 | ⬜ pending |
| 25-01-02 | 01 | 0 | WFLOW-01 | unit | `bun run test src/lib/auth/__tests__/rbac.test.ts` | ❌ W0 | ⬜ pending |
| 25-01-03 | 01 | 0 | WFLOW-03 | unit | `bun run test src/lib/ai/schemas/__tests__/correction.test.ts` | ❌ W0 | ⬜ pending |
| 25-02-01 | 02 | 1 | WFLOW-02 | unit | `bun run test src/lib/validations/__tests__/correction.test.ts` | ✅ W0 | ⬜ pending |
| 25-02-02 | 02 | 1 | WFLOW-01 | unit | `bun run test src/lib/auth/__tests__/rbac.test.ts` | ✅ W0 | ⬜ pending |
| 25-02-03 | 02 | 1 | ANLT-01 | unit | `bun run test src/lib/utils/__tests__/scoring.test.ts` | ❌ W0 | ⬜ pending |
| 25-03-01 | 03 | 2 | NOTIF-03 | unit | `bun run test src/lib/validations/__tests__/correction.test.ts` | ✅ W0 | ⬜ pending |
| 25-03-02 | 03 | 2 | WFLOW-03 | unit | `bun run test src/lib/ai/schemas/__tests__/correction.test.ts` | ✅ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/validations/__tests__/correction.test.ts` — stubs for correctionInputSchema Zod behavior (WFLOW-02)
- [ ] `src/lib/auth/__tests__/rbac.test.ts` — stubs for `canCorrectSession` (WFLOW-01)
- [ ] `src/lib/ai/schemas/__tests__/correction.test.ts` — stubs for `reasonValidationResultSchema` shape (WFLOW-03)
- [ ] `src/lib/utils/__tests__/scoring.test.ts` — stubs for `computeSessionScore` after hypothetical answer change (ANLT-01)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Full atomic transaction (snapshot + update + score + audit log, no partial state) | ANLT-01, NOTIF-03 | Requires live PostgreSQL — Vitest unit tests cannot verify cross-table transactional atomicity | Start dev server, submit a correction via API, verify all 4 rows updated atomically (use Drizzle Studio or psql) |
| Manager blocked from correcting other manager's session | WFLOW-01 | Requires DB setup with real tenant/series/user relationships | Log in as manager, attempt to correct a session from a series that belongs to a different manager's report — expect 403 |
| AI validation endpoint returns feedback without blocking correction | WFLOW-03 | Requires live AI SDK + real HTTP requests | Call `/validate-reason` independently, verify it returns `{pass, feedback}` without writing to DB; then call `/corrections` without calling validate-reason first — expect it to succeed |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
