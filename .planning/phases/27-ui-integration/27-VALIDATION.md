---
phase: 27
slug: ui-integration
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-13
---

# Phase 27 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (v8, node environment) |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `bun run test --run src/components/session/__tests__/` |
| **Full suite command** | `bun run test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bun run test --run src/components/session/__tests__/`
- **After every plan wave:** Run `bun run test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 27-01-01 | 01 | 1 | CORR-01, CORR-03, WFLOW-04, WFLOW-05 | unit | `bun run test --run src/components/session/__tests__/` | ❌ Wave 0 | ⬜ pending |
| 27-02-01 | 02 | 2 | CORR-01 | unit | `bun run test --run src/components/session/__tests__/amended-badge.test.tsx` | ❌ Wave 0 | ⬜ pending |
| 27-03-01 | 03 | 3 | WFLOW-04, WFLOW-05 | unit | `bun run test --run src/components/session/__tests__/answer-correction-form.test.tsx` | ❌ Wave 0 | ⬜ pending |
| 27-04-01 | 04 | 4 | CORR-03 | unit | `bun run test --run src/components/session/__tests__/correction-history-panel.test.tsx` | ❌ Wave 0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/components/session/__tests__/amended-badge.test.tsx` — stubs for CORR-01 (badge renders for corrected answers, not for uncorrected)
- [ ] `src/components/session/__tests__/correction-history-panel.test.tsx` — stubs for CORR-03 (collapsed/expanded default, entry rendering, actor name)
- [ ] `src/components/session/__tests__/answer-correction-form.test.tsx` — stubs for WFLOW-04 and WFLOW-05 (AI feedback states, original vs new layout)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Debounced AI feedback fires after typing stops (800ms) | WFLOW-04 | Requires real browser interaction and timing | Open session detail, click edit on an answer, type a reason, wait ~1s, verify AI feedback appears |
| Edit affordance hidden for non-manager/admin roles | WFLOW-05 | Role-based UI visibility | Log in as member, open session detail, verify no edit icons on answer rows |
| Inline form shows correct original answer value | WFLOW-05 | Requires live DB data | As manager, click edit on a corrected answer, verify "Original" field shows the pre-correction value |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
