# Phase 13: Email Translation - Research

**Researched:** 2026-03-06
**Domain:** next-intl standalone translation, React Email templates, background-job i18n
**Confidence:** HIGH

## Summary

The email system is currently hardcoded in English. All six email templates (`verification`, `password-reset`, `invite`, `session-summary`, `pre-meeting-reminder`, `agenda-prep`) contain static English strings. The architecture requires two distinct language-selection strategies: company content language (from `tenants.content_language`) for company-facing emails (invites, session summaries, reminders), and user UI language (from `users.language`) for personal transactional emails (password reset, email verification).

The core technical challenge is that `next-intl`'s `getTranslations()` only works inside the Next.js request lifecycle (it requires the `next/headers` cookies API). All email sending happens outside this context — from API route handlers that call send functions directly, and from the `runAIPipelineDirect` background function. The solution is `createTranslator` from `use-intl/core`, which is next-intl's lower-level primitive that accepts an explicit `locale` and loaded `messages` object, requiring no request context.

**Primary recommendation:** Build a single `createEmailTranslator(locale)` utility in `src/lib/email/translator.ts` that loads message files from the filesystem and returns a `createTranslator` instance. All email send functions receive `locale` as an explicit parameter. Email templates become pure translation-key-driven components, receiving a `t` function as a prop or using translated strings passed in as props.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `use-intl/core` | 3.x (bundled with next-intl 4.8.3) | `createTranslator` for out-of-request translation | Already installed as next-intl's core; no new dependency |
| `next-intl` | 4.8.3 | Message file format already established; type system in place | Already the project's i18n library |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@react-email/render` | 2.0.4 | Renders translated React Email templates to HTML | Already in use for all email rendering |
| Node.js `fs/promises` | built-in | Load message JSON files at email send time | Used in `createEmailTranslator` utility |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `use-intl/core` `createTranslator` | i18next standalone | i18next requires adding a new dependency and configuration system; `use-intl/core` is already installed and uses the same message files |
| `use-intl/core` `createTranslator` | Custom string interpolation | Hand-rolling pluralization and ICU syntax is error-prone; the existing library handles it correctly |
| Props passing `t()` into templates | Passing pre-translated strings as props | Pre-translated strings as props keeps React Email templates simpler (no import of i18n library into template files) and works cleanly with `@react-email/render` |

**Installation:**

No new packages required. `use-intl` is already installed as a dependency of `next-intl`.

## Architecture Patterns

### Recommended Project Structure
```
src/lib/email/
├── translator.ts          # NEW: createEmailTranslator(locale) utility
├── send.ts               # MODIFIED: pass locale to template helpers
├── styles.ts             # unchanged
└── templates/
    ├── components/
    │   └── email-layout.tsx    # MODIFIED: accept translated footer text
    ├── invite.tsx              # MODIFIED: accept translated string props
    ├── verification.tsx        # MODIFIED: accept translated string props
    ├── password-reset.tsx      # MODIFIED: accept translated string props
    ├── session-summary.tsx     # MODIFIED: accept translated string props
    ├── pre-meeting-reminder.tsx # MODIFIED: accept translated string props
    └── agenda-prep.tsx         # MODIFIED: accept translated string props

messages/
├── en/
│   └── emails.json       # NEW: email-specific translation namespace
└── ro/
    └── emails.json       # NEW: Romanian email translations
```

### Pattern 1: Standalone Email Translator

**What:** A utility function that loads message files from disk and returns a `createTranslator` instance. Works in any Node.js context — API routes, background jobs, scheduled functions.

**When to use:** Called once per email send, passing the resolved locale for that email.

**Example:**
```typescript
// src/lib/email/translator.ts
// Source: use-intl/core createTranslator API (verified in node_modules)
import { createTranslator } from "use-intl/core";
import { readFile } from "fs/promises";
import { join } from "path";

const SUPPORTED_LOCALES = ["en", "ro"] as const;
type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

function isValidLocale(locale: string): locale is SupportedLocale {
  return SUPPORTED_LOCALES.includes(locale as SupportedLocale);
}

async function loadEmailMessages(locale: SupportedLocale) {
  const filePath = join(process.cwd(), "messages", locale, "emails.json");
  const raw = await readFile(filePath, "utf-8");
  return JSON.parse(raw) as Record<string, unknown>;
}

export async function createEmailTranslator(locale: string) {
  const safeLocale = isValidLocale(locale) ? locale : "en";
  const messages = await loadEmailMessages(safeLocale);
  return createTranslator({ locale: safeLocale, messages });
}
```

