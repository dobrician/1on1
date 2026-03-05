---
phase: 02-authentication-organization
plan: 01
subsystem: auth
tags: [auth.js, next-auth, jwt, bcryptjs, resend, react-email, drizzle-adapter, credentials, oauth, rls, email-verification, password-reset]

# Dependency graph
requires:
  - phase: 01-foundation-infrastructure/01-02
    provides: Drizzle ORM schema with user/tenant tables, RLS policies, withTenantContext wrapper
provides:
  - Auth.js v5 configuration with Credentials, Google, and Microsoft Entra ID providers
  - JWT session strategy with tenantId, role, userId in session token
  - Five auth-related database tables (account, auth_session, verification_token, email_verification_token, password_reset_token)
  - User table extended with name, emailVerified, image, passwordHash columns
  - Server actions for register, verify-email, forgot-password, reset-password, logout
  - Email infrastructure with Resend API and React Email templates
  - Zod validation schemas for all auth forms
  - Auth pages (login, register, verify-email, forgot-password, reset-password)
  - shadcn/ui components (Button, Input, Label, Card)
affects: [02-02-org-setup, 02-03-route-protection, all-protected-features, all-tenant-scoped-queries]

# Tech tracking
tech-stack:
  added: [next-auth@5.0.0-beta.30, @auth/drizzle-adapter@1.11.1, bcryptjs@3.0.3, resend@6.9.3, @react-email/components@1.0.8, @types/bcryptjs@3.0.0]
  patterns: [lazy-resend-client, drizzle-adapter-type-cast, jwt-session-custom-fields, server-action-auth-flows, auth-layout-redirect]

key-files:
  created: [src/lib/auth/config.ts, src/lib/auth/actions.ts, src/lib/db/schema/auth.ts, src/lib/validations/auth.ts, src/types/next-auth.d.ts, src/lib/email/send.ts, src/lib/email/templates/verification.tsx, src/lib/email/templates/password-reset.tsx, src/app/api/auth/[...nextauth]/route.ts, src/app/(auth)/layout.tsx, src/app/(auth)/login/page.tsx, src/app/(auth)/register/page.tsx, src/app/(auth)/verify-email/page.tsx, src/app/(auth)/forgot-password/page.tsx, src/app/(auth)/reset-password/page.tsx, src/components/ui/button.tsx, src/components/ui/input.tsx, src/components/ui/label.tsx, src/components/ui/card.tsx, src/lib/db/migrations/0002_clear_la_nuit.sql, src/lib/db/migrations/0003_auth_rls_policies.sql]
  modified: [src/lib/db/schema/users.ts, src/lib/db/schema/index.ts, .env.example, package.json, CHANGELOG.md, src/lib/db/migrations/meta/_journal.json]

key-decisions:
  - "Auth.js Drizzle adapter requires exact column names: added 'name' and 'emailVerified' to user table (Auth.js reads these from adapter)"
  - "Accounts table uses snake_case property names (refresh_token, access_token, etc.) to match @auth/drizzle-adapter type expectations"
  - "DrizzleAdapter cast to NextAuthConfig['adapter'] to work around @auth/core version mismatch (0.41.0 vs 0.41.1)"
  - "Resend client lazy-initialized to prevent build-time errors when RESEND_API_KEY is not set"
  - "Token tables (verification_token, email_verification_token, password_reset_token) have no RLS -- accessed in unauthenticated flows"
  - "OAuth sign-in blocked for users without existing records -- must register org with credentials first"
  - "Registration auto-signs-in after creating tenant + admin user in single transaction"

patterns-established:
  - "Auth config at src/lib/auth/config.ts exports handlers, signIn, signOut, auth"
  - "Server actions in src/lib/auth/actions.ts with 'use server' directive for auth mutations"
  - "Validation schemas in src/lib/validations/{domain}.ts shared between client and server"
  - "Email templates as React components in src/lib/email/templates/"
  - "Auth pages in (auth) route group with centered card layout"
  - "shadcn/ui components in src/components/ui/ for form elements"

requirements-completed: [AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-07]

# Metrics
duration: 10min
completed: 2026-03-03
---

# Phase 2 Plan 01: Auth & Email Summary

**Auth.js v5 with credentials/OAuth, JWT sessions with tenant context, email verification and password reset via Resend, and five auth pages using shadcn/ui**

## Performance

- **Duration:** 10 min
- **Started:** 2026-03-03T10:28:42Z
- **Completed:** 2026-03-03T10:38:57Z
- **Tasks:** 3
- **Files modified:** 29

## Accomplishments
- Auth.js v5 configured with Credentials provider (bcrypt hash verification), Google OAuth, and Microsoft Entra ID -- JWT session carries tenantId, role, userId
- Five auth-related database tables created with Drizzle migrations, RLS on account and auth_session, token tables accessible without tenant context
- Complete email infrastructure with Resend API, lazy-initialized client, React Email templates for verification (24h expiry) and password reset (1h expiry)
- All five auth pages built with shadcn/ui components: login, register (creates org + admin in single transaction), verify-email, forgot-password (prevents email enumeration), reset-password
- Server actions handle all auth mutations: register, verify-email, forgot-password, reset-password, logout

## Task Commits

Each task was committed atomically:

1. **Task 1: Install auth deps, extend schema, create Auth.js config** - `6db5e1d` (feat)
2. **Task 2: Create email infrastructure, auth server actions, and auth pages** - `236c0e4` (feat)
3. **Task 3: Generate database migration for auth tables** - `eee5b20` (feat)

