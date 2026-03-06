# Phase 12: UI Translation - Research

**Researched:** 2026-03-06
**Domain:** Full UI string extraction, locale-aware formatting, and validation error translation with next-intl v4
**Confidence:** HIGH

## Summary

Phase 12 is the largest i18n phase: extracting all hardcoded English strings from ~60 components and ~30 page files, replacing `toLocaleDateString("en-US", ...)` calls with next-intl formatters, translating Zod validation errors, and ensuring API error messages display in the user's locale. The foundation from Phase 11 is solid -- next-intl v4 is configured, 13 namespace JSON files exist with English keys, Romanian translations are already present for all namespaces, and the language switcher works.

The codebase audit reveals three categories of work: (1) **~55 components not yet using `useTranslations`/`getTranslations`** but many already have matching keys in the JSON files -- the work is wiring them up, (2) **~30 hardcoded `toLocaleDateString("en-US", ...)` calls** across components that need replacement with `useFormatter().dateTime()`, and (3) **8 Zod validation schema files** with hardcoded English error messages that need a translated error map. Some components (login, register, forgot-password, some dashboard/analytics) already use `useTranslations` and just need any remaining hardcoded strings caught.

**Primary recommendation:** Work page-section by page-section (auth, navigation/layout, dashboard, sessions/wizard, people/teams, templates, analytics, settings, command palette), replacing hardcoded strings with `t()` calls using existing translation keys. For formatting, create a shared `useLocaleFormatter` pattern wrapping next-intl's `useFormatter`. For Zod, implement a `useZodI18nErrors` hook that sets a translated error map before form validation.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| UITR-01 | User can switch UI language via language picker in user menu | Already built in Phase 11 (language switcher in user-menu.tsx). Verify it works after all strings extracted. |
| UITR-02 | All navigation, layout, and shared component strings are translated | 3 files: sidebar.tsx, top-nav.tsx, user-menu.tsx. Navigation namespace exists. Wire `useTranslations('navigation')`. |
| UITR-03 | All auth pages translated | 6 auth pages. Login already done. Register/forgot-password already import `useTranslations`. Need: invite, verify-email, reset-password, auth layout, email-verification-banner. |
| UITR-04 | All dashboard components translated | 6 components: quick-stats, upcoming-sessions, recent-sessions, overdue-items, nudge-card, nudges-modal. Dashboard namespace has keys. Wire `useTranslations('dashboard')`. |
| UITR-05 | All session wizard components translated | ~20 components in session/. Sessions namespace has 189 lines of keys. Largest area of work. |
| UITR-06 | All people/teams management pages translated | ~12 people + team components. People/teams namespaces exist. Some already use `t()`. |
| UITR-07 | All template builder pages translated | 6 template components. Templates namespace has 88 lines. Some already use `t()`. |
| UITR-08 | All analytics pages translated | 8 analytics components + 2 page files. Analytics namespace exists. Charts need `useFormatter` for axes. |
| UITR-09 | All settings pages translated | 3 settings components. Settings namespace has 90 lines. |
| UITR-10 | Command palette and search UI translated | 1 component: command-palette.tsx. Search namespace has 14 lines. |
| FMT-01 | Dates in locale-appropriate format | Replace ~30 `toLocaleDateString("en-US", ...)` with `useFormatter().dateTime()`. next-intl auto-uses active locale. |
| FMT-02 | Numbers use locale-appropriate separators | Replace `.toFixed()` and raw number display with `useFormatter().number()`. Affects analytics scores, stats. |
| FMT-03 | Relative times respect locale | Replace manual relative time strings with `useFormatter().relativeTime()`. Currently some components hand-roll "X days ago". |
| FMT-04 | Analytics chart axes/tooltips formatted per locale | Recharts `tickFormatter` and custom tooltip components need `useFormatter` instead of `toLocaleDateString("en-US")`. 5 chart components. |
| VALD-01 | Zod validation errors in user's UI language | Create `useZodI18nErrors` hook using Zod's `setErrorMap` with next-intl `t()`. Call before `zodResolver`. Add `zod` namespace to translation files. |
| VALD-02 | API error responses display in user's UI language | API routes return error codes/keys. Client-side error handlers translate codes to messages via `t()`. Add error translation keys to `common` namespace. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next-intl | ^4.8 | `useTranslations()`, `useFormatter()`, `getTranslations()` | Already installed from Phase 11. Provides all translation and formatting APIs. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| recharts | existing | Chart rendering with locale-aware formatters | Pass `useFormatter` results into `tickFormatter` and custom tooltip components |
| react-hook-form | existing | Form library with Zod resolver | `zodResolver` accepts `errorMap` option for translated errors |
| zod | existing | Schema validation | Custom error map for translated messages |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom Zod error map | zod-i18n-map package | Package adds dependency for simple problem. Custom map with next-intl `t()` is ~50 lines and more maintainable. |
| Manual relative time | date-fns `formatDistanceToNow` | next-intl `useFormatter().relativeTime()` already handles this with locale awareness. No extra dependency. |

