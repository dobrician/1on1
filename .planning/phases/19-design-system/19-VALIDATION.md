---
phase: 19
slug: design-system
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-08
---

# Phase 19 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `bun run test` |
| **Full suite command** | `bun run test && bun run typecheck && bun run lint` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bun run test`
- **After every plan wave:** Run `bun run test && bun run typecheck && bun run lint`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 19-01-01 | 01 | 0 | DES-02, DES-03, DES-04 | unit | `bun run test` | ❌ Wave 0 | ⬜ pending |
| 19-02-01 | 02 | 1 | DES-04 | unit | `bun run test src/components/ui/__tests__/empty-state.test.tsx` | ❌ Wave 0 | ⬜ pending |
| 19-02-02 | 02 | 1 | DES-04 | unit | `bun run test && bun run typecheck` | ❌ Wave 0 | ⬜ pending |
| 19-03-01 | 03 | 1 | DES-01 | manual | grep audit + visual inspection | manual-only | ⬜ pending |
| 19-03-02 | 03 | 1 | DES-02 | unit | `bun run test src/components/series/__tests__/session-timeline-badge.test.tsx` | ❌ Wave 0 | ⬜ pending |
| 19-03-03 | 03 | 1 | DES-03 | unit | `bun run test src/components/session/__tests__/section-label.test.tsx` | ❌ Wave 0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/components/ui/__tests__/empty-state.test.tsx` — renders icon, heading, description, optional action (DES-04)
- [ ] `src/components/session/__tests__/section-label.test.tsx` — no `uppercase` class on SectionLabel output (DES-03)
- [ ] `src/components/series/__tests__/session-timeline-badge.test.tsx` — `in_progress` → `"default"` variant, `completed` → `"outline"` variant (DES-02)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Auth and app primary buttons use same color | DES-01 | CSS token resolution cannot be asserted in Vitest node env | Open /login and /dashboard — compare button color; grep for hardcoded color className overrides bypassing `--primary` |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
