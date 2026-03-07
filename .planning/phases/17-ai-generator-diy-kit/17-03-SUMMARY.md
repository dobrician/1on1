---
phase: 17-ai-generator-diy-kit
plan: "03"
subsystem: i18n
tags: [translations, i18n, ai-editor, diy-kit, spec-page]
dependency_graph:
  requires: [17-01]
  provides: [17-04, 17-05, 17-06, 17-07]
  affects: [spec-page, templates-page, ai-editor-page]
tech_stack:
  added: []
  patterns: [next-intl, ICU-plurals, key-parity-CI]
key_files:
  created: []
  modified:
    - messages/en/spec.json
    - messages/ro/spec.json
    - messages/en/templates.json
    - messages/ro/templates.json
decisions:
  - "RO preview uses ICU three-form plurals (one/few/other) for sectionCount and questionCount — matches CLDR spec for Romanian"
  - "aiEditor keys placed at same level as editor/import/export in templates namespace — consistent with existing structure"
  - "spec.promptKit placed at same level as spec.schema/methodology/weights — mirrors page tab structure"
metrics:
  duration: 3min
  completed: "2026-03-07"
  tasks: 2
  files: 4
---

# Phase 17 Plan 03: i18n — AI Editor & DIY Prompt Kit Translations Summary

**One-liner:** Added spec.promptKit.* and templates.aiEditor.* translation keys to all 4 EN/RO files with full key parity.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add promptKit keys to spec.json (EN + RO) | d45acec | messages/en/spec.json, messages/ro/spec.json |
| 2 | Add aiEditor keys to templates.json (EN + RO) | fd0a092 | messages/en/templates.json, messages/ro/templates.json |

## What Was Built

### Task 1: spec.promptKit translation keys

Added to both `messages/en/spec.json` and `messages/ro/spec.json`:

- `spec.tabs.promptKit` — tab label for the new DIY Prompt Kit tab on the schema/spec page
- `spec.promptKit` object with: `title`, `intro`, `copy`, `copied`, and `sections` (schema, methodology, weights, example)

EN tab: "Prompt Kit" / RO tab: "Kit de Prompt"

### Task 2: templates.aiEditor translation keys

Added to both `messages/en/templates.json` and `messages/ro/templates.json`:

- `aiEditor.pageTitle` — page title for AI Template Editor
- `aiEditor.header` — navigation/action labels: newTemplate, editTemplate, save, reset, back, backToBuilder
- `aiEditor.resetConfirm` — confirmation dialog strings: title, description, confirm, cancel
- `aiEditor.preview` — preview panel: title, empty state, sectionCount, questionCount, answerTypeLabel (7 types)
- `aiEditor.chat` — chat UI: placeholder, send, thinking, errorToast
- `aiEditor.saveSuccess` — save success toast
- `aiEditor.entryPoints` — entry point buttons: generateWithAI, editWithAI

## Verification

- 17 key parity tests pass (both tasks)
- EN and RO key structures exactly mirrored for all 4 files
- Romanian uses correct diacritics (comma-below: ș/ț not cedilla variants)
- Romanian plural forms use ICU three-form (one/few/other) for sectionCount and questionCount

## Deviations from Plan

None — plan executed exactly as written.

## Key Decisions

1. **RO three-form ICU plurals for preview counts** — `sectionCount` and `questionCount` in RO use one/few/other per CLDR Romanian spec. The EN versions use the simpler one/other ICU form, consistent with the existing `import.step2.sections` and `import.step2.questions` keys.

2. **Key placement mirrors existing structure** — `aiEditor` is placed at the same level as `editor`, `import`, `export` within the `templates` namespace. `promptKit` is at the same level as `schema`, `methodology`, `weights` within the `spec` namespace.

## Self-Check

Files exist:
- [x] messages/en/spec.json — FOUND (verified with node -e require())
- [x] messages/ro/spec.json — FOUND (verified with node -e require())
- [x] messages/en/templates.json — FOUND (verified with node -e require())
- [x] messages/ro/templates.json — FOUND (verified with node -e require())

Commits exist:
- [x] d45acec — Task 1 commit verified via git log
- [x] fd0a092 — Task 2 commit verified via git log

Key parity: 17/17 tests pass

## Self-Check: PASSED
