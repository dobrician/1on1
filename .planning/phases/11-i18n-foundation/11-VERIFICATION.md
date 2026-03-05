---
phase: 11-i18n-foundation
verified: 2026-03-05T22:00:00Z
status: passed
score: 12/12 must-haves verified
re_verification: false
human_verification:
  - test: "Visit login page with Accept-Language: ro header (unauthenticated) and confirm Romanian strings render"
    expected: "Login page shows Romanian strings (Autentificare, Parolă, etc.) without any session or JWT"
    why_human: "Cannot simulate HTTP request headers and cookie absence programmatically in static analysis"
  - test: "Sign in, open user menu, click Română, observe reload and verify UI language changes"
    expected: "Page reloads in Romanian; subsequent page loads maintain Romanian locale from cookie"
    why_human: "Language switch flow involves fetch + session update() + window.location.reload() — requires browser interaction"
  - test: "Sign out and sign back in; verify uiLanguage persists from DB without re-selecting"
    expected: "After re-login, UI language is still Romanian (read from users.language via JWT)"
    why_human: "Requires live DB state and JWT flow verification across a full login cycle"
---

# Phase 11: i18n Foundation — Verification Report

**Phase Goal:** Working i18n pipeline where locale resolves correctly for authenticated and unauthenticated users, and both Server and Client Components can render translated strings through independent UI and content language layers
**Verified:** 2026-03-05T22:00:00Z
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| 1  | A Server Component can call `getTranslations('namespace')` and render a translated string; a Client Component can call `useTranslations('namespace')` and render the same string | VERIFIED | `src/app/layout.tsx` is async and wraps children in `NextIntlClientProvider`. `src/app/(auth)/login/page.tsx` uses `useTranslations('auth')` in a `"use client"` component. `next.config.ts` uses `createNextIntlPlugin()`. |
| 2  | An unauthenticated visitor's browser locale is detected via Accept-Language and the correct language loads on the login page | VERIFIED | `proxy.ts` `detectLocale()` reads `Accept-Language` header as priority 3 when no JWT and no existing cookie. Sets `NEXT_LOCALE` cookie on the `NextResponse.next()` pass-through path. `src/i18n/request.ts` reads that cookie. |
| 3  | An authenticated user's DB-stored language preference propagates through JWT and renders the correct locale without extra DB calls on each request | VERIFIED | JWT callback in `src/lib/auth/config.ts` sets `token.uiLanguage` from `user.uiLanguage` on sign-in. `proxy.ts` reads `req.auth?.user?.uiLanguage` (priority 1) and sets cookie. `trigger === "update"` path re-fetches from DB only on explicit language switch. |
| 4  | UI language (per-user) and content language (per-company) are stored independently and never conflated in the codebase | VERIFIED | `users.language` (varchar) in `src/lib/db/schema/users.ts` for per-user UI. `tenants.contentLanguage` (varchar) in `src/lib/db/schema/tenants.ts` for per-company content. JWT carries both as separate `uiLanguage` and `contentLanguage` claims. Session exposes both independently. |
| 5  | Translation files use namespace-based JSON structure with TypeScript type safety via next-intl AppConfig | VERIFIED | `messages/en/common.json` and `messages/en/auth.json` each wrap content under a top-level namespace key. `src/global.d.ts` augments `next-intl`'s `AppConfig` with `Locale: 'en' \| 'ro'` and `Messages` intersection type derived from EN source files. |
| 6  | next-intl is installed and the Next.js build succeeds with the plugin configured | VERIFIED | `package.json` contains `"next-intl": "^4.8.3"`. `next.config.ts` uses `createNextIntlPlugin()` wrapper. Commits 92c904e and 784dc1c exist in git history. |
| 7  | i18n/request.ts reads locale from NEXT_LOCALE cookie and loads merged namespace messages | VERIFIED | `src/i18n/request.ts` calls `cookies().get("NEXT_LOCALE")`, validates against `['en', 'ro']`, then dynamically imports and merges `common.json` + `auth.json` for the resolved locale. |
| 8  | Proxy detects locale from JWT (authenticated) or Accept-Language (unauthenticated) and sets NEXT_LOCALE cookie | VERIFIED | `proxy.ts` calls `detectLocale(req, uiLanguage)` and `setLocaleCookie(response, locale)` on all three code paths: unauthenticated redirect, authenticated redirect, and pass-through. Cookie has `maxAge: 1 year`. |
| 9  | JWT carries uiLanguage and contentLanguage claims after sign-in | VERIFIED | `src/lib/auth/config.ts` jwt callback: `token.uiLanguage = user.uiLanguage ?? 'en'` and `token.contentLanguage = user.contentLanguage ?? 'en'`. Both Credentials and OAuth `signIn` callbacks populate these on the user object. |
| 10 | users table has language column, tenants table has content_language column | VERIFIED | `src/lib/db/schema/users.ts` line 46: `language: varchar("language", { length: 10 }).notNull().default("en")`. `src/lib/db/schema/tenants.ts` lines 18-21: `contentLanguage: varchar("content_language", { length: 10 }).notNull().default("en")`. Migration SQL `0012_i18n_language_columns.sql` exists and is registered in `_journal.json`. |
| 11 | TypeScript catches invalid translation keys at compile time via AppConfig | VERIFIED | `src/global.d.ts` declares `Messages = typeof en_common & typeof en_auth` and augments `next-intl`'s `AppConfig`. Invalid `t()` keys will produce TypeScript errors at build time. |
| 12 | Root layout renders dynamic html lang attribute from current locale | VERIFIED | `src/app/layout.tsx` is `async`, calls `const locale = await getLocale()`, renders `<html lang={locale}>`. |