### Pattern 2: Locale Resolution by Email Type

**What:** Each email-sending call site resolves the correct locale before calling the send function. Two paths:
- **Content language** (company emails): Read `tenants.content_language` from the DB — already the authoritative field for this.
- **User UI language** (transactional emails): Read `users.language` from the DB — already the authoritative field for this.

**When to use:** Applied at the send-function level, not inside templates.

**Example — content language (invite):**
```typescript
// src/app/api/invites/route.ts (modified)
// Fetch tenant contentLanguage (already available: tenant.contentLanguage from existing query)
const locale = tenant?.contentLanguage ?? "en";
const t = await createEmailTranslator(locale);

const html = await render(
  InviteEmail({
    inviteUrl,
    organizationName,
    inviterName,
    role,
    // Pass translated strings as props:
    subject: t("invite.subject", { organizationName }),
    heading: t("invite.heading"),
    body: t("invite.body", { inviterName, organizationName, role }),
    buttonLabel: t("invite.button"),
    footer: t("invite.footer"),
  })
);
```

**Example — user UI language (password reset):**
```typescript
// src/lib/email/send.ts (modified sendPasswordResetEmail)
// Fetch user language preference from DB before sending
const user = await adminDb.query.users.findFirst({
  where: eq(users.id, userId),
  columns: { language: true },
});
const locale = user?.language ?? "en";
const t = await createEmailTranslator(locale);

const html = await render(
  PasswordResetEmail({
    resetUrl,
    subject: t("passwordReset.subject"),
    heading: t("passwordReset.heading"),
    body: t("passwordReset.body"),
    buttonLabel: t("passwordReset.button"),
    footer: t("passwordReset.footer"),
  })
);
```

### Pattern 3: Translated Props on Email Templates

**What:** React Email templates receive translated strings as explicit props rather than calling i18n hooks internally. Templates stay pure and have no coupling to the i18n system.

**When to use:** All templates. Avoids the problem of i18n hooks not working in `@react-email/render` context.

**Example:**
```typescript
// src/lib/email/templates/invite.tsx (modified)
interface InviteEmailProps {
  inviteUrl: string;
  organizationName: string;
  inviterName: string;
  role: string;
  // NEW: translated string props
  heading: string;
  body: string;
  buttonLabel: string;
  footer: string;
}

export function InviteEmail({ inviteUrl, heading, body, buttonLabel, footer }: InviteEmailProps) {
  return (
    <EmailLayout footerText={footer}>
      <Text style={headingStyle}>{heading}</Text>
      <Text style={paragraph}>{body}</Text>
      <Button style={button} href={inviteUrl}>{buttonLabel}</Button>
    </EmailLayout>
  );
}
```

### Pattern 4: Email Subject Line Translation

**What:** Subject lines are passed to `sendMail({ subject })` at the call site, not inside the template. The `t()` call for the subject must also happen at the send function level.

**When to use:** Every email. Subject lines are transport-layer metadata, not template content.

**Example:**
```typescript
await getTransport().sendMail({
  from: getEmailFrom(),
  to: email,
  subject: t("invite.subject", { organizationName }),  // translated subject
  html,
});
```

### Anti-Patterns to Avoid

- **Calling `getTranslations()` from next-intl/server in email functions:** This will throw because it requires `next/headers` which is only available within a request. Use `createTranslator` from `use-intl/core` instead.
- **Using `useTranslations()` inside React Email templates:** React Email components render via `@react-email/render` outside a React tree with an IntlProvider. Hooks will fail. Pass translated strings as props.
- **Hardcoding subjects in sendMail calls:** Subject lines need translation too. Always derive from `t()`.
- **Reading `tenants.settings.preferredLanguage` for email locale:** The pipeline uses `settings.preferredLanguage` for AI content generation (a settings JSONB field), but `tenants.content_language` is the canonical, properly typed column for content language. Use `contentLanguage` for email locale resolution.
- **Loading all message namespaces for email:** Only load `emails.json` namespace, not all 15 namespace files. Keep email translator lean.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| ICU message interpolation | Custom `{variable}` replacement | `createTranslator` from `use-intl/core` | ICU handles plurals, gender, date formatting; regex replacement misses edge cases |
| Locale validation | Custom locale check logic | `SUPPORTED_LOCALES` constant + type guard (already pattern in `src/i18n/request.ts`) | Consistent with existing codebase pattern |
| Message loading | Custom JSON loader with caching | `readFile` + `JSON.parse` (simple is fine here; emails are low-frequency) | No need for caching layer at this volume |

