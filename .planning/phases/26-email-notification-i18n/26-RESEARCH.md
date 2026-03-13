# Phase 26: Email Notification & i18n - Research

**Researched:** 2026-03-13
**Domain:** Nodemailer + React Email, next-intl/use-intl translation, deduplication via DB notifications table
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| NOTIF-01 | Report (employee) receives an email with a session link when any of their session answers is corrected | `sendPostSessionSummaryEmails` in `summary-email.ts` is the canonical pattern: fetch report user row, resolve locale, render template, call `getTransport().sendMail()`; session link is `${NEXT_PUBLIC_APP_URL}/sessions/${sessionId}/summary` |
| NOTIF-02 | All active tenant admins receive the same correction notification email | Query `users` WHERE `tenantId = X AND role = 'admin' AND isActive = true`; index `user_tenant_role_idx` makes this efficient; send one email per admin using the same fire-and-forget sender function |
| NOTIF-04 | Five corrections to the same session within a 5-minute window produce exactly one email per recipient | `notifications` table already has `status`, `sentAt`, `referenceId`, `type` columns; dedup strategy: before sending, query for a recent `session_correction` notification for the same `(tenantId, userId, referenceId=sessionId)` within 5 minutes; if found, skip sending (and optionally refresh `sentAt`); requires no schema migration |
</phase_requirements>

---

## Summary

Phase 26 adds a post-commit fire-and-forget function — `sendCorrectionEmails` — that is called by the existing `corrections/route.ts` after `withTenantContext` commits. This function: (1) resolves the report user and all active tenant admins, (2) determines the session URL, (3) renders a new `CorrectionNotificationEmail` React Email template, (4) checks the `notifications` table for a recent duplicate within a 5-minute window before sending, (5) delivers emails via the existing Nodemailer transport, and (6) inserts a `session_correction` notification record for each email sent. No new npm packages are needed. No new DB migrations are needed. The `session_correction` enum value already exists in `notificationTypeEnum`.

The i18n work is additive: a `sessionCorrection` key block is added to `messages/en/emails.json` and `messages/ro/emails.json`. The existing `translation-parity.test.ts` will catch any key mismatch between locales automatically. The `createEmailTranslator` function already handles locale fallback to `en` for unsupported values.

The deduplication pattern uses the `notifications` table as a lightweight idempotency log. Before each send, the function queries for a row with `type = 'session_correction'`, `referenceId = sessionId`, `userId = recipientId`, and `sentAt > NOW() - 5 minutes`. If found, the email is skipped. This satisfies NOTIF-04 without a separate cache, queue, or Redis dependency.

**Primary recommendation:** Extract all Phase 26 logic into `src/lib/notifications/correction-email.ts`. Call it from `corrections/route.ts` post-commit using the same `.catch()` fire-and-forget pattern established by `complete/route.ts` for `runAIPipelineDirect`.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| nodemailer | existing | SMTP transport | `getTransport()` / `getEmailFrom()` already wired in `src/lib/email/send.ts` |
| @react-email/render + components | existing | Render TSX templates to HTML strings | All existing email templates use this; no alternatives |
| use-intl/core (createTranslator) | existing | Load per-locale JSON messages for email | `createEmailTranslator` in `src/lib/email/translator.ts` — exact API already in use |
| drizzle-orm + adminDb | existing | Query users/tenants/notifications | `adminDb` (superuser connection) used by all existing notification senders |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| src/lib/email/send | existing | `getTransport()`, `getEmailFrom()` | Import directly; never create a new transport |
| src/lib/email/translator | existing | `createEmailTranslator(locale)` | One call per recipient locale; locale comes from tenant `contentLanguage` |
| src/lib/email/styles | existing | Shared inline CSS constants | All new templates import from here for visual consistency |
| src/lib/email/templates/components/email-layout | existing | `<EmailLayout footerText>` wrapper | Every template uses this; provides Html/Head/Body/Container/Section/brand |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| notifications table dedup | In-memory Set or Redis | DB dedup is durable across restarts and serverless cold starts; Redis requires new infrastructure |
| Per-recipient locale | Single tenant locale for all | Requirements say "renders correctly in both languages" — tenant `contentLanguage` is the single locale source, matching all existing senders (sender.ts, summary-email.ts) |
| Fire-and-forget after route returns | Queued background job | Fire-and-forget is already the established pattern; queued jobs require infrastructure; email delay is acceptable |