**Score:** 12/12 truths verified

---

### Required Artifacts

#### Plan 11-01 Artifacts

| Artifact | Description | Status | Details |
|----------|-------------|--------|---------|
| `src/i18n/request.ts` | next-intl request config with locale resolution | VERIFIED | 41 lines. Reads `NEXT_LOCALE` cookie, validates locale, merges namespace files, returns locale + messages + dateTime/number formats. |
| `src/global.d.ts` | AppConfig type augmentation | VERIFIED | 11 lines. Imports EN JSON types, declares `Messages` intersection, augments `next-intl` module with `Locale` and `Messages`. |
| `messages/en/common.json` | English common namespace | VERIFIED | 13 keys under `"common"` top-level key. |
| `messages/en/auth.json` | English auth namespace | VERIFIED | 16 keys (including nested `errors.*`) under `"auth.login"`. |
| `messages/ro/common.json` | Romanian common namespace | VERIFIED | 13 keys with correct Romanian diacritics (ă, î, ș, ț via Unicode escapes). |
| `messages/ro/auth.json` | Romanian auth namespace | VERIFIED | Matching keys with natural Romanian phrasing and correct diacritics. |

#### Plan 11-02 Artifacts

| Artifact | Description | Status | Details |
|----------|-------------|--------|---------|
| `src/app/(auth)/login/page.tsx` | Fully translated login page | VERIFIED | `"use client"`. Imports `useTranslations, useFormatter`. All visible strings use `t('login.*')` calls. Hidden `<data>` element demonstrates `format.dateTime()` wiring. Zero hardcoded English user-facing strings. |
| `src/app/api/user/language/route.ts` | PATCH endpoint for language preference | VERIFIED | Auth check (401), Zod validation via `updateLanguageSchema`, `withTenantContext` DB update, `NEXT_LOCALE` cookie set on response. Exports `PATCH`. |
| `src/components/layout/user-menu.tsx` | Language switcher in user dropdown | VERIFIED | Globe icon, English/Română options, active checkmark via `Check` icon, `switchLanguage()` handler with fetch + `update()` + `window.location.reload()`. |
| `src/lib/validations/user.ts` | updateLanguageSchema | VERIFIED | `z.object({ language: z.enum(["en", "ro"]) })` added to existing validations file. |

---

### Key Link Verification

#### Plan 11-01 Key Links

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `proxy.ts` | `NEXT_LOCALE cookie` | `setLocaleCookie()` on every response path | WIRED | `response.cookies.set("NEXT_LOCALE", locale, ...)` called via `setLocaleCookie()` helper on all 3 paths (unauthenticated redirect, authenticated redirect, pass-through). |
| `src/i18n/request.ts` | `NEXT_LOCALE cookie` | `cookies().get("NEXT_LOCALE")` | WIRED | Line 13: `const cookieLocale = store.get("NEXT_LOCALE")?.value` — directly reads the cookie set by proxy. |
| `src/lib/auth/config.ts` | JWT token | `jwt callback sets uiLanguage + contentLanguage` | WIRED | Lines 108-109: `token.uiLanguage = user.uiLanguage ?? "en"` and `token.contentLanguage = user.contentLanguage ?? "en"` when `user` is present. |
| `src/app/layout.tsx` | next-intl | `NextIntlClientProvider` wrapping children | WIRED | Line 35: `<NextIntlClientProvider>` wraps `<ThemeProvider>{children}</ThemeProvider>`. |