**Key insight:** The `use-intl/core` package is a pure JavaScript library with zero framework dependencies. It does exactly what's needed for out-of-request translation with no additional setup.

## Common Pitfalls

### Pitfall 1: `getTranslations()` Throws Outside Request Context
**What goes wrong:** Calling `getTranslations()` from `next-intl/server` in an email send function throws `Error: This function is not available in a non-request context`.
**Why it happens:** `getTranslations()` internally calls `cookies()` from `next/headers`, which is only available during a request lifecycle.
**How to avoid:** Always use `createTranslator` from `use-intl/core` for email translation. Keep the `createEmailTranslator` utility in a separate file that never imports from `next-intl/server`.
**Warning signs:** Any import of `getTranslations` from `next-intl/server` in `src/lib/email/` or `src/lib/notifications/`.

### Pitfall 2: Hook Usage Inside `@react-email/render`
**What goes wrong:** Using `useTranslations()` inside a React Email template component causes "Invalid hook call" or renders undefined because there is no React tree, no IntlProvider, and no request context.
**Why it happens:** `@react-email/render` uses `ReactDOMServer.renderToStaticMarkup` in a minimal environment.
**How to avoid:** Never import `useTranslations` in template files. All strings must come in as props.
**Warning signs:** Any `import { useTranslations } from "next-intl"` in `src/lib/email/templates/`.

### Pitfall 3: Wrong Language Layer Applied
**What goes wrong:** An invite email renders in the admin sender's UI language instead of the company's content language.
**Why it happens:** Conflating `users.language` (UI preference) with `tenants.content_language` (company content setting).
**How to avoid:** Apply the correct layer per email type (see Language Decision Table below).
**Warning signs:** Invite emails rendering in English when company content language is Romanian.

### Pitfall 4: Missing Keys for `emails.json` Namespace
**What goes wrong:** `createTranslator` returns the key name itself (e.g., `"invite.heading"`) when a key is missing, because next-intl defaults to the key as fallback.
**Why it happens:** The `emails.json` namespace is new — keys can be forgotten or misspelled.
**How to avoid:** Define all email keys in `en/emails.json` first, then add `ro/emails.json` with the same structure. TypeScript will not automatically catch missing email keys (unlike UI components which have AppConfig type integration). Manual review required.
**Warning signs:** Raw key strings like `"invite.subject"` appearing in sent emails.

### Pitfall 5: `tenants.settings.preferredLanguage` vs `tenants.content_language`
**What goes wrong:** Using the JSONB `settings.preferredLanguage` field (used by AI pipeline for prompt language) for email locale resolution.
**Why it happens:** The AI pipeline (`pipeline.ts` line 59) reads from `settings.preferredLanguage` for its own purposes. This field may be `undefined` or inconsistently set.
**How to avoid:** Use `tenants.content_language` (the properly typed `varchar` column added in Phase 11) for all email locale decisions. It defaults to `"en"` and is guaranteed to be a string.
**Warning signs:** `(tenantData?.settings as Record<string, unknown>)?.preferredLanguage` pattern appearing in email code.

## Language Decision Table

| Email Type | Language Source | DB Field | Notes |
|------------|----------------|----------|-------|
| Invite | Company content language | `tenants.content_language` | Admin sends on behalf of company |
| Session summary | Company content language | `tenants.content_language` | Company-owned communication |
| Pre-meeting reminder | Company content language | `tenants.content_language` | Company communication |
| Agenda prep | Company content language | `tenants.content_language` | Company communication |
| Password reset | Recipient's UI language | `users.language` | Personal/account action |
| Email verification | Recipient's UI language | `users.language` | Personal/account action |

## Email Templates Inventory

All 6 templates require modification. Current state:

| Template | File | Call Sites | Language Source |
|----------|------|------------|----------------|
| `VerificationEmail` | `templates/verification.tsx` | `send.ts: sendVerificationEmail()` | `users.language` |
| `PasswordResetEmail` | `templates/password-reset.tsx` | `send.ts: sendPasswordResetEmail()` | `users.language` |
| `InviteEmail` | `templates/invite.tsx` | `api/invites/route.ts`, `api/invites/resend/route.ts` | `tenants.content_language` |
| `SessionSummaryEmail` | `templates/session-summary.tsx` | `notifications/summary-email.ts` | `tenants.content_language` |
| `PreMeetingReminderEmail` | `templates/pre-meeting-reminder.tsx` | `notifications/sender.ts` | `tenants.content_language` |
| `AgendaPrepEmail` | `templates/agenda-prep.tsx` | `notifications/sender.ts` | `tenants.content_language` |