**Installation:** No new packages needed.

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/api/sessions/[id]/corrections/
│   └── route.ts                         # MODIFY: add fire-and-forget call after withTenantContext
├── lib/
│   ├── notifications/
│   │   └── correction-email.ts          # NEW: sendCorrectionEmails(params) — the Phase 26 module
│   └── email/
│       └── templates/
│           └── correction-notification.tsx  # NEW: CorrectionNotificationEmail React Email template
messages/
├── en/emails.json                        # MODIFY: add sessionCorrection keys
└── ro/emails.json                        # MODIFY: add sessionCorrection keys (same keys, Romanian text)
```

### Pattern 1: Fire-and-Forget Post-Commit Notification

**What:** After `withTenantContext` resolves successfully, call `sendCorrectionEmails(...)` without awaiting — same pattern as `runAIPipelineDirect` in `complete/route.ts`.

**When to use:** Any post-commit side effect that must not block the HTTP response.

**Example:**
```typescript
// src/app/api/sessions/[id]/corrections/route.ts (lines after withTenantContext resolves)
// Source: src/app/api/sessions/[id]/complete/route.ts lines 219-227

// Fire-and-forget: send correction notification emails
sendCorrectionEmails({
  sessionId: result.sessionId,
  tenantId: session.user.tenantId,
  correctedById: session.user.id,
}).catch((err) =>
  console.error("[corrections] Failed to send correction notification emails:", err)
);

return NextResponse.json({ sessionId: result.sessionId, newScore: result.newScore });
```

### Pattern 2: Resolve Report + Active Tenant Admins

**What:** Fetch the session to get `seriesId`, then the series to get `reportId`, then the report user. Separately query all active admins in the tenant. The report email address comes from the `users` table. This is pure `adminDb` reads — no `withTenantContext` needed in the notification sender.

**When to use:** Any notification that must fan out to admins.

**Example:**
```typescript
// Source: src/lib/notifications/summary-email.ts lines 52-91 (pattern)
// Source: src/lib/notifications/sender.ts lines 62-88 (pattern)

// Fetch session → series → report
const [sessionRow] = await adminDb
  .select({ seriesId: sessions.seriesId })
  .from(sessions)
  .where(eq(sessions.id, sessionId))
  .limit(1);

const [series] = await adminDb
  .select({ reportId: meetingSeries.reportId })
  .from(meetingSeries)
  .where(eq(meetingSeries.id, sessionRow.seriesId))
  .limit(1);

const [reportUser] = await adminDb
  .select({ id: users.id, email: users.email, firstName: users.firstName })
  .from(users)
  .where(eq(users.id, series.reportId))
  .limit(1);

// Query active admins
const adminUsers = await adminDb
  .select({ id: users.id, email: users.email, firstName: users.firstName })
  .from(users)
  .where(
    and(
      eq(users.tenantId, tenantId),
      eq(users.role, "admin"),
      eq(users.isActive, true)
    )
  );
```

### Pattern 3: Deduplication via Notifications Table

**What:** Before sending to a recipient, check for a recent `session_correction` notification sent to the same user for the same session within 5 minutes. If found, skip. If not found, send and insert a new record.

**When to use:** Any event-driven notification where rapid repeated triggers should collapse to one email.

**Example:**
```typescript
// Source: notifications schema — src/lib/db/schema/notifications.ts
// notificationTypeEnum already includes "session_correction"

import { gt, and, eq } from "drizzle-orm";
import { notifications } from "@/lib/db/schema/notifications";

const DEDUP_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

async function wasRecentlySent(
  tenantId: string,
  userId: string,
  sessionId: string
): Promise<boolean> {
  const cutoff = new Date(Date.now() - DEDUP_WINDOW_MS);
  const [existing] = await adminDb
    .select({ id: notifications.id })
    .from(notifications)
    .where(
      and(
        eq(notifications.tenantId, tenantId),
        eq(notifications.userId, userId),
        eq(notifications.type, "session_correction"),
        eq(notifications.referenceId, sessionId),
        gt(notifications.sentAt, cutoff)
      )
    )
    .limit(1);
  return !!existing;
}

