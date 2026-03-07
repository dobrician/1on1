---
phase: 17-ai-generator-diy-kit
plan: "06"
subsystem: templates
tags:
  - diy-prompt-kit
  - ai-editor
  - entry-points
  - schema-docs
dependency_graph:
  requires:
    - 17-02 (translation keys: spec.promptKit.*, templates.aiEditor.entryPoints.*)
    - 17-03 (translation keys committed)
    - 17-04 (AI editor pages created at /templates/ai-editor and /templates/[id]/ai-editor)
  provides:
    - DIY Prompt Kit tab at /templates/schema
    - Generate with AI button in template list header
    - Edit with AI button in template editor header
  affects:
    - src/app/(dashboard)/templates/schema/page.tsx
    - src/app/(dashboard)/templates/schema/schema-actions.tsx
    - src/components/templates/template-list.tsx
    - src/components/templates/template-editor.tsx
tech_stack:
  added: []
  patterns:
    - Server Component assembles translated prompt kit block, passes to client copy component
    - PromptKitActions follows identical pattern to SchemaActions (clipboard + label toggle)
    - canManageTemplates(role) RBAC guard on both AI editor entry points
key_files:
  created: []
  modified:
    - src/app/(dashboard)/templates/schema/page.tsx
    - src/app/(dashboard)/templates/schema/schema-actions.tsx
    - src/components/templates/template-list.tsx
    - src/components/templates/template-editor.tsx
decisions:
  - Prompt kit block assembled server-side — translated section headers, English JSON content (technical standard)
  - PROMPT_KIT_EXAMPLE defined inline as TypeScript constant — not imported from test files (avoids test/production coupling)
  - Edit with AI button placed before ExportButton in template editor header (most prominent AI action first)
  - Generate with AI button order: [Generate with AI] [Import] [New Template] — AI entry point before utility actions
metrics:
  duration: "3 minutes"
  completed: "2026-03-07"
  tasks_completed: 2
  files_modified: 4
---

# Phase 17 Plan 06: DIY Prompt Kit Tab + AI Editor Entry Points Summary

**One-liner:** DIY Prompt Kit tab on schema docs page (copyable JSON schema + methodology + weights + worked example) plus Wand2 entry-point buttons wired into template list and template editor headers.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add Prompt Kit tab to schema docs page | 15880e9 | schema/page.tsx, schema/schema-actions.tsx |
| 2 | Wire entry point buttons in template-list and template-editor | 6fd0f39 | template-list.tsx, template-editor.tsx |

## What Was Built

### Task 1: DIY Prompt Kit Tab

Added a 4th "Prompt Kit" tab to `/templates/schema`:

- **`PromptKitActions`** client component exported from `schema-actions.tsx` — clipboard copy button that toggles to "Copied!" for 2 seconds, follows exact same pattern as existing `SchemaActions`
- **`PROMPT_KIT_EXAMPLE`** constant — complete Engineering 1:1 Template with 3 sections (Check-in & Wellbeing, Work & Progress, Growth & Development), 8 questions, mixed answer types (text, rating_1_5), and varied scoreWeights (0, 2, 3)
- **`promptKitBlock`** assembled server-side by joining: translated section headers + TEMPLATE_JSON_SCHEMA (English) + translated methodology principles + translated weight descriptions + PROMPT_KIT_EXAMPLE (English)
- Tab renders: title + intro (translated), Copy Prompt Kit button, scrollable pre block with the full kit

### Task 2: AI Editor Entry Points

- **Template list header** — "Generate with AI" button (Wand2 icon, `variant="outline"`) added before ImportDialog; navigates to `/templates/ai-editor`; visible to admin and manager only via `canManageTemplates(currentUserRole)`
- **Template editor header** — "Edit with AI" button (Wand2 icon, `variant="outline"`) added before ExportButton in the edit-mode action bar; navigates to `/templates/${template.id}/ai-editor`; visible to admin and manager only via `canManageTemplates(userRole)`

## Deviations from Plan

None — plan executed exactly as written.

## Verification

- `npx tsc --noEmit` — clean (0 errors in modified files; 2 pre-existing scroll-area module errors in ai-editor components from 17-05 are unrelated)
- `npx vitest run` — 69 unit tests pass including translation parity for spec.json and templates.json
- 4th tab trigger (`value="promptKit"`) present in schema page JSX
- Wand2 button with `href="/templates/ai-editor"` present in template-list header
- Wand2 button with `href=/templates/${template.id}/ai-editor` present in template-editor header
- Both buttons guarded by `canManageTemplates(role)`

## Self-Check: PASSED

- `src/app/(dashboard)/templates/schema/page.tsx` — modified, confirmed
- `src/app/(dashboard)/templates/schema/schema-actions.tsx` — modified, confirmed
- `src/components/templates/template-list.tsx` — modified, confirmed
- `src/components/templates/template-editor.tsx` — modified, confirmed
- Commit 15880e9 — exists
- Commit 6fd0f39 — exists