## Code Examples

### `createEmailTranslator` Utility (new file)
```typescript
// src/lib/email/translator.ts
// Source: use-intl/core verified in node_modules/use-intl/dist/types/core/createTranslator.d.ts
import { createTranslator } from "use-intl/core";
import { readFile } from "fs/promises";
import { join } from "path";

const SUPPORTED_LOCALES = ["en", "ro"] as const;
type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

function isValidLocale(locale: string): locale is SupportedLocale {
  return SUPPORTED_LOCALES.includes(locale as SupportedLocale);
}

export async function createEmailTranslator(locale: string) {
  const safeLocale = isValidLocale(locale) ? locale : "en";
  const filePath = join(process.cwd(), "messages", safeLocale, "emails.json");
  const raw = await readFile(filePath, "utf-8");
  const messages = JSON.parse(raw) as Record<string, unknown>;
  return createTranslator({ locale: safeLocale, messages });
}
```

### Email Message File Structure (new namespace)
```json
// messages/en/emails.json
{
  "emails": {
    "invite": {
      "subject": "Join {organizationName} on 1on1",
      "heading": "You have been invited",
      "body": "{inviterName} has invited you to join {organizationName} as a {role}. Click the button below to set up your account.",
      "button": "Accept Invitation",
      "footer": "This invitation expires in 7 days. If you did not expect this, you can safely ignore this email."
    },
    "verification": {
      "subject": "Verify your email address",
      "heading": "Verify your email",
      "body": "Thanks for signing up. Please verify your email address by clicking the button below.",
      "button": "Verify Email Address",
      "footer": "If you did not create an account, you can safely ignore this email. This link expires in 24 hours."
    },
    "passwordReset": {
      "subject": "Reset your password",
      "heading": "Reset your password",
      "body": "We received a request to reset your password. Click the button below to choose a new one.",
      "button": "Reset Password",
      "footer": "This link expires in 1 hour. If you did not request a password reset, you can safely ignore this email."
    },
    "sessionSummary": {
      "subject": "1:1 Session #{sessionNumber} Summary",
      "heading": "Session #{sessionNumber} Summary",
      "greeting": "Hi {recipientName}, here is the summary of your 1:1 with {otherPartyName}.",
      "keyTakeaways": "Key Takeaways",
      "areasOfConcern": "Areas of Concern",
      "actionItems": "Action Items",
      "assignedTo": "Assigned to: {name}",
      "due": "Due: {date}",
      "managerInsights": "Manager Insights",
      "coachingSuggestions": "Coaching Suggestions",
      "riskIndicators": "Risk Indicators",
      "score": "Score: {score} / 5.0",
      "aiPending": "AI summary is being generated and will be available in the app shortly.",
      "button": "View Full Session"
    },
    "preMeeting": {
      "subject": "Upcoming 1:1 with {otherPartyName}",
      "heading": "Upcoming 1:1 Meeting",
      "greeting": "Hi {recipientName},",
      "body": "You have a 1:1 meeting with {otherPartyName} coming up on {meetingDate} at {meetingTime}.",
      "button": "Open Meeting Series"
    },
    "agendaPrep": {
      "subject": "Prepare for your 1:1 with {otherPartyName}",
      "heading": "Prepare for Your 1:1",
      "greeting": "Hi {recipientName},",
      "bodyReport": "Your 1:1 with {otherPartyName} is on {meetingDate}. Take a moment to add your talking points before the meeting.",
      "bodyManager": "Your 1:1 with {otherPartyName} is on {meetingDate}. Here are some things to consider before your session.",
      "aiNudges": "AI Coaching Nudges",
      "buttonManager": "Open Meeting Series",
      "buttonReport": "Add Talking Points"
    }
  }
}
```