// Usage per recipient:
const skip = await wasRecentlySent(tenantId, recipient.id, sessionId);
if (skip) return; // NOTIF-04: dedup window active

// ... send email ...

await adminDb.insert(notifications).values({
  tenantId,
  userId: recipient.id,
  type: "session_correction",
  channel: "email",
  referenceType: "session",
  referenceId: sessionId,
  scheduledFor: new Date(),
  status: "sent",
  sentAt: new Date(),
  subject,
});
```

### Pattern 4: React Email Template (Link-Only, No Inline Answers)

**What:** A minimal template following the established style from `PreMeetingReminderEmail`: heading, greeting, body text, one CTA button. No answer content — only a session link. Labels are pre-interpolated strings passed as props (matching the pattern in all existing templates).

**Example:**
```typescript
// src/lib/email/templates/correction-notification.tsx
// Source: src/lib/email/templates/pre-meeting-reminder.tsx (pattern)
import { Text, Button } from "@react-email/components";
import { EmailLayout } from "./components/email-layout";
import {
  heading as headingStyle,
  paragraph as paragraphStyle,
  button as buttonStyle,
} from "../styles";

interface CorrectionNotificationEmailProps {
  sessionUrl: string;
  // All strings are pre-interpolated by the caller via createEmailTranslator
  heading: string;
  greeting: string;
  body: string;
  buttonLabel: string;
  footer: string;
}

export function CorrectionNotificationEmail({
  sessionUrl,
  heading,
  greeting,
  body,
  buttonLabel,
  footer,
}: CorrectionNotificationEmailProps) {
  return (
    <EmailLayout footerText={footer}>
      <Text style={headingStyle}>{heading}</Text>
      <Text style={paragraphStyle}>{greeting}</Text>
      <Text style={paragraphStyle}>{body}</Text>
      <Button style={buttonStyle} href={sessionUrl}>
        {buttonLabel}
      </Button>
    </EmailLayout>
  );
}
```

### Pattern 5: i18n Message Keys for Correction Email

**What:** Add a `sessionCorrection` block to `messages/en/emails.json` and `messages/ro/emails.json`. The existing `translation-parity.test.ts` enforces that both locales have identical key sets.

**Example (en):**
```json
"sessionCorrection": {
  "subject": "A session answer has been corrected",
  "heading": "Session Answer Corrected",
  "greeting": "Hi {recipientName},",
  "body": "An answer in your 1:1 session #{sessionNumber} with {otherPartyName} has been corrected. No answer content is included in this email for privacy — click below to view the session.",
  "buttonLabel": "View Session",
  "footer": "This email was sent by 1on1"
}
```

**Example (ro):**
```json
"sessionCorrection": {
  "subject": "Un răspuns din sesiune a fost corectat",
  "heading": "Răspuns din sesiune corectat",
  "greeting": "Salut {recipientName},",
  "body": "Un răspuns din ședința ta 1:1 #{sessionNumber} cu {otherPartyName} a fost corectat. Conținutul răspunsului nu este inclus în acest email din motive de confidențialitate — apasă mai jos pentru a vizualiza sesiunea.",
  "buttonLabel": "Vezi sesiunea",
  "footer": "Acest email a fost trimis de 1on1"
}
```

### Pattern 6: Locale Resolution

**What:** All existing notification senders resolve the tenant `contentLanguage` to determine the email locale. This is consistent across `sender.ts`, `summary-email.ts`, and `send.ts`.

**Example:**
```typescript
// Source: src/lib/notifications/summary-email.ts lines 65-71
const [tenantRow] = await adminDb
  .select({ contentLanguage: tenants.contentLanguage })
  .from(tenants)
  .where(eq(tenants.id, tenantId))
  .limit(1);