**Installation:**
```bash
# No new packages needed -- all dependencies from Phase 11
```

## Architecture Patterns

### Pattern 1: Component Translation (Client Components)
**What:** Replace hardcoded strings with `useTranslations()` calls using existing namespace keys.
**When to use:** Every client component with visible text.
**Example:**
```typescript
// BEFORE
<h1>Overview</h1>
<p>No completed sessions yet</p>

// AFTER
'use client';
import { useTranslations } from 'next-intl';

export function DashboardOverview() {
  const t = useTranslations('dashboard');
  return (
    <>
      <h1>{t('welcome', { name: userName })}</h1>
      <p>{t('recent.noSessions')}</p>
    </>
  );
}
```

### Pattern 2: Server Component Translation
**What:** Use `getTranslations()` (async) in Server Components for page-level titles and metadata.
**When to use:** Page files (`page.tsx`) that are Server Components.
**Example:**
```typescript
// src/app/(dashboard)/analytics/page.tsx
import { getTranslations } from 'next-intl/server';

export default async function AnalyticsPage() {
  const t = await getTranslations('analytics');
  return <h1>{t('title')}</h1>;
}
```

### Pattern 3: Locale-Aware Date Formatting (Replacing toLocaleDateString)
**What:** Replace all `toLocaleDateString("en-US", ...)` with next-intl `useFormatter().dateTime()`.
**When to use:** Every date display in the UI. This is the primary FMT-01 pattern.
**Example:**
```typescript
// BEFORE (hardcoded en-US)
const formatted = new Date(date).toLocaleDateString("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

// AFTER (locale-aware)
import { useFormatter } from 'next-intl';

function MyComponent() {
  const format = useFormatter();
  const formatted = format.dateTime(new Date(date), {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
```

### Pattern 4: Recharts Locale-Aware Formatting
**What:** Pass locale-aware formatters into Recharts `tickFormatter` and custom tooltip components.
**When to use:** All 5 chart components (score-trend, velocity, adherence, category-breakdown, session-comparison).
**Example:**
```typescript
'use client';
import { useFormatter, useTranslations } from 'next-intl';

export function ScoreTrendChart({ data }: Props) {
  const format = useFormatter();
  const t = useTranslations('analytics');

  return (
    <XAxis
      tickFormatter={(val: string) =>
        format.dateTime(new Date(val), { month: 'short', day: 'numeric' })
      }
    />
    <Tooltip
      content={({ active, payload }) => {
        if (!active || !payload?.[0]) return null;
        const point = payload[0].payload;
        return (
          <div>
            <p>{format.dateTime(new Date(point.date), { month: 'long', day: 'numeric', year: 'numeric' })}</p>
            <p>{t('chart.score')}: {format.number(point.score, { maximumFractionDigits: 2 })}</p>
          </div>
        );
      }}
    />
  );
}
```

