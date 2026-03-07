---
phase: 16
slug: template-import
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-07
---

# Phase 16 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.0.18 |
| **Config file** | `vitest.config.ts` (root, already configured with `@` alias) |
| **Quick run command** | `bun run test -- src/lib/templates/__tests__/import-schema.test.ts` |
| **Full suite command** | `bun run test` |
| **Estimated runtime** | ~10 seconds (unit tests only) |

---

## Sampling Rate

- **After every task commit:** Run `bun run test -- src/lib/templates/__tests__/import-schema.test.ts`
- **After every plan wave:** Run `bun run test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 16-01-01 | 01 | 0 | IMP-05 | unit | `bun run test -- src/lib/templates/__tests__/import-schema.test.ts` | ❌ W0 | ⬜ pending |
| 16-01-02 | 01 | 0 | IMP-02, IMP-03, IMP-04 | unit | `bun run test -- src/lib/templates/__tests__/import-schema.test.ts` | ❌ W0 | ⬜ pending |
| 16-02-01 | 02 | 1 | IMP-05 | unit | `bun run test -- src/lib/templates/__tests__/import-schema.test.ts` | ❌ W0 | ⬜ pending |
| 16-02-02 | 02 | 1 | IMP-01 | unit | `bun run test -- src/lib/auth/__tests__/rbac.test.ts` | ❌ W0 | ⬜ pending |
| 16-03-01 | 03 | 2 | IMP-01, IMP-02, IMP-03, IMP-04 | manual | N/A — browser dialog flow | manual | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/templates/__tests__/import-schema.test.ts` — covers IMP-02, IMP-03, IMP-04, IMP-05; round-trip test against `buildExportPayload` (reuse `makeQuestion`/`makeSection`/`makeTemplate` fixtures from `export-schema.test.ts`)
- [ ] `src/lib/auth/__tests__/rbac.test.ts` — covers IMP-01 RBAC guard (`canManageTemplates()` returns false for member role)

*Existing infrastructure covers: `vitest.config.ts` (no changes needed), `export-schema.test.ts` fixture helpers (reusable)*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Multi-step dialog state transitions (file → preview → conflict → success) | IMP-01, IMP-02, IMP-03, IMP-04 | `<input type="file">` cannot be triggered programmatically in node environment; switching to jsdom adds complexity | Upload valid JSON as admin, verify preview step; upload JSON with name conflict, verify conflict step; upload with language mismatch, verify warning banner |
| POST /api/templates/import end-to-end | IMP-01 through IMP-05 | Requires DB + auth session | Use Docker UAT env (https://1on1.surmont.co/), import an exported template, verify it appears in template list |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