const locale = tenantRow?.contentLanguage ?? "en";
const t = await createEmailTranslator(locale);
```

### Anti-Patterns to Avoid

- **Awaiting `sendCorrectionEmails` inside the route handler:** Email sending MUST be fire-and-forget. If SMTP is slow or down, the correction has already committed and must succeed.
- **Calling `withTenantContext` inside `sendCorrectionEmails`:** The notification sender uses `adminDb` (superuser), not a tenant-scoped connection. All existing senders (summary-email.ts, sender.ts) use `adminDb` directly.
- **Sending email to the corrector (the manager who made the correction):** The corrector is not a recipient. Only the report and active admins receive the email. If the corrector is an admin, they still receive an admin copy — do not deduplicate the admin copy away because the same user already "knows" about the correction.
- **Deduplication by checking `status = 'sent'` only:** Must also filter by `sentAt > NOW() - 5 minutes`. A sent notification from yesterday must NOT suppress today's correction email.
- **Putting answer content in the email body:** REQUIREMENTS.md "Out of Scope" explicitly states: "Email includes inline before/after answer content — Sensitive answer text should not appear in email provider logs — link-only notification is the privacy-safe default."
- **Sending to admins who are inactive:** Filter `isActive = true` when querying admins. NOTIF-02 specifies "all active tenant admins."
- **Re-fetching tenant language per recipient instead of once:** Fetch the tenant locale once and reuse it for all recipients in the same call. This is what `summary-email.ts` does.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Email transport | Custom SMTP setup | `getTransport()` + `getEmailFrom()` from `src/lib/email/send.ts` | Already configured with env vars; lazy-initialized singleton |
| HTML email rendering | String templates | `render(CorrectionNotificationEmail({...}))` from `@react-email/render` | Same pattern used by all 6 existing templates; handles inlining, DOCTYPE, etc. |
| i18n string interpolation | String replace | `createEmailTranslator(locale)` + `t("emails.sessionCorrection.body", { recipientName, ... })` | Handles missing keys gracefully; already handles locale fallback |
| Dedup tracking | In-memory Map, Redis, or separate table | `notifications` table with `type = 'session_correction'` | Table already exists with right shape; used by all existing notification types |
| Tenant locale lookup | User `language` field | `tenants.contentLanguage` | All notification senders use this field; per-user language is for UI, tenant content language is for emails |

**Key insight:** Every building block is already in place. Phase 26 is purely additive: one new sender function, one new template component, and six new i18n keys per locale.

---

## Common Pitfalls

### Pitfall 1: Admin Who Is Also the Report Receives Duplicate Email
**What goes wrong:** When the report's role is `admin`, the report appears in both the "report query" and the "active admins query". They receive two identical emails.
**Why it happens:** The two recipient lists (report + admins) are built separately and not deduplicated.
**How to avoid:** After building the admin list, filter out anyone whose `id === series.reportId`. Build a recipient set with unique IDs before sending.
**Warning signs:** Integration test with an admin-role report produces two emails to the same address.

### Pitfall 2: Dedup Window Blocks Legitimate Next-Day Corrections
**What goes wrong:** A correction on Monday sends an email. A second correction on Tuesday is suppressed because the dedup query forgot to bound by `sentAt > cutoff`.
**Why it happens:** Query uses `eq(notifications.type, ...)` and `eq(notifications.referenceId, ...)` but omits the `gt(notifications.sentAt, cutoff)` predicate.
**How to avoid:** The `gt(notifications.sentAt, cutoff)` clause is mandatory. The 5-minute window is tight by design.
**Warning signs:** NOTIF-04 test passes but NOTIF-01 test for second-day correction fails.

### Pitfall 3: `notifications.referenceId` Is a UUID Column — SessionId Must Be a Valid UUID
**What goes wrong:** Inserting a non-UUID sessionId into `referenceId uuid` column fails with a PostgreSQL error.
**Why it happens:** The `referenceId` column is typed `uuid` in Drizzle schema. If sessionId is any string, Drizzle will pass it through and PostgreSQL will reject non-UUID strings.
**How to avoid:** SessionIds in this project are always UUID v4 (generated by `uuid().defaultRandom()`). No conversion needed, but verify the type — do not pass a fabricated string in tests.
**Warning signs:** `invalid input syntax for type uuid` in logs.

### Pitfall 4: `sentAt` Is Nullable — Must Not Use `gt(notifications.sentAt, cutoff)` If sentAt Can Be Null
**What goes wrong:** Records with `status = 'pending'` have `sentAt = null`. The `gt(null, cutoff)` comparison in PostgreSQL returns NULL (falsy), so pending rows are correctly excluded. But if a developer changes the dedup query to `status = 'pending'`, they catch pending rows that have not been sent yet.
**Why it happens:** Confusing pending/sent status semantics.
**How to avoid:** Dedup query must filter `status = 'sent'` AND `gt(notifications.sentAt, cutoff)`. Both conditions together are safe.

### Pitfall 5: Translation Key Mismatch Breaks Parity Test
**What goes wrong:** EN keys added to `emails.json` but RO keys not added (or vice versa). `translation-parity.test.ts` will fail on the next `bun run test`.
**Why it happens:** Forgetting to update both locales simultaneously.
**How to avoid:** Always edit both `messages/en/emails.json` and `messages/ro/emails.json` in the same task. Run `bun run test` after both edits — the parity test is automated.
**Warning signs:** `translation-parity.test.ts` fails with "Keys in en/emails.json not in ro/emails.json: emails.sessionCorrection.body".

### Pitfall 6: Correction Email Sent Before Transaction Commits
**What goes wrong:** If `sendCorrectionEmails` is called inside `withTenantContext` (before `return { sessionId, newScore }`), the email fires while the transaction is still open. If the transaction rolls back afterward, the email is a false notification.
**Why it happens:** Placing the notification call inside the async callback instead of outside it.
**How to avoid:** `sendCorrectionEmails(...)` must be called AFTER `withTenantContext` resolves — in the route body, not inside the `async (tx) => { }` callback. This is the same placement as `runAIPipelineDirect` in `complete/route.ts` (lines 219-227).

---

## Code Examples

### Full Sender Module Shape

```typescript
// src/lib/notifications/correction-email.ts
// Source: pattern from src/lib/notifications/summary-email.ts