### Pattern 5: Translated Zod Validation Errors
**What:** Create a custom Zod error map that uses next-intl translations, applied via a hook before form validation.
**When to use:** All forms using react-hook-form + zodResolver.
**Example:**
```typescript
// src/lib/i18n/zod-error-map.ts
import { useTranslations } from 'next-intl';
import { z, ZodIssueCode } from 'zod';

export function useZodI18nErrors() {
  const t = useTranslations('validation');

  z.setErrorMap((issue, ctx) => {
    switch (issue.code) {
      case ZodIssueCode.too_small:
        if (issue.type === 'string' && issue.minimum === 1) {
          return { message: t('required') };
        }
        return { message: t('minLength', { min: issue.minimum as number }) };
      case ZodIssueCode.too_big:
        return { message: t('maxLength', { max: issue.maximum as number }) };
      case ZodIssueCode.invalid_string:
        if (issue.validation === 'email') {
          return { message: t('invalidEmail') };
        }
        return { message: ctx.defaultError };
      case ZodIssueCode.invalid_type:
        if (issue.received === 'undefined') {
          return { message: t('required') };
        }
        return { message: t('invalidType') };
      default:
        return { message: ctx.defaultError };
    }
  });
}

// Usage in form component:
export function LoginForm() {
  useZodI18nErrors(); // Sets error map before form renders
  const { register, handleSubmit } = useForm({
    resolver: zodResolver(signInSchema),
  });
}
```

### Pattern 6: API Error Translation (Client-Side)
**What:** API routes return error codes/keys. Client-side catch blocks translate them before displaying in toasts.
**When to use:** All API mutation error handlers.
**Example:**
```typescript
// API route returns structured errors:
// { error: "Not authenticated" } -> keep as-is, translate on client

// Client-side error handler:
const t = useTranslations('common');

try {
  const res = await fetch('/api/...');
  if (!res.ok) {
    const data = await res.json();
    // Map common API errors to translation keys
    const errorKey = API_ERROR_MAP[data.error] || 'error';
    toast.error(t(`errors.${errorKey}`));
  }
} catch {
  toast.error(t('error'));
}
```

### Pattern 7: Relative Time Formatting
**What:** Replace manual relative time calculations with `useFormatter().relativeTime()`.
**When to use:** "X days ago", "in X days", "today", "yesterday" displays.
**Example:**
```typescript
import { useFormatter } from 'next-intl';

function RelativeDate({ date }: { date: Date }) {
  const format = useFormatter();
  // Outputs: "3 days ago" (en) or "acum 3 zile" (ro)
  return <span>{format.relativeTime(date)}</span>;
}
```

### Anti-Patterns to Avoid
- **Adding translation keys without using them:** Every new key in JSON must have a corresponding `t()` call in code
- **Translating inside utility/helper functions:** Translations must happen in React components (hooks require React context). Pass translated strings as props if needed.
- **Using `useTranslations` in Server Components:** Server Components must use `getTranslations` (async). `useTranslations` is for Client Components only.
- **Hardcoding locale in formatters:** Never pass `"en-US"` to any formatting function. Let next-intl use the active locale.
- **Translating at the API layer:** API routes don't have access to user locale easily. Keep error codes generic, translate on the client side.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Date formatting | Custom `Intl.DateTimeFormat("en-US")` wrappers | `useFormatter().dateTime()` | Automatically uses active locale, consistent across app |
| Relative time | Manual "X days ago" string building | `useFormatter().relativeTime()` | Handles locale grammar (Romanian "acum 3 zile"), edge cases |
| Number formatting | `.toFixed(2)` or template literals | `useFormatter().number()` | Romanian uses comma for decimals, dot for thousands |
| Zod error translation | Per-schema hardcoded messages | Global error map via `useZodI18nErrors()` | One place to maintain, covers all schemas automatically |
| Plural forms | `count === 1 ? "item" : "items"` | ICU MessageFormat via `t('key', { count })` | Romanian has 3 plural forms (one/few/other) |

**Key insight:** next-intl's `useFormatter()` wraps the browser's `Intl` API but automatically passes the active locale. Every manual `toLocaleDateString("en-US", ...)` is a bug waiting to happen because it ignores the user's locale preference.

## Common Pitfalls

### Pitfall 1: useFormatter in Recharts Callbacks
**What goes wrong:** Recharts `tickFormatter` is a plain function, not a React component. You can't call `useFormatter()` inside it.
**Why it happens:** Recharts callbacks are not React hooks contexts.
**How to avoid:** Call `useFormatter()` at the component level, capture the formatter in a variable, use it inside the callback closure.
**Warning signs:** "Hooks can only be called inside the body of a function component" errors.

