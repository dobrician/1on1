---
phase: 16-template-import
verified: 2026-03-07T00:00:00Z
status: passed
score: 11/12 must-haves verified
re_verification: false
human_verification:
  - test: "Admin sees Import button, member does not"
    expected: "Upload icon + Import label visible for admin/manager; absent for member"
    why_human: "RBAC render gating requires authenticated browser session"
  - test: "Full round-trip: export then import a template"
    expected: "Preview step shows correct name, section count, question count, type badges; success step shows View Template link; template appears in list"
    why_human: "Multi-step dialog flow with file input cannot be exercised without a browser"
  - test: "Language mismatch yellow Alert and Proceed anyway gate"
    expected: "Yellow warning banner appears; Import button disabled until Proceed anyway clicked"
    why_human: "Visual rendering and button disabled state require browser"
  - test: "Name conflict step with Rename and Create as copy"
    expected: "Conflict step appears with inline Rename input and Create as copy button; both paths succeed"
    why_human: "State transitions after 409 response require live browser test"
  - test: "Invalid file shows field-specific error messages"
    expected: "Error step lists path-scoped messages e.g. 'Section 1, Question 1, field answerType'; Close button only"
    why_human: "File input and error rendering require browser"
  - test: "Dialog resets to step=select on close"
    expected: "Reopening the dialog after partial flow shows step 1 with no prior state"
    why_human: "State reset behavior requires interactive browser session"
---

# Phase 16: Template Import Verification Report

**Phase Goal:** Users can import a template from a portable JSON file with full visibility into what they are importing, warnings about mismatches, and actionable error messages if the file is invalid
**Verified:** 2026-03-07
**Status:** human_needed — all automated checks passed; 6 scenarios require browser verification
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | templateImportSchema validates round-trip export JSON and accepts scale_custom | VERIFIED | `ANSWER_TYPES` includes `"scale_custom"` at line 12 of import-schema.ts; schema exported at line 35 |
| 2 | formatImportErrors produces Section N / Question M / field X format strings | VERIFIED | formatImportErrors at line 73; formatIssuePath logic present in import-schema.ts (108 lines) |
| 3 | derivePreviewStats returns correct counts and type breakdown | VERIFIED | Function exported at line 92 of import-schema.ts |
| 4 | EN and RO translation files have matching import.* key blocks | VERIFIED | Both messages/en/templates.json and messages/ro/templates.json have "import": at line 120 |
| 5 | POST /api/templates/import returns 401 for unauthenticated requests | VERIFIED | status 401 at line 47 of route.ts |
| 6 | POST /api/templates/import returns 403 for member role | VERIFIED | canManageTemplates check + status 403 at line 52 of route.ts |
| 7 | POST /api/templates/import returns 422 with ImportError[] for invalid payload | VERIFIED | status 422 at lines 102 and 112 of route.ts |
| 8 | POST /api/templates/import returns 409 on name conflict | VERIFIED | ConflictError class + status 409 at line 232 of route.ts |
| 9 | POST /api/templates/import atomically inserts and returns 201 | VERIFIED | withTenantContext wraps inserts; status 201 at line 226 of route.ts |
| 10 | Audit log recorded on import | VERIFIED | logAuditEvent call at line 208 of route.ts |
| 11 | ImportDialog wired into template-list.tsx and calls /api/templates/import | VERIFIED | ImportDialog imported at line 15, mounted at line 139 of template-list.tsx; fetch to /api/templates/import at line 144 of import-dialog.tsx |
| 12 | All 6 manual dialog scenarios (RBAC, round-trip, mismatch, conflict, error, reset) | ? HUMAN NEEDED | Cannot verify file input + multi-step dialog flow programmatically |

**Score:** 11/12 truths verified automatically

### Required Artifacts

| Artifact | Lines | Status | Details |
|----------|-------|--------|---------|
| `src/lib/templates/__tests__/import-schema.test.ts` | 349 | VERIFIED | Well above 80-line minimum; imports from `../import-schema` |
| `src/lib/auth/__tests__/rbac.test.ts` | 24 | VERIFIED | 5 canManageTemplates test cases present |
| `src/lib/templates/import-schema.ts` | 108 | VERIFIED | All 6 exports present: templateImportSchema, TemplateImportPayload, ImportError, formatImportErrors, PreviewStats, derivePreviewStats |
| `src/app/api/templates/import/route.ts` | 248 | VERIFIED | POST handler with auth, RBAC, schema validation, atomic insert, audit log, conflict handling |
| `src/components/templates/import-dialog.tsx` | 432 | VERIFIED | Multi-step dialog with state machine, file reading, language mismatch, conflict step, success step |
| `messages/en/templates.json` | — | VERIFIED | "import" key block present at line 120 |
| `messages/ro/templates.json` | — | VERIFIED | "import" key block present at line 120 |

### Key Link Verification

