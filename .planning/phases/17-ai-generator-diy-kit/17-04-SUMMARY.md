---
phase: 17-ai-generator-diy-kit
plan: "04"
subsystem: api
tags: [nextjs, ai, template-editor, rbac, zod]

requires:
  - phase: 17-02
    provides: "generateTemplateChatTurn service function and ChatTurnResponse type"
  - phase: 17-01
    provides: "i18n keys for AI editor UI (aiEditor.*)"

provides:
  - "POST /api/templates/ai-chat — RBAC-gated route bridging client AI editor to AI service"
  - "Request validation via inline Zod schema (messages array + nullable currentTemplate)"
  - "Tenant content language resolution from session.user.contentLanguage"

affects:
  - "Wave 3 (17-05+): client AI editor component that calls this route"

tech-stack:
  added: []
  patterns:
    - "Session-sourced tenant language: use session.user.contentLanguage instead of extra DB query"
    - "AI chat routes: no audit log — chat turns are not auditable write operations on tenant data"

key-files:
  created:
    - "src/app/api/templates/ai-chat/route.ts"
  modified:
    - "CHANGELOG.md"

key-decisions:
  - "Used session.user.contentLanguage (populated at auth time) instead of querying tenants table — consistent with export route pattern, simpler, one fewer DB call"
  - "No withTenantContext wrapper needed — route does not touch tenant-scoped DB data (AI call only)"
  - "No audit log for AI chat turns — template is only audited on explicit Save (separate API call)"
  - "Inline Zod requestSchema (not in separate validation file) — route-local schema not reused elsewhere"

patterns-established:
  - "AI-only routes: skip withTenantContext when no DB access needed; get language from session"
  - "Error surface: 401/403/400 with {error} shape; 500 with generic 'Generation failed' message"

requirements-completed:
  - AIGEN-01
  - AIGEN-02
  - AIGEN-03
  - AIGEN-04

duration: 3min
completed: 2026-03-07
---

# Phase 17 Plan 04: AI Chat Route Summary

**POST /api/templates/ai-chat API route with RBAC, Zod validation, and session-sourced content language bridging client to generateTemplateChatTurn**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-07T16:11:50Z
- **Completed:** 2026-03-07T16:14:30Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments

- Created `POST /api/templates/ai-chat` route with full auth/RBAC pipeline (401 unauthenticated, 403 member, 400 invalid body, 500 AI error)
- Inline Zod schema validates messages array (min 1, user/assistant roles) and nullable currentTemplate shape
- Tenant content language sourced from `session.user.contentLanguage` — no extra DB call, consistent with export route

## Task Commits

1. **Task 1: Implement POST /api/templates/ai-chat route** - `7de0543` (feat)

## Files Created/Modified

- `src/app/api/templates/ai-chat/route.ts` — POST handler: auth check, RBAC check, Zod validation, language resolution, generateTemplateChatTurn call, error handling
- `CHANGELOG.md` — Added route entry under [Unreleased]

## Decisions Made

- Used `session.user.contentLanguage` instead of querying the tenants table inside `withTenantContext`. The session already carries this field (populated at auth time from `tenants.contentLanguage`). This avoids a DB round-trip and matches the pattern used by the export route. The plan referenced the `pipeline.ts` pattern (`settings.preferredLanguage`) which is the older approach — the newer, simpler pattern from the export route is more appropriate here.
- Omitted `withTenantContext` entirely — the route does no DB work (AI call only), so wrapping in a DB transaction context is unnecessary overhead.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug/Simplification] Used session.user.contentLanguage instead of DB query in withTenantContext**
- **Found during:** Task 1 implementation
- **Issue:** Plan instructed querying tenant settings for `preferredLanguage` inside `withTenantContext` (pipeline.ts pattern), but the codebase has evolved: `contentLanguage` is now a dedicated column on tenants, populated into `session.user.contentLanguage` at auth time, and used directly by the export route
- **Fix:** Read `session.user.contentLanguage ?? "en"` directly — no DB transaction needed
- **Files modified:** `src/app/api/templates/ai-chat/route.ts`
- **Verification:** TypeScript compiles, pattern matches export route (line 125)
- **Committed in:** 7de0543

---

**Total deviations:** 1 auto-simplified (Rule 1 — codebase pattern alignment)
**Impact on plan:** Simpler implementation, fewer DB calls, aligned with current codebase patterns. Behavior is identical — content language is correctly resolved.

## Issues Encountered

None — the route was straightforward given existing patterns from import and export routes.

## Next Phase Readiness

- `POST /api/templates/ai-chat` is ready for Wave 3 client UI component
- Route contract: `{ messages: [{role, content}], currentTemplate: TemplateExport | null }` → `{ chatMessage, templateJson }`
- All Wave 1 tests remain GREEN (14/14)

---
*Phase: 17-ai-generator-diy-kit*
*Completed: 2026-03-07*