### Pitfall 2: Zod setErrorMap is Global
**What goes wrong:** `z.setErrorMap()` sets the error map globally. If called in one component, it affects all other components.
**Why it happens:** Zod uses a module-level singleton for the error map.
**How to avoid:** Call `useZodI18nErrors()` at the top of every form component, or call it once in a top-level provider. The hook re-sets the map with current locale's translations on every render, which handles language switches correctly.
**Warning signs:** Stale language error messages after switching locale.

### Pitfall 3: Server Components Cannot Use useFormatter
**What goes wrong:** `useFormatter` is a hook and cannot be used in Server Components.
**Why it happens:** Server Components don't support React hooks.
**How to avoid:** For Server Components needing formatted dates, use `getFormatter()` from `next-intl/server` or pass formatting down to Client Components.
**Warning signs:** Build errors about hooks in server context.

### Pitfall 4: Missing Translation Keys Cause Runtime Errors
**What goes wrong:** Calling `t('nonexistent.key')` throws in development (next-intl strict mode).
**Why it happens:** TypeScript catches key errors at build time via AppConfig, but only if the JSON files are in sync with code.
**How to avoid:** Add keys to EN JSON first, run typecheck, then wire up `t()` calls. The existing `global.d.ts` type augmentation will catch mismatches.
**Warning signs:** TypeScript errors about translation key arguments.

### Pitfall 5: Toast Error Messages from API Responses
**What goes wrong:** API returns English error strings, toast displays them raw in Romanian UI.
**Why it happens:** API routes don't know the user's locale and return hardcoded English errors.
**How to avoid:** Two strategies: (a) Map known API error strings to translation keys on the client, or (b) have API routes return error codes that the client translates. Strategy (a) is simpler for this codebase since error strings are consistent.
**Warning signs:** Mixed-language toasts (Romanian UI with English error text).

### Pitfall 6: Shared Validation Schemas on Server and Client
**What goes wrong:** Zod schemas in `src/lib/validations/` are shared between API routes (server) and forms (client). Adding `t()` calls directly in schemas breaks server-side usage.
**Why it happens:** `useTranslations` only works in React component context.
**How to avoid:** Keep schemas language-agnostic (generic error messages or no messages). Apply translation via the error map at the form level, not the schema level.
**Warning signs:** "useTranslations is not available outside of React" errors in API routes.

## Code Examples

### Validation Namespace Translation File
```json
// messages/en/validation.json
{
  "validation": {
    "required": "This field is required",
    "invalidEmail": "Please enter a valid email address",
    "minLength": "Must be at least {min} characters",
    "maxLength": "Must be at most {max} characters",
    "passwordUppercase": "Must contain at least one uppercase letter",
    "passwordLowercase": "Must contain at least one lowercase letter",
    "passwordNumber": "Must contain at least one number",
    "passwordsMatch": "Passwords don't match",
    "invalidUrl": "Must be a valid URL"
  }
}
```

### Common Error Keys for API Responses
```json
// Addition to messages/en/common.json
{
  "common": {
    "errors": {
      "unauthorized": "Please sign in to continue",
      "forbidden": "You don't have permission to do this",
      "notFound": "The requested resource was not found",
      "badRequest": "Invalid request",
      "rateLimited": "Too many requests. Please try again later",
      "serverError": "Something went wrong. Please try again.",
      "networkError": "Unable to connect. Check your internet connection."
    }
  }
}
```

### useFormatter for Server Components
```typescript
// Source: next-intl docs
import { getFormatter } from 'next-intl/server';

export default async function Page() {
  const format = await getFormatter();
  const date = format.dateTime(new Date(), { dateStyle: 'long' });
  return <p>Created: {date}</p>;
}
```

## Component Inventory by Area

### Area 1: Auth Pages (UITR-03)
| Component | File | Status | Notes |
|-----------|------|--------|-------|
| Login | `(auth)/login/page.tsx` | DONE | Already uses `useTranslations('auth')` |
| Register | `(auth)/register/page.tsx` | PARTIAL | Imports `useTranslations` but may have hardcoded strings |
| Forgot Password | `(auth)/forgot-password/page.tsx` | PARTIAL | Imports `useTranslations` |
| Reset Password | `(auth)/reset-password/page.tsx` | TODO | No translations |
| Verify Email | `(auth)/verify-email/page.tsx` | TODO | No translations |
| Invite Accept | `(auth)/invite/[token]/` | TODO | 2 files, no translations |
| Email Verification Banner | `auth/email-verification-banner.tsx` | TODO | No translations |

