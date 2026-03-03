# Phase 2: Authentication & Organization

**Status**: Complete (2026-03-03)
**Depends on**: Phase 1

## Goal

Users can securely create accounts, sign in through multiple methods, and register organizations with full tenant isolation.

## Success Criteria

1. User can create an account with email/password and receives a verification email
2. User can sign in with Google OAuth or Microsoft OAuth and lands in their organization
3. User session persists across browser refresh and user can log out from any page
4. User can reset a forgotten password via a time-limited email link
5. Admin can register a new organization and configure its settings (timezone, cadence, duration, org type)

## What Was Built

### Plan 02-01: Auth & Email
- Auth.js v5 with Credentials, Google OAuth, Microsoft Entra ID providers
- JWT session strategy carrying tenantId, role, userId, emailVerified
- 5 auth database tables (account, auth_session, verification_token, email_verification_token, password_reset_token)
- Server actions for register, verify-email, forgot-password, reset-password, logout
- Email infrastructure with nodemailer + React Email templates
- Zod validation schemas for all auth forms
- 5 auth pages: login, register, verify-email, forgot-password, reset-password
- shadcn/ui components: Button, Input, Label, Card

### Plan 02-02: Route Protection & OAuth
- `proxy.ts` route protection (Next.js 16 convention) — unauthenticated to /login, authenticated away from auth pages
- Dashboard layout with SessionProvider for client component session access
- Overview page with user info, email verification banner, logout button
- Branded Google and Microsoft SVG icons on OAuth buttons
- Defense-in-depth: both proxy.ts and dashboard layout validate session independently

### Plan 02-03: Organization Type & Settings
- `org_type` enum column on tenant table (for_profit / non_profit)
- Registration enhanced with org type radio selector (immutable after creation)
- Admin-only organization settings page at `/settings/company`
- Settings API route (GET/PUT) with Zod validation and tenant-scoped access
- All auth redirects converted to server-side actions for reverse proxy compatibility
- Switched from Resend to nodemailer — works with any SMTP provider

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| `proxy.ts` (Next.js 16) over `middleware.ts` | Next.js 16 convention; server looks for proxy export first |
| Defense-in-depth auth | Dashboard layout also checks session — mitigates CVE-2025-29927 proxy bypass |
| Server-action auth redirects | Client-side `signIn()` constructs localhost URLs behind reverse proxy |
| Nodemailer over Resend | Works with any SMTP provider (smtp2go); Resend required its own API |
| `org_type` as dedicated column | Structural property affecting business logic, not a JSONB setting |
| `orgType` immutable after registration | Set once during onboarding, read-only badge in settings |
| Token tables have no RLS | Accessed in unauthenticated flows (registration, password reset) |
| Email URLs from request headers | `getBaseUrl()` reads `x-forwarded-proto` + `x-forwarded-host` — no hardcoded URL |

## Key Files

```
src/lib/auth/config.ts
src/lib/auth/actions.ts
src/lib/db/schema/auth.ts
src/lib/validations/auth.ts, organization.ts
src/types/next-auth.d.ts
src/lib/email/send.ts
src/lib/email/templates/verification.tsx, password-reset.tsx
src/app/api/auth/[...nextauth]/route.ts
src/app/(auth)/layout.tsx
src/app/(auth)/login/page.tsx, register/page.tsx, verify-email/page.tsx
src/app/(auth)/forgot-password/page.tsx, reset-password/page.tsx
src/app/(dashboard)/layout.tsx, overview/page.tsx
src/app/(dashboard)/settings/company/page.tsx, company-settings-form.tsx
src/app/api/settings/company/route.ts
src/components/auth/logout-button.tsx
proxy.ts
```

## Requirements Satisfied

AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, AUTH-07, ORG-01, ORG-04, ORG-05

## Verification

12/12 automated checks passed. 8 items need human verification (registration flow, route protection, settings persistence, RBAC, email verification, password reset, OAuth buttons, visual quality). Full report: `.planning/phases/02-authentication-organization/02-VERIFICATION.md`