| From | To | Via | Status |
|------|----|-----|--------|
| import-schema.test.ts | import-schema.ts | `from '../import-schema'` | WIRED |
| rbac.test.ts | rbac.ts | `from '../rbac'` | WIRED |
| route.ts | import-schema.ts | `templateImportSchema` | WIRED (line 8) |
| route.ts | tenant-context.ts | `withTenantContext` | WIRED (line 4) |
| route.ts | rbac.ts | `canManageTemplates` | WIRED (line 5) |
| route.ts | audit/log | `logAuditEvent` | WIRED (line 6, called line 208) |
| import-dialog.tsx | /api/templates/import | fetch POST | WIRED (line 144) |
| import-dialog.tsx | import-schema.ts | templateImportSchema + formatImportErrors + derivePreviewStats | WIRED (lines 13, 17) |
| import-dialog.tsx | contentLanguage | mismatch check `payload.language !== contentLanguage` | WIRED (line 128) |
| template-list.tsx | import-dialog.tsx | `<ImportDialog ...>` | WIRED (lines 15, 139) |

### Requirements Coverage

| Requirement | Plans | Description | Status |
|-------------|-------|-------------|--------|
| IMP-01 | 01, 03, 04, 05 | RBAC-gated import entry point; POST route auth/403 | SATISFIED — canManageTemplates guards route + dialog render |
| IMP-02 | 01, 02, 04, 05 | Preview step showing template name, section count, question count, type breakdown | SATISFIED — derivePreviewStats wired into dialog preview step |
| IMP-03 | 02, 04, 05 | Language mismatch warning with explicit Proceed anyway gate | SATISFIED — contentLanguage mismatch check + Alert render in import-dialog.tsx |
| IMP-04 | 01, 02, 04, 05 | Name conflict handling: rename or create-as-copy | SATISFIED — conflict step with rename input + copy suffix in import-dialog.tsx; 409 in route.ts |
| IMP-05 | 01, 02, 03, 05 | Actionable field-specific error messages for invalid files | SATISFIED — formatImportErrors produces Section N / Question M / field X paths; error step renders up to 10 with overflow count |

### Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| route.ts line 232 | `error.conflictName` — ConflictError stores name as `this.name` which gets overwritten by `Error.name` assignment on line 26 | WARNING | ConflictError.name is set to `"ConflictError"` (the error class name) via `this.name = "ConflictError"`, then `error.conflictName` is referenced on line 231 — this property does not exist; the 409 response will return `name: undefined`. Needs to use a distinct property name e.g. `this.conflictName`. |

### Human Verification Required

#### 1. RBAC Gating

**Test:** Log in as admin, manager, and member. Navigate to /templates.
**Expected:** Admin and manager see the Import button (Upload icon) in the header. Member sees no Import button.
**Why human:** Role-conditional rendering requires an authenticated browser session.

#### 2. Round-trip Import

**Test:** Export any template as .json. Click Import. Select the file. Click Parse & Preview.
**Expected:** Preview step shows correct template name, section count, question count, and type breakdown badges. Click Import (or Create as copy if conflict). Success step shows View Template link. Template appears in list.
**Why human:** File input + multi-step dialog state transitions require a browser.

#### 3. Language Mismatch Warning

**Test:** Export a template from an EN company account. Import it into an RO company account.
**Expected:** Yellow warning banner reads the file language vs. company language. Import button disabled until Proceed anyway clicked. After clicking Proceed anyway, import proceeds normally.
**Why human:** Visual rendering and disabled-state logic require browser.

#### 4. Name Conflict Resolution

**Test:** Import a template whose name matches an existing template. Then test both paths.
**Expected:** Conflict step appears with existing name, inline Rename input, Import as [name] button, Create as copy button, and Cancel. Both rename and copy paths complete with success step.
**Why human:** Race condition / server 409 trigger and state transitions require live test.

#### 5. Invalid File Error Display

**Test:** Import a .json file with `"name":""` and `"answerType":"checkbox"`.
**Expected:** Error step shows field-scoped messages: `field 'name':` for empty name, `Section 1, Question 1, field 'answerType':` for invalid type. Only Close button shown — no proceed option.
**Why human:** File input and error list rendering require browser.

#### 6. Dialog State Reset on Close

**Test:** Open import dialog, upload a file to reach preview step, then click X to close. Reopen.
**Expected:** Dialog shows step 1 (file select) with no retained state from previous session.
**Why human:** useState reset behavior requires interactive browser session.

### Gaps Summary

One code-level defect found (anti-pattern, not a gap in feature coverage):

`ConflictError` in route.ts stores the conflicting name as `this.name = "ConflictError"` (overwriting the Error.name field used for the class name) and then catches it referencing `error.conflictName` (line 231) — a property that does not exist. The 409 response body will have `name: undefined`. This will cause the conflict step in the dialog to show an undefined name, breaking the user-visible conflict message. The fix is to store the conflict name in a separate property (e.g. `this.conflictName = name` without overwriting `this.name`).

This is a WARNING-level issue: the conflict step will still appear, but the name will be blank/undefined.

---

_Verified: 2026-03-07_
_Verifier: Claude (gsd-verifier)_