### Area 2: Navigation & Layout (UITR-02)
| Component | File | Status | Notes |
|-----------|------|--------|-------|
| Sidebar | `layout/sidebar.tsx` | DONE | Uses `useTranslations('navigation')` |
| Top Nav | `layout/top-nav.tsx` | DONE | Uses `useTranslations` |
| User Menu | `layout/user-menu.tsx` | DONE | Uses `useTranslations`, has language switcher |

### Area 3: Dashboard (UITR-04)
| Component | File | Status | Notes |
|-----------|------|--------|-------|
| Quick Stats | `dashboard/quick-stats.tsx` | DONE | Uses `useTranslations('dashboard')` |
| Upcoming Sessions | `dashboard/upcoming-sessions.tsx` | DONE | Uses `useTranslations` |
| Recent Sessions | `dashboard/recent-sessions.tsx` | DONE | Uses `useTranslations` BUT has hardcoded `toLocaleDateString("en-US")` |
| Overdue Items | `dashboard/overdue-items.tsx` | DONE | Uses `useTranslations` |
| Nudge Card | `dashboard/nudge-card.tsx` | DONE | Uses `useTranslations` BUT has hardcoded date |
| Nudges Modal | `dashboard/nudges-modal.tsx` | DONE | Uses `useTranslations` |
| Overview Page | `(dashboard)/overview/page.tsx` | DONE | Uses `getTranslations` |

### Area 4: Sessions & Wizard (UITR-05)
| Component | File | Status | Notes |
|-----------|------|--------|-------|
| Series List | `series/series-list.tsx` | DONE | Uses `useTranslations` |
| Series Card | `series/series-card.tsx` | DONE | Has `toLocaleDateString` to fix |
| Series Detail | `series/series-detail.tsx` | DONE | Has `toLocaleDateString` to fix |
| Series Form | `series/series-form.tsx` | DONE | Uses `useTranslations` |
| Session Timeline | `series/session-timeline.tsx` | DONE | Has `toLocaleDateString` to fix |
| Wizard Shell | `session/wizard-shell.tsx` | DONE | Uses `useTranslations` |
| Wizard Top Bar | `session/wizard-top-bar.tsx` | DONE | Has hardcoded `toLocaleDateString("en-US")` |
| Category Step | `session/category-step.tsx` | DONE | Uses `useTranslations` |
| Question Widget | `session/question-widget.tsx` | TODO | No translations |
| Yes/No Widget | `session/widgets/yes-no-widget.tsx` | DONE | Uses `useTranslations` |
| Mood Widget | `session/widgets/mood-widget.tsx` | DONE | Uses `useTranslations` |
| Rating 1-5 | `session/widgets/rating-1-5-widget.tsx` | DONE | Uses `useTranslations` |
| Rating 1-10 | `session/widgets/rating-1-10-widget.tsx` | TODO | No translations |
| Multiple Choice | `session/widgets/multiple-choice-widget.tsx` | TODO | No translations |
| Text Widget | `session/widgets/text-widget.tsx` | TODO | No translations |
| Summary Screen | `session/summary-screen.tsx` | DONE | Has dates to fix |
| Session Summary View | `session/session-summary-view.tsx` | DONE | Has dates to fix |
| Context Panel | `session/context-panel.tsx` | DONE | Has `toLocaleDateString("en-US")` and `useFormatter` |
| Floating Context | `session/floating-context-widgets.tsx` | DONE | Has `toLocaleDateString("en-US")` and `useFormatter` |
| Question History | `session/question-history-dialog.tsx` | DONE | Has `toLocaleDateString` and `useFormatter` |
| Notes Editor | `session/notes-editor.tsx` | TODO | No translations |
| Save Status | `session/save-status.tsx` | TODO | No translations |
| Wizard Navigation | `session/wizard-navigation.tsx` | TODO | No translations |
| Wizard Step Sidebar | `session/wizard-step-sidebar.tsx` | TODO | No translations |
| Wizard Mobile Carousel | `session/wizard-mobile-carousel.tsx` | TODO | No translations |
| Recap Screen | `session/recap-screen.tsx` | TODO | Has `toLocaleDateString("en-US")` |
| Talking Point List | `session/talking-point-list.tsx` | TODO | Has date formatting |
| Action Item Inline | `session/action-item-inline.tsx` | TODO | Has `toLocaleDateString("en-US")` |
| Nudge List | `session/nudge-list.tsx` | TODO | No translations |
| AI Suggestions | `session/ai-suggestions-section.tsx` | TODO | No translations |
| AI Summary | `session/ai-summary-section.tsx` | TODO | No translations |
| Score Sparkline | `session/score-sparkline.tsx` | TODO | No translations needed (visual only) |