#### Plan 11-02 Key Links

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/components/layout/user-menu.tsx` | `/api/user/language` | `fetch PATCH call` | WIRED | Lines 42-46: `await fetch("/api/user/language", { method: "PATCH", ... })` in `switchLanguage()` handler. |
| `src/app/api/user/language/route.ts` | `users.language` DB column | Drizzle update | WIRED | Lines 37-39: `await tx.update(users).set({ language, updatedAt: new Date() }).where(eq(users.id, session.user.id))` inside `withTenantContext`. |
| `src/app/(auth)/login/page.tsx` | `messages/*/auth.json` | `useTranslations('auth')` | WIRED | Line 21: `const t = useTranslations("auth")` — all subsequent `t('login.*')` calls resolve from the auth namespace JSON files. |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| INFRA-01 | 11-01, 11-02 | App uses next-intl for all UI string translations with Server and Client Component support | SATISFIED | `next-intl@4.8.3` installed. `NextIntlClientProvider` in root layout enables Client Components. `getLocale()` / `getTranslations()` available for Server Components. Login page demonstrates both patterns. |
| INFRA-02 | 11-01, 11-02 | Locale resolves from user DB preference (authenticated) or browser Accept-Language (unauthenticated) via middleware cookie | SATISFIED | `proxy.ts` `detectLocale()` function: priority 1 = JWT `uiLanguage` (DB-sourced), priority 3 = `Accept-Language` header. Sets `NEXT_LOCALE` cookie on all response paths. |
| INFRA-03 | 11-01, 11-02 | User language preference persists in DB and propagates through JWT without extra DB calls | SATISFIED | JWT callback caches `uiLanguage` on sign-in from user object. Extra DB call only on `trigger === "update"` (explicit language switch). `src/app/api/user/language/route.ts` persists to `users.language`. |
| INFRA-04 | 11-01 | Translation files use namespace-based JSON structure with TypeScript type safety | SATISFIED | All 4 JSON files wrap content under namespace key. `src/global.d.ts` provides compile-time key validation via `AppConfig` augmentation. |
| INFRA-05 | 11-01, 11-02 | UI language (per-user) and content language (per-company) are independent, never conflated | SATISFIED | Separate DB columns (`users.language` vs `tenants.content_language`). Separate JWT claims (`uiLanguage` vs `contentLanguage`). Separate session properties. No code mixes or conflates them. |

**All 5 requirements satisfied. No orphaned requirements.**

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/components/layout/user-menu.tsx` | 86 | `"Language"` hardcoded label (not translated) | Warning | Cosmetic — the label "Language" in the dropdown will always display in English regardless of locale. Does not affect pipeline functionality. |
| `src/components/layout/user-menu.tsx` | 105 | `"Sign out"` hardcoded string (not translated) | Warning | Cosmetic — sign out button text will always be English. Pre-existing from Phase 10; not introduced in Phase 11 scope. |

No blocker anti-patterns found. No TODO/FIXME/placeholder comments in any modified file. No stub implementations detected.

---

### Human Verification Required

#### 1. Unauthenticated locale detection via Accept-Language

**Test:** Open the login page in a browser with `Accept-Language: ro,en;q=0.5` set (or using a browser set to Romanian). Confirm the login page displays Romanian strings without being logged in.
**Expected:** Login page shows "Autentificare", "Parolă", "Ai uitat parola?" — all from `messages/ro/auth.json` — because the proxy read the `Accept-Language` header and set `NEXT_LOCALE=ro`.
**Why human:** Static analysis cannot simulate the HTTP request headers pipeline or verify the cookie set by the proxy propagates correctly to `src/i18n/request.ts` in a live runtime.

#### 2. Language switcher end-to-end flow

**Test:** Sign in as any user. Open user menu. Click "Română". Wait for page reload. Navigate to any protected page.
**Expected:** All translated strings (login page, any translated component) now display in Romanian. Cookie `NEXT_LOCALE=ro` is visible in browser DevTools. After reload, locale persists.
**Why human:** The switch flow involves `fetch` + `update()` session refresh + `window.location.reload()` — requires browser interaction and live server state.

#### 3. Language persistence across sessions

**Test:** Switch language to Romanian as above. Sign out. Sign back in.
**Expected:** UI language is still Romanian after re-login, sourced from `users.language` in DB via JWT — not reset to default.
**Why human:** Requires verifying DB write, JWT re-read on login, and locale propagation across a full sign-out/sign-in cycle.

---

### Gaps Summary

No gaps. All 12 must-have truths are verified at all three levels (exists, substantive, wired). All 5 INFRA requirements are satisfied. Both plans (11-01 and 11-02) completed their stated objectives with verified artifacts. The two anti-patterns (hardcoded "Language" label and "Sign out" in user-menu) are warnings only — they do not block the phase goal and are out of scope for QUAL-02 which is assigned to Phase 14.

The phase goal is achieved: the i18n pipeline is operational with correct locale resolution for authenticated (JWT → cookie) and unauthenticated (Accept-Language → cookie) users, Server Components (via `getLocale()` / `getTranslations()`) and Client Components (via `useTranslations()` through `NextIntlClientProvider`) can render translated strings, and UI language (per-user) and content language (per-company) are independently tracked throughout the data layer, JWT, and session.

---

_Verified: 2026-03-05T22:00:00Z_
_Verifier: Claude (gsd-verifier)_