import { render } from "@react-email/render";
import { adminDb } from "@/lib/db";
import { getTransport, getEmailFrom } from "@/lib/email/send";
import { CorrectionNotificationEmail } from "@/lib/email/templates/correction-notification";
import { notifications } from "@/lib/db/schema/notifications";
import { sessions, meetingSeries, users, tenants } from "@/lib/db/schema";
import { eq, and, gt } from "drizzle-orm";
import { createEmailTranslator } from "@/lib/email/translator";

const DEDUP_WINDOW_MS = 5 * 60 * 1000;

export async function sendCorrectionEmails(params: {
  sessionId: string;
  tenantId: string;
  correctedById: string;
}): Promise<void> {
  const { sessionId, tenantId } = params;

  // 1. Resolve session → series → report
  // 2. Resolve tenant locale
  // 3. Resolve active admins
  // 4. Build deduplicated recipient list
  // 5. For each recipient: check dedup → render → send → insert notification record
}
```

### Session URL Construction
```typescript
// Source: src/lib/notifications/summary-email.ts line 131
const sessionUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/sessions/${sessionId}/summary`;
```

### Active Admins Query
```typescript
// Source: src/lib/db/schema/users.ts — role + isActive columns confirmed
const adminUsers = await adminDb
  .select({
    id: users.id,
    email: users.email,
    firstName: users.firstName,
  })
  .from(users)
  .where(
    and(
      eq(users.tenantId, tenantId),
      eq(users.role, "admin"),
      eq(users.isActive, true)
    )
  );
```

