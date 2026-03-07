# Phase 16: Template Import - Context

**Gathered:** 2026-03-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can import a template from a portable JSON file with full visibility into what they are importing, warnings about mismatches, and actionable error messages if the file is invalid. This phase delivers the reverse of Phase 15's export — a complete round-trip between tenants.

Scope: upload → validate → preview → conflict check → language check → confirm → persist. Does NOT include bulk import, import from URL, or importing directly from another tenant's export in-app.

</domain>

<decisions>
## Implementation Decisions

### Entry Point
- Import button added to the template list header, adjacent to "New Template" button, admin/manager only (same RBAC guard as Export — `canManageTemplates()`)
- Triggered by a standard file input (`<input type="file" accept=".json">`) — no drag-and-drop (no existing infrastructure, keep consistent with file-based CSV export pattern)
- Button label: "Import" with Upload icon (Lucide `Upload`)

### Import Flow UI
- Multi-step Dialog (not a new page) — consistent with existing "Create Template" dialog in `template-list.tsx`
- Steps flow entirely within the dialog; no routing changes needed
- Four distinct dialog steps:
  1. **File select** — file input, shows filename once selected, "Parse & Preview" button
  2. **Preview** — shows template name, section count, question count, question type breakdown; "Import" or "Cancel" buttons; language mismatch warning shown here if applicable (yellow banner naming both languages, requires explicit "Proceed anyway" confirmation)
  3. **Conflict** — only shown if a template with the same name exists; three buttons: "Rename", "Create as Copy", "Cancel"; Rename shows an inline text input for the new name
  4. **Success** — brief confirmation with link to the newly created template

### Preview Display
- Show: template name, description (if any), section count, question count, type breakdown as a badge list (e.g., "3 × Multiple Choice", "2 × Yes/No", "1 × Text")
- Reuse `Card` + `Badge` components — no new primitives needed

### Language Mismatch (IMP-03)
- Yellow `Alert` (shadcn/ui variant="warning" or use `border-yellow-500` if warning variant unavailable) inside the Preview step
- Message names both languages explicitly: "This template is in English but your company uses Romanian."
- "Proceed anyway" + "Cancel" — import proceeds only after explicit confirmation

### Conflict Resolution (IMP-04)
- Rename: show inline Input pre-filled with original name + " (imported)"; user edits; confirm with "Import as [name]"
- Create as copy: auto-suffixes name with " (copy)" and proceeds immediately
- Cancel: closes dialog, no data written

### Validation Errors (IMP-05)
- Parse and validate the entire JSON against the TemplateExport schema (from `export-schema.ts`) BEFORE showing any preview
- If invalid: show a scrollable error list inside the dialog (step 2 replaced by error state)
- Each error on its own line: "Section 2, Question 3, field `answerType`: invalid value `checkbox`"
- Max 10 errors shown; if more, "...and N more errors"
- "Close" button only — no proceed option for invalid files

### API Route
- `POST /api/templates/import` — accepts JSON body (parsed client-side from file), returns created template ID on success
- Client parses file to JSON, validates client-side first (fast fail for obvious errors), then sends to server for authoritative validation + persistence
- Server validates against Zod schema derived from `TemplateExport` interface, maps to DB rows, inserts atomically in a transaction
- Returns `{ templateId, name }` on success; `{ errors: ImportError[] }` on validation failure

### Translations
- New keys in `templates` namespace: `import.*` (button, dialog title, steps, errors, warnings, success)
- Full EN + RO parity (same pattern as `export.*` keys added in Phase 15)

### Claude's Discretion
- Exact Zod schema shape for import validation (can mirror/invert `buildExportPayload` output)
- Transaction structure for insert (sections → questions → conditional logic)
- Error path format for nested structures (section index, question index, field name)
- Exact copy suffix wording ("(copy)" vs "Copy of")

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `canManageTemplates()` — RBAC guard already used in template-list.tsx and export-button.tsx
- `ExportButton` pattern — client component with blob/file interaction, toast feedback, loading state — mirror for ImportButton
- `TemplateExport` interface + `buildExportPayload()` — `src/lib/templates/export-schema.ts` — import validator is the inverse
- `Dialog`, `Card`, `Badge`, `Alert`, `Button`, `Input` — all available in shadcn/ui
- `useApiErrorToast` — already used in template-list.tsx for API error handling
- TanStack Query `useMutation` — established pattern for write operations in client components

### Established Patterns
- Multi-step dialogs: no existing multi-step dialog, but single-step dialog is in template-list.tsx — extend that pattern with local `step` state
- File handling: CSV export uses blob download; for import, use FileReader API to parse JSON client-side
- API routes: POST pattern with Zod validation, tenant isolation, role check — see `src/app/api/templates/route.ts`
- Atomic inserts: template creation in existing route inserts sections + questions in sequence — import follows same pattern

### Integration Points
- `template-list.tsx` — add Import button to header alongside existing "New Template" button
- `src/app/api/templates/` — add `import/route.ts` alongside existing `[id]/export/route.ts`
- `src/lib/validations/` — add `template-import.ts` for the Zod import schema
- `messages/en/templates.json` + `messages/ro/templates.json` — add `import.*` keys

</code_context>

<specifics>
## Specific Ideas

- The import round-trip should feel symmetric with export: same button area, same modal pattern, same role gating
- Error messages should be developer-friendly but user-readable: path format "Section N, Question M, field X: message" is precise enough for debugging

</specifics>

<deferred>
## Deferred Ideas

- Drag-and-drop file upload — future UX enhancement, no current infrastructure
- Import from URL — new capability, own phase
- Bulk import (multiple files) — new capability, own phase
- Import history / audit log — future analytics phase

</deferred>

---

*Phase: 16-template-import*
*Context gathered: 2026-03-07 (auto-mode — Claude's discretion)*