### Modified Send Function Pattern
```typescript
// src/lib/email/send.ts (sendPasswordResetEmail, modified)
import { createEmailTranslator } from "./translator";

export async function sendPasswordResetEmail(
  email: string,
  userId: string,
  baseUrl?: string
) {
  // Fetch user's language preference
  const user = await adminDb.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { language: true },
  });
  const locale = user?.language ?? "en";
  const t = await createEmailTranslator(locale);

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await adminDb.insert(passwordResetTokens).values({ userId, token, expiresAt });

  const appUrl = baseUrl || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const resetUrl = `${appUrl}/reset-password?token=${token}`;

  const html = await render(
    PasswordResetEmail({
      resetUrl,
      heading: t("emails.passwordReset.heading"),
      body: t("emails.passwordReset.body"),
      buttonLabel: t("emails.passwordReset.button"),
      footer: t("emails.passwordReset.footer"),
    })
  );

  await getTransport().sendMail({
    from: getEmailFrom(),
    to: email,
    subject: t("emails.passwordReset.subject"),
    html,
  });
}
```

### Fetching Tenant Content Language in Existing Call Sites
```typescript
// Pattern for call sites that already query the tenant (e.g., invites/route.ts):
// `tenant` is already fetched for organizationName — add contentLanguage to columns:
const tenant = await adminDb.query.tenants.findFirst({
  where: (t, { eq: e }) => e(t.id, tenantId),
  columns: { name: true, contentLanguage: true },  // ADD contentLanguage
});
const locale = tenant?.contentLanguage ?? "en";
const t = await createEmailTranslator(locale);

// Pattern for call sites without a tenant query (e.g., summary-email.ts):
// Add a tenant fetch before sending:
const [tenantRow] = await adminDb
  .select({ contentLanguage: tenants.contentLanguage })
  .from(tenants)
  .where(eq(tenants.id, tenantId))
  .limit(1);
const locale = tenantRow?.contentLanguage ?? "en";
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hardcoded English in email templates | Translated string props driven by `createTranslator` | Phase 13 | All emails render in company/user language |
| `getTranslations()` (request-bound) | `createTranslator` from `use-intl/core` (standalone) | Phase 13 | Works in background jobs and API routes |
| `settings.preferredLanguage` (AI pipeline) | `tenants.content_language` (email locale) | Phase 13 | Correct field used for email language resolution |

## Open Questions

1. **Email template subject line with `sessionNumber` interpolation**
   - What we know: `t("emails.sessionSummary.subject", { sessionNumber })` — ICU numeric interpolation is straightforward.
   - What's unclear: Whether `#` in ICU messages needs escaping (answer: no, `#` is only special inside `{...}` plural blocks).
   - Recommendation: Use `"subject": "1:1 Session #{sessionNumber} Summary"` — test with Romanian to confirm no ICU parsing issue.

2. **`invites/resend/route.ts` language resolution**
   - What we know: The resend route re-invites an existing pending invite token.
   - What's unclear: Whether `invites/resend/route.ts` already fetches tenant data.
   - Recommendation: Apply the same tenant content language pattern as `invites/route.ts`.

## Sources

### Primary (HIGH confidence)
- `use-intl/core` createTranslator — verified in `node_modules/use-intl/dist/types/core/createTranslator.d.ts` — API signature, parameter types, no React/request dependency
- `src/lib/db/schema/users.ts` — confirmed `language varchar(10) default 'en'` column exists
- `src/lib/db/schema/tenants.ts` — confirmed `content_language varchar(10) default 'en'` column exists
- `src/i18n/request.ts` — confirmed message file loading pattern (dynamic import by locale)
- All 6 email template files — confirmed current hardcoded English content

### Secondary (MEDIUM confidence)
- next-intl 4.8.3 package.json exports map — confirmed no standalone translator export at top level; `use-intl/core` is the correct import path
- `src/lib/ai/pipeline.ts` lines 50-59 — confirmed AI pipeline uses `settings.preferredLanguage` (JSONB), distinct from `tenants.content_language` (typed column)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — `use-intl/core` verified in installed node_modules; API confirmed from type definitions
- Architecture: HIGH — based on direct inspection of all 6 email templates and all call sites
- Language decision table: HIGH — `users.language` and `tenants.content_language` columns confirmed in schema
- Pitfalls: HIGH — based on direct code inspection of existing patterns and next-intl source

**Research date:** 2026-03-06
**Valid until:** 2026-09-06 (next-intl major version change would invalidate `use-intl/core` API)

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| MAIL-01 | All email templates render in the correct language (company content language for invites/summaries, user preference where applicable) | Language Decision Table maps all 6 templates to correct DB fields; `createEmailTranslator` utility enables locale-specific rendering |
| MAIL-02 | Standalone email translator works outside Next.js request lifecycle for background jobs | `createTranslator` from `use-intl/core` confirmed as the correct API — no request context required, takes explicit `locale` + `messages` parameters |
</phase_requirements>