### Calling the Sender from `corrections/route.ts`
```typescript
// After withTenantContext resolves, before return NextResponse.json(...)
// Source: complete/route.ts lines 219-227 (fire-and-forget pattern)
sendCorrectionEmails({
  sessionId: result.sessionId,
  tenantId: session.user.tenantId,
  correctedById: session.user.id,
}).catch((err) =>
  console.error("[corrections] Failed to send correction notification emails:", err)
);
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| N/A | `session_correction` enum value in `notificationTypeEnum` | Phase 24 (schema) | No migration needed for Phase 26 — enum already contains the value |
| Separate dedup infrastructure | `notifications` table as idempotency log | Existing design | Phase 26 follows the existing pattern; no new tables or services |
| One email per correction event | 5-minute session-level window (NOTIF-04) | Phase 26 (new) | Multiple rapid corrections collapse to one email per recipient |

**Deprecated/outdated:**
- None — all infrastructure is current and in use.

---

## Open Questions

1. **Should the corrector (manager) receive an email confirmation?**
   - What we know: NOTIF-01 and NOTIF-02 name the report and admins as recipients. The corrector is not mentioned.
   - What's unclear: Whether an admin who also performed the correction should still receive the admin copy.
   - Recommendation: An admin who corrected should still receive the admin email — they receive it in their admin capacity, not as the corrector. Do not suppress it.

2. **What session URL to use in the email?**
   - What we know: `summary-email.ts` uses `/sessions/${sessionId}/summary`. Phase 27 (UI) will build the correction history panel on the session detail page.
   - What's unclear: Whether to link to `/sessions/${sessionId}/summary` (existing) or `/sessions/${sessionId}` (generic).
   - Recommendation: Use `/sessions/${sessionId}/summary` — this URL already works, returns session data, and is the canonical "view completed session" URL used by the existing summary email.

3. **Does the dedup check need to handle concurrent corrections racing each other?**
   - What we know: Two corrections sent milliseconds apart could both pass the dedup check and both send emails before either inserts the notification record. This is a TOCTOU race.
   - What's unclear: Whether to add a DB-level unique constraint or accept the rare duplicate.
   - Recommendation: Accept the rare duplicate. The 5-minute window is advisory; the requirement says "five corrections in a 5-minute window produce one email" — the normal case. Sub-second concurrent corrections are an extreme edge case not worth a unique constraint.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (globals: true, environment: node) |
| Config file | `vitest.config.ts` at project root |
| Quick run command | `bun run test` |
| Full suite command | `bun run test && bun run typecheck && bun run lint` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| NOTIF-01 | `sendCorrectionEmails` calls `sendMail` for the report recipient | unit (mocked transport) | `bun run test src/lib/notifications/__tests__/correction-email.test.ts` | ❌ Wave 0 |
| NOTIF-02 | `sendCorrectionEmails` calls `sendMail` once per active admin | unit (mocked transport) | `bun run test src/lib/notifications/__tests__/correction-email.test.ts` | ❌ Wave 0 |
| NOTIF-02 | Inactive admins are excluded from recipients | unit | `bun run test src/lib/notifications/__tests__/correction-email.test.ts` | ❌ Wave 0 |
| NOTIF-04 | `wasRecentlySent` returns true when recent notification exists | unit | `bun run test src/lib/notifications/__tests__/correction-email.test.ts` | ❌ Wave 0 |
| NOTIF-04 | `wasRecentlySent` returns false when no recent notification exists | unit | `bun run test src/lib/notifications/__tests__/correction-email.test.ts` | ❌ Wave 0 |
| NOTIF-04 | `wasRecentlySent` returns false when notification is older than 5 minutes | unit | `bun run test src/lib/notifications/__tests__/correction-email.test.ts` | ❌ Wave 0 |
| NOTIF-03 (i18n) | `emails.sessionCorrection` keys match between en and ro | unit | `bun run test src/lib/i18n/__tests__/translation-parity.test.ts` | ✅ exists (auto-detects new keys) |
| NOTIF-03 (i18n) | `createEmailTranslator("en")` resolves `emails.sessionCorrection.subject` without throwing | unit | `bun run test src/lib/notifications/__tests__/correction-email.test.ts` | ❌ Wave 0 |
| NOTIF-03 (i18n) | `createEmailTranslator("ro")` resolves `emails.sessionCorrection.subject` without throwing | unit | `bun run test src/lib/notifications/__tests__/correction-email.test.ts` | ❌ Wave 0 |

**Note on mocking strategy:** `adminDb` and `getTransport()` should be mocked via `vi.mock()` in the test file. The sender function uses `adminDb` (imported directly), making it straightforward to mock. The transport mock captures `sendMail` calls for assertion.

**Note on NOTIF-03 (i18n parity):** The existing `translation-parity.test.ts` automatically picks up any new JSON keys in `messages/en/emails.json` and `messages/ro/emails.json`. No changes to that test file are needed — it passes only when both locales are updated.

### Sampling Rate
- **Per task commit:** `bun run test`
- **Per wave merge:** `bun run test && bun run typecheck`
- **Phase gate:** `bun run test && bun run typecheck && bun run lint && bun run build` green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/notifications/__tests__/correction-email.test.ts` — unit tests for `sendCorrectionEmails` and `wasRecentlySent`; requires `vi.mock("@/lib/db")` and `vi.mock("@/lib/email/send")`
- [ ] `src/lib/email/templates/correction-notification.tsx` — the React Email template (not a test, but required before tests can render)
- [ ] `messages/en/emails.json` — add `sessionCorrection` block
- [ ] `messages/ro/emails.json` — add `sessionCorrection` block (translation-parity test will fail until both are done)