### Area 5: People & Teams (UITR-06)
| Component | File | Status | Notes |
|-----------|------|--------|-------|
| People Table | `people/people-table.tsx` | DONE | Uses `useTranslations` |
| People Table Columns | `people/people-table-columns.tsx` | DONE | Uses `useTranslations` |
| People Tabs | `people/people-tabs.tsx` | DONE | Uses `useTranslations` |
| Invite Dialog | `people/invite-dialog.tsx` | DONE | Uses `useTranslations`, some hardcoded error toasts |
| Invite Button | `people/invite-button.tsx` | DONE | Uses `useTranslations` |
| Role Select | `people/role-select.tsx` | DONE | Uses `useTranslations`, some hardcoded toasts |
| Profile Sheet | `people/profile-sheet.tsx` | DONE | Uses `useTranslations` |
| User Actions Menu | `people/user-actions-menu.tsx` | DONE | Uses `useTranslations` |
| Manager Select | `people/manager-select.tsx` | TODO | Hardcoded toast messages |
| Member Picker | `people/member-picker.tsx` | TODO | Hardcoded toast messages |
| Team Card | `people/team-card.tsx` | TODO | No translations |
| Team Create Dialog | `people/team-create-dialog.tsx` | TODO | Hardcoded toast messages |
| Teams Grid | `teams/teams-grid.tsx` | DONE | Uses `useTranslations` |
| Team Detail | `teams/[id]/team-detail-client.tsx` | DONE | Has `toLocaleDateString("en-US")`, some hardcoded |
| Profile Edit Form | `people/[id]/profile-edit-form.tsx` | TODO | No translations |
| Profile Page | `people/[id]/page.tsx` | TODO | Has `toLocaleDateString("en-US")` |

### Area 6: Templates (UITR-07)
| Component | File | Status | Notes |
|-----------|------|--------|-------|
| Template List | `templates/template-list.tsx` | DONE | Uses `useTranslations` |
| Template Editor | `templates/template-editor.tsx` | DONE | Uses `useTranslations`, some hardcoded error toasts |
| Question Form | `templates/question-form.tsx` | DONE | Uses `useTranslations` |
| Question Card | `templates/question-card.tsx` | TODO | No translations |
| Answer Config Form | `templates/answer-config-form.tsx` | TODO | No translations |
| Conditional Logic Form | `templates/conditional-logic-form.tsx` | TODO | No translations |

### Area 7: Analytics (UITR-08)
| Component | File | Status | Notes |
|-----------|------|--------|-------|
| Score Trend Chart | `analytics/score-trend-chart.tsx` | TODO | Hardcoded "en-US" dates, hardcoded "Score:" |
| Velocity Chart | `analytics/velocity-chart.tsx` | TODO | Hardcoded dates |
| Adherence Chart | `analytics/adherence-chart.tsx` | TODO | Hardcoded dates |
| Category Breakdown | `analytics/category-breakdown.tsx` | DONE | Uses `useTranslations` |
| Session Comparison | `analytics/session-comparison.tsx` | TODO | Hardcoded dates, labels |
| Team Overview | `analytics/team-overview.tsx` | DONE | Uses `useTranslations` |
| Team Heatmap | `analytics/team-heatmap.tsx` | TODO | No translations |
| Period Selector | `analytics/period-selector.tsx` | DONE | Uses `useTranslations` |
| CSV Export Button | `analytics/csv-export-button.tsx` | DONE | Uses `useTranslations` |
| Analytics Page | `analytics/page.tsx` | DONE | Uses `getTranslations` |
| Individual Analytics | `analytics/individual/[id]/client.tsx` | DONE | Uses `useTranslations` |

