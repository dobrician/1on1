---
phase: 12-ui-translation
plan: 01
subsystem: ui
tags: [next-intl, zod, i18n, validation, toast, auth]

# Dependency graph
requires:
  - phase: 11-i18n-foundation
    provides: next-intl infrastructure, locale resolution, namespace loading
provides:
  - useZodI18nErrors hook for translated Zod validation errors
  - useApiErrorToast hook for translated API error toasts
  - validation.json namespace (EN+RO) with form error messages
  - error keys in common.json (EN+RO) for API error responses
  - fully translated auth pages (reset-password, verify-email, invite, email-verification-banner)
affects: [12-ui-translation remaining plans, any new components with forms or API calls]

# Tech tracking
tech-stack:
  added: []
  patterns: [useZodI18nErrors hook pattern for form components, useApiErrorToast pattern for mutation error handlers]

key-files:
  created:
    - src/lib/i18n/zod-error-map.ts
    - src/lib/i18n/api-error-toast.ts
    - messages/en/validation.json
    - messages/ro/validation.json
  modified:
    - messages/en/common.json
    - messages/ro/common.json
    - messages/en/auth.json
    - messages/ro/auth.json
    - src/i18n/request.ts
    - src/global.d.ts
    - src/app/(auth)/reset-password/page.tsx
    - src/app/(auth)/verify-email/page.tsx
    - src/app/(auth)/invite/[token]/page.tsx
    - src/app/(auth)/invite/[token]/invite-accept-form.tsx
    - src/components/auth/email-verification-banner.tsx
    - src/app/(auth)/register/page.tsx

key-decisions:
  - "Zod v4 error map uses single-argument signature (issue only, no ctx) -- adapted hook accordingly"
  - "Zod v4 uses 'origin' instead of 'type' and 'invalid_format' instead of 'invalid_string' -- mapped correctly"
  - "Zod schema .refine() messages remain in English as plan specifies keeping schemas language-agnostic"

patterns-established:
  - "useZodI18nErrors: call at top of any client component with Zod-validated forms"
  - "useApiErrorToast: call showApiError(error) in catch/onError blocks instead of toast.error()"

requirements-completed: [VALD-01, VALD-02, UITR-03]

# Metrics
duration: 11min
completed: 2026-03-06
---

# Phase 12 Plan 01: Validation & Auth Translation Summary

**Zod error translation hook, API error toast utility, full auth page i18n, and 13 components wired to translated error toasts**

## Performance

- **Duration:** 11 min
- **Started:** 2026-03-06T10:45:11Z
- **Completed:** 2026-03-06T10:56:32Z
- **Tasks:** 3
- **Files modified:** 30

## Accomplishments
- Created useZodI18nErrors hook that sets Zod's global error map to locale-aware messages (Zod v4 compatible)
- Created useApiErrorToast hook that maps API error patterns to translated toast messages
- Translated all remaining auth pages (reset-password, verify-email, invite flow, email-verification-banner)
- Audited partial auth pages (register, forgot-password) -- added useZodI18nErrors and translated error fallbacks
- Replaced hardcoded toast.error() calls across 13 components with showApiError()

## Task Commits

Each task was committed atomically:

1. **Task 1: Create validation namespace and Zod error translation hook** - `6060301` (feat)
2. **Task 2: Translate remaining and audit PARTIAL auth pages** - `e178951` (feat)
3. **Task 3: Wire API error handlers to translated toast messages** - `0aa7834` (feat)

**CHANGELOG:** `93aa847` (docs: update CHANGELOG)

## Files Created/Modified
- `src/lib/i18n/zod-error-map.ts` - useZodI18nErrors hook for Zod v4 translated validation errors
- `src/lib/i18n/api-error-toast.ts` - useApiErrorToast hook for translated API error toasts
- `messages/en/validation.json` - English validation error messages (required, email, minLength, etc.)
- `messages/ro/validation.json` - Romanian validation error messages
- `messages/en/common.json` - Added errors.* keys (unauthorized, forbidden, serverError, etc.)
- `messages/ro/common.json` - Added Romanian error keys
- `messages/en/auth.json` - Added resetPassword, verifyEmail, invite, verificationBanner sections
- `messages/ro/auth.json` - Romanian translations for all new auth sections
- `src/i18n/request.ts` - Added validation namespace import
- `src/global.d.ts` - Registered validation namespace type
- `src/app/(auth)/reset-password/page.tsx` - Full i18n with useZodI18nErrors
- `src/app/(auth)/verify-email/page.tsx` - Full i18n using getTranslations (server component)
- `src/app/(auth)/invite/[token]/page.tsx` - Full i18n using getTranslations (server component)
- `src/app/(auth)/invite/[token]/invite-accept-form.tsx` - Full i18n with useZodI18nErrors
- `src/components/auth/email-verification-banner.tsx` - Full i18n
- `src/app/(auth)/register/page.tsx` - Added useZodI18nErrors + translated catch fallback
- 13 components updated to use useApiErrorToast (people/, templates/, series/, dashboard/, teams/, profile)

## Decisions Made
- Adapted Zod error map for v4 API (single-argument signature, `origin` instead of `type`, `invalid_format` instead of `invalid_string`)
- Kept Zod schema `.refine()` messages in English per plan guidance (schemas remain language-agnostic)
- verify-email and invite page use `getTranslations` (server components), while invite-accept-form uses `useTranslations` (client component)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Adapted Zod hook for v4 API**
- **Found during:** Task 1 (Zod error map creation)
- **Issue:** Plan assumed Zod v3 API (2-arg error map, ZodIssueCode enum, `type` field). Project uses Zod 4.3.6 with different API.
- **Fix:** Rewrote hook to use single-arg error map, `origin` instead of `type`, `invalid_format` instead of `invalid_string`, `expected === 'nonoptional'` instead of `received === 'undefined'`
- **Files modified:** src/lib/i18n/zod-error-map.ts
- **Verification:** TypeScript compiles cleanly
- **Committed in:** 6060301 (Task 1 commit)

**2. [Rule 3 - Blocking] Added validation namespace to global.d.ts**
- **Found during:** Task 1 (TypeScript validation)
- **Issue:** next-intl type system didn't recognize 'validation' namespace -- needed registration in global.d.ts
- **Fix:** Added import and intersection type for validation namespace
- **Files modified:** src/global.d.ts
- **Verification:** TypeScript compiles cleanly with correct type checking
- **Committed in:** 6060301 (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both fixes necessary for Zod v4 compatibility and TypeScript type safety. No scope creep.

## Deferred Items
- `src/components/session/summary-screen.tsx` line 157 still has `toast.error(error.message)` -- not in plan scope

## Issues Encountered
None beyond the Zod v4 API differences handled as deviations above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Validation and error translation infrastructure complete -- all future components can use useZodI18nErrors and useApiErrorToast
- All auth pages fully translated
- Ready for remaining UI translation plans (dashboard, wizard, settings, etc.)

---
*Phase: 12-ui-translation*
*Completed: 2026-03-06*