---

## Sources

### Primary (HIGH confidence)
- Direct source inspection: `src/lib/notifications/summary-email.ts` — canonical pattern for event-driven notification sender (resolve session → series → users → locale → render → send → insert notification record)
- Direct source inspection: `src/lib/notifications/sender.ts` — canonical pattern for scheduler-driven notification sender; confirms `processPreMeeting` and `processAgendaPrep` flow
- Direct source inspection: `src/lib/email/translator.ts` — `createEmailTranslator(locale)` API and fallback behavior
- Direct source inspection: `src/lib/email/send.ts` — `getTransport()`, `getEmailFrom()`, SMTP env var names
- Direct source inspection: `src/lib/email/styles.ts` — all style constants for consistent templates
- Direct source inspection: `src/lib/email/templates/pre-meeting-reminder.tsx` — minimal template pattern (heading, greeting, body, button)
- Direct source inspection: `src/lib/email/templates/components/email-layout.tsx` — `<EmailLayout>` wrapper API
- Direct source inspection: `src/lib/db/schema/notifications.ts` — `notifications` table columns (`type`, `channel`, `referenceId`, `userId`, `tenantId`, `sentAt`, `status`)
- Direct source inspection: `src/lib/db/schema/enums.ts` — confirmed `"session_correction"` already in `notificationTypeEnum`; no migration needed
- Direct source inspection: `src/lib/db/schema/users.ts` — confirmed `role`, `isActive`, `tenantId`, `email`, `firstName` columns; index `user_tenant_role_idx` exists
- Direct source inspection: `src/app/api/sessions/[id]/complete/route.ts` lines 219-239 — fire-and-forget `.catch()` pattern for post-commit async work
- Direct source inspection: `src/app/api/sessions/[id]/corrections/route.ts` — Phase 25 implementation; confirmed `withTenantContext` returns `{ sessionId, newScore }` after commit; fire-and-forget hook point is immediately after the `if ("error" in result)` block
- Direct source inspection: `messages/en/emails.json` + `messages/ro/emails.json` — existing key structure; `sessionCorrection` key does not yet exist in either locale
- Direct source inspection: `src/lib/i18n/__tests__/translation-parity.test.ts` — automatic parity enforcement; runs per namespace file; no modification needed

### Secondary (MEDIUM confidence)
- STATE.md decisions: "Email uses link-only format (no inline answer content) — privacy-safe per research finding" — confirmed locked decision
- STATE.md decisions: "5-minute session-level email deduplication — one email per session window, not per answer" — confirmed locked decision
- REQUIREMENTS.md Out of Scope: "Email includes inline before/after answer content — Sensitive answer text should not appear in email provider logs"

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified by direct source inspection; no new dependencies
- Architecture: HIGH — every pattern is directly derived from `summary-email.ts` and `complete/route.ts` which already implement the same sender + fire-and-forget structure
- Pitfalls: HIGH — derived from concrete code audit (dedup window predicate, admin/report overlap, transaction timing, UUID column type, translation parity enforcement)

**Research date:** 2026-03-13
**Valid until:** 2026-04-13 (stable domain; all dependencies are pinned; no fast-moving APIs)