### Area 8: Settings (UITR-09)
| Component | File | Status | Notes |
|-----------|------|--------|-------|
| Company Settings Form | `settings/company/company-settings-form.tsx` | DONE | Uses `useTranslations` |
| Company Settings Page | `settings/company/page.tsx` | DONE | Uses `getTranslations` |
| Audit Log Client | `settings/audit-log/audit-log-client.tsx` | DONE | Uses `useTranslations`, has `toLocaleDateString("en-US")` |
| Audit Log Page | `settings/audit-log/page.tsx` | TODO | No translations |

### Area 9: Command Palette (UITR-10)
| Component | File | Status | Notes |
|-----------|------|--------|-------|
| Command Palette | `search/command-palette.tsx` | DONE | Uses `useTranslations` |

### Area 10: History & Action Items
| Component | File | Status | Notes |
|-----------|------|--------|-------|
| History Page | `history/history-page.tsx` | DONE | Uses `useTranslations`, has `toLocaleDateString("en-US")` |
| Action Items Page | `action-items/action-items-page.tsx` | DONE | Uses `useTranslations`, has `toLocaleDateString("en-US")` and `useFormatter` |

## Scope Summary

### Already Using Translations (need date formatting fixes only)
~40 components already import `useTranslations` or `getTranslations`. Many still have:
- `toLocaleDateString("en-US", ...)` calls (must replace with `useFormatter`)
- Hardcoded toast error messages (must replace with `t()` calls)

### Need Full Translation Wiring
~20 components have no translation imports at all. Most need:
- `useTranslations()` import and `t()` calls for all visible strings
- Matching keys may already exist in JSON files

### New Translation Infrastructure
- `validation.json` namespace (EN + RO) for Zod error messages
- Error keys added to `common.json` for API error translation
- `useZodI18nErrors()` hook
- `global.d.ts` updated to include validation namespace

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `toLocaleDateString("en-US")` | `useFormatter().dateTime()` | next-intl v4 | All dates automatically respect user locale |
| Hardcoded Zod `.message()` | Global error map via `z.setErrorMap()` | Zod 3.x | One error map handles all schemas |
| Per-component error translation | `useZodI18nErrors()` hook pattern | Community pattern | Consistent, maintainable |

## Open Questions

1. **Namespace loading optimization**
   - What we know: All 13 namespaces load on every page (from Phase 11 `i18n/request.ts`). A validation namespace will be #14.
   - What's unclear: Whether this has measurable performance impact
   - Recommendation: Add the namespace now, optimize later in Phase 14 if needed. For 14 small JSON files, the overhead is negligible.

2. **Server-side formatter availability**
   - What we know: `getFormatter()` from `next-intl/server` exists for Server Components
   - What's unclear: Whether all pages using dates are Server or Client Components
   - Recommendation: Most date-displaying components are Client Components (interactive). Use `useFormatter()` predominantly. Server Components use `getFormatter()`.

## Sources

### Primary (HIGH confidence)
- next-intl v4 official docs: `useFormatter`, `useTranslations`, `getTranslations`, `getFormatter` APIs
- Existing codebase audit: 60 files with `useTranslations` already wired up, 30+ `toLocaleDateString("en-US")` calls identified
- Phase 11 research and implementation summaries

### Secondary (MEDIUM confidence)
- [Translating Zod errors with next-intl](https://www.gcasc.io/blog/next-intl-zod) - Pattern for `useZodI18nErrors` hook using Zod's `setErrorMap`
- [next-intl-zod GitHub demo](https://github.com/gcascio/next-intl-zod) - Reference implementation for Zod + next-intl integration
- [next-intl Zod discussion #437](https://github.com/amannn/next-intl/discussions/437) - Community patterns for Zod integration

### Tertiary (LOW confidence)
- None -- all patterns verified against official docs and codebase inspection.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already installed and working from Phase 11
- Architecture: HIGH - Patterns already proven in ~40 components using translations; extending to remaining components
- Formatting: HIGH - next-intl `useFormatter()` is documented and already used in 5 components
- Zod integration: MEDIUM - Community pattern, not official next-intl feature, but well-documented and straightforward
- Pitfalls: HIGH - Based on actual codebase analysis of hardcoded patterns

**Research date:** 2026-03-06
**Valid until:** 2026-04-06 (stable stack, no expected breaking changes)
