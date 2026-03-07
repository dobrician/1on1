---
phase: 17
slug: ai-generator-diy-kit
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-07
---

# Phase 17 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest |
| **Config file** | `vitest.config.ts` — existing, no changes needed |
| **Quick run command** | `npx vitest run src/lib/ai/ src/lib/templates/` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/lib/ai/ src/lib/templates/`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 17-W0-01 | W0 | 0 | AIGEN-02, DIY-01 | unit | `npx vitest run src/lib/ai/schemas/__tests__/template-chat.test.ts` | ❌ W0 | ⬜ pending |
| 17-W0-02 | W0 | 0 | AIGEN-04 | unit | `npx vitest run src/lib/ai/prompts/__tests__/template-editor.test.ts` | ❌ W0 | ⬜ pending |
| 17-W0-03 | W0 | 0 | AIGEN-03 | unit | `npx vitest run src/lib/ai/__tests__/service.test.ts` | ❌ W0 | ⬜ pending |
| 17-API | API | 1 | AIGEN-01, AIGEN-02 | unit | `npx vitest run src/lib/ai/schemas/__tests__/template-chat.test.ts` | ❌ W0 | ⬜ pending |
| 17-PROMPT | PROMPT | 1 | AIGEN-03, AIGEN-04 | unit | `npx vitest run src/lib/ai/prompts/__tests__/template-editor.test.ts` | ❌ W0 | ⬜ pending |
| 17-DIY | DIY | 2 | DIY-01, DIY-02 | unit | `npx vitest run src/lib/templates/__tests__/import-schema.test.ts` | ✅ extend | ⬜ pending |
| 17-RBAC | RBAC | 1 | AIGEN-01 | unit | `npx vitest run src/lib/auth/__tests__/rbac.test.ts` | ✅ exists | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/ai/schemas/__tests__/template-chat.test.ts` — stubs for AIGEN-02, DIY-01 (validates `templateChatResponseSchema`: nullable templateJson + required chatMessage)
- [ ] `src/lib/ai/prompts/__tests__/template-editor.test.ts` — stubs for AIGEN-04 (`buildTemplateEditorSystemPrompt` includes schema spec, methodology, weight sections, and embeds current template JSON)
- [ ] `src/lib/ai/__tests__/service.test.ts` — stub for AIGEN-03 (`withLanguageInstruction` appends correct language directive)
- [ ] Extend `src/lib/templates/__tests__/import-schema.test.ts` — validate the worked DIY kit example template passes `templateImportSchema`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| AI chat opens with greeting question for new template | AIGEN-01 | LLM non-deterministic | Open `/templates/ai-editor`, verify first message asks about team/goals |
| AI chat opens with template summary for existing template | AIGEN-01 | LLM non-deterministic | Open `/templates/[id]/ai-editor`, verify first message summarizes template |
| Template preview updates after AI response with JSON | AIGEN-02 | E2E browser interaction | Send a chat message, verify left panel re-renders with new template |
| AI generates question text in company content language | AIGEN-01, AIGEN-03 | LLM + locale | Set tenant language to Romanian, generate template, verify all question text is in Romanian |
| DIY kit "Copy" button copies full block to clipboard | DIY-02 | Browser clipboard API | Click Copy on Prompt Kit tab, paste into text editor, verify all 4 sections present |
| Save button creates/updates template in DB | AIGEN-02 | DB state + UI | Save after generation, verify template appears in template list |
| Reset clears chat and preview with confirmation | AIGEN-01 | UI interaction | Click Reset, confirm dialog, verify both panels cleared |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