## Files Created/Modified
- `src/lib/auth/config.ts` - Auth.js v5 configuration with Credentials, Google, MicrosoftEntraID providers, JWT callbacks
- `src/lib/auth/actions.ts` - Server actions: registerAction, verifyEmailAction, forgotPasswordAction, resetPasswordAction, logoutAction
- `src/lib/db/schema/auth.ts` - Auth.js adapter tables + custom token tables
- `src/lib/db/schema/users.ts` - Extended with name, emailVerified, image, passwordHash columns
- `src/lib/validations/auth.ts` - Zod schemas for signIn, register, forgotPassword, resetPassword
- `src/types/next-auth.d.ts` - TypeScript type augmentation for custom session/JWT fields
- `src/lib/email/send.ts` - Resend email sending with lazy client initialization
- `src/lib/email/templates/verification.tsx` - React Email verification template
- `src/lib/email/templates/password-reset.tsx` - React Email password reset template
- `src/app/api/auth/[...nextauth]/route.ts` - Auth.js route handler (GET, POST)
- `src/app/(auth)/layout.tsx` - Centered card layout with session redirect
- `src/app/(auth)/login/page.tsx` - Login with credentials + OAuth buttons
- `src/app/(auth)/register/page.tsx` - Org registration form
- `src/app/(auth)/verify-email/page.tsx` - Token verification page
- `src/app/(auth)/forgot-password/page.tsx` - Email input for password reset
- `src/app/(auth)/reset-password/page.tsx` - New password form with token validation
- `src/components/ui/button.tsx`, `card.tsx`, `input.tsx`, `label.tsx` - shadcn/ui components
- `src/lib/db/migrations/0002_clear_la_nuit.sql` - Auth schema DDL migration
- `src/lib/db/migrations/0003_auth_rls_policies.sql` - RLS policies and app_user grants

## Decisions Made
- Added `name` and `emailVerified` columns to user table because Auth.js Drizzle adapter requires these exact property names. The `name` column stores concatenated firstName + lastName.
- Used snake_case property names on accounts table (refresh_token, access_token, etc.) because the adapter type expects these exact JS property names.
- Cast DrizzleAdapter to `NextAuthConfig["adapter"]` to resolve type incompatibility between `@auth/core` v0.41.0 (bundled in next-auth) and v0.41.1 (from @auth/drizzle-adapter).
- Lazy-initialized the Resend client to prevent build-time errors when RESEND_API_KEY environment variable is not set.
- Decided not to enable RLS on token tables (verification_token, email_verification_token, password_reset_token) because they are accessed in unauthenticated flows (registration, password reset) where no tenant context exists.
- Fixed NEXT_PUBLIC_APP_URL port from 4301 to 4300 in .env.local to match project convention.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Auth.js adapter requires name and emailVerified columns**
- **Found during:** Task 1 (Auth.js configuration)
- **Issue:** TypeScript errors because user table lacked `name` and `emailVerified` columns that the Drizzle adapter type requires
- **Fix:** Added `name: varchar("name", { length: 255 })` and renamed `emailVerifiedAt` to `emailVerified` with DB column `email_verified`
- **Files modified:** `src/lib/db/schema/users.ts`
- **Verification:** typecheck passes
- **Committed in:** 6db5e1d (Task 1 commit)

**2. [Rule 1 - Bug] Auth.js adapter expects snake_case property names on accounts table**
- **Found during:** Task 1 (Auth.js configuration)
- **Issue:** TypeScript errors because accounts table used camelCase (refreshToken, accessToken, etc.) but adapter expects snake_case (refresh_token, access_token)
- **Fix:** Changed column property names to snake_case (refresh_token, access_token, expires_at, token_type, id_token, session_state)
- **Files modified:** `src/lib/db/schema/auth.ts`
- **Verification:** typecheck passes
- **Committed in:** 6db5e1d (Task 1 commit)

**3. [Rule 1 - Bug] @auth/core version mismatch between next-auth and drizzle-adapter**
- **Found during:** Task 1 (Auth.js configuration)
- **Issue:** next-auth bundles @auth/core@0.41.0, @auth/drizzle-adapter depends on @auth/core@0.41.1 -- TypeScript sees them as incompatible types
- **Fix:** Cast adapter to `NextAuthConfig["adapter"]` to bridge the version gap
- **Files modified:** `src/lib/auth/config.ts`
- **Verification:** typecheck passes
- **Committed in:** 6db5e1d (Task 1 commit)

**4. [Rule 3 - Blocking] Resend client throws at build time without API key**
- **Found during:** Task 2 (build verification)
- **Issue:** `new Resend(process.env.RESEND_API_KEY)` at module scope throws when API key is empty, breaking production build
- **Fix:** Lazy-initialize Resend client via getter function that creates instance on first use
- **Files modified:** `src/lib/email/send.ts`
- **Verification:** build succeeds
- **Committed in:** 236c0e4 (Task 2 commit)

---

**Total deviations:** 4 auto-fixed (3 bugs, 1 blocking)
**Impact on plan:** All auto-fixes necessary for TypeScript compilation and build success. No scope creep.

## Issues Encountered
- Docker app container failed to start due to port 4300 already in use (dev server running), but database container was already running so migrations applied without issue.

## User Setup Required

**External services require manual configuration for email sending:**
- `RESEND_API_KEY` - Get from [Resend Dashboard](https://resend.com/api-keys). Development works with default `onboarding@resend.dev` sender.
- `AUTH_SECRET` - Already generated and added to `.env.local`.

## Next Phase Readiness
- Auth foundation complete, ready for route protection (proxy.ts) in plan 02-02
- Organization settings page can be built in plan 02-02
- JWT session provides tenantId/role/userId for all protected feature development
- Database schema is ready with all auth tables and proper RLS policies

## Self-Check: PASSED

All 21 created files verified present. All 3 task commits (6db5e1d, 236c0e4, eee5b20) verified in git log.

---
*Phase: 02-authentication-organization*
*Completed: 2026-03-03*
