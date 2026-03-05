# Phase 9: Email Notifications - Context

**Gathered:** 2026-03-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Send 3 new email types to keep users engaged between sessions: pre-meeting reminder, post-session summary, and agenda prep reminder. Invite email (NOTF-01) is already implemented — refresh its design for consistency. Does NOT include: in-app notifications, Slack/Teams integration, overdue action item emails (v2), or real-time push notifications.

</domain>

<decisions>
## Implementation Decisions

### Post-session summary email (NOTF-03)
- **Content level**: Highlights + link — AI summary paragraph, new action items list, session score, prominent "View Full Session" button linking to the app
- **Differentiated recipients**: Manager receives an extra section with the AI addendum (sentiment analysis, coaching suggestions). Report receives the shared version only (AI summary, action items, score)
- **Send timing**: Wait for AI pipeline to finish (summary + action item suggestions, typically 5-15s) before sending. Guarantees AI content is included
- **Action items**: Read-only list in the email — title, assignee, due date. All changes happen in the app

### Pre-meeting reminder (NOTF-02)
- **Timing**: Configurable per-series (e.g., 1h, 4h, 24h, 48h). Stored on the meeting_series record. Default: 24h before session

### Agenda prep reminder (NOTF-04)
- **Content**: Nudge text ("You have a 1:1 with [Name] in 2 days") plus 1-2 AI pre-session nudges inline from Phase 7 ("Last time Alex mentioned burnout — follow up?"). Brings AI value into the email
- **Timing**: 48h before meeting (per spec)

### Notification preferences
- **No settings UI for v1** — each email includes an unsubscribe link at the bottom that disables that specific notification type per user
- **Reversible**: User can re-enable notification types from their profile settings page (simple toggles showing current opt-in/out state)
- **CAN-SPAM compliant**: Unsubscribe link in every email, one-click disable

### Design consistency
- Refresh the existing invite email template to match the new templates' design patterns — consistency pass across all 4+ email types

### Claude's Discretion
- Scheduling mechanism (cron API route vs event-driven vs hybrid) — pick based on Vercel deployment + notification table's scheduledFor field
- Reminder recipients per type (both parties vs manager-only for agenda prep with AI nudges)
- Email delivery provider (Nodemailer/SMTP vs Resend — both available, Resend ^6.9.3 already installed)
- Failure handling and retry strategy (in-process vs cron-based retries)
- Email tracking approach (status-only vs open/click tracking) — pick based on chosen provider
- React Email template layout and component structure
- Notification preference DB schema (user_notification_preferences table or column on users table)
- Unsubscribe token mechanism and URL design

</decisions>

<specifics>
## Specific Ideas

- AI nudges in the agenda prep email bring the "AI-first" positioning into the email channel — users get AI value even before opening the app
- Manager addendum in summary email mirrors the in-app pattern from Phase 7 — private coaching insights that only the manager sees
- The email should drive users back to the app, not replace it — highlights + link pattern keeps emails concise and engagement-driving
- Per-series reminder timing lets managers customize for different report cadences (daily standups need shorter notice vs monthly reviews)

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/email/send.ts`: Lazy-initialized Nodemailer transport with singleton pattern — extend with new send functions
- `src/lib/email/templates/`: 3 React Email templates (verification, password-reset, invite) — established design system with Apple-style aesthetics (dark text on light, system fonts, rounded buttons, 480px container)
- `src/lib/db/schema/notifications.ts`: Full notification table with types (pre_meeting, agenda_prep, session_summary, etc.), channels (email, in_app), statuses (pending, sent, failed, cancelled), and scheduledFor field
- `src/lib/db/schema/enums.ts`: notificationTypeEnum, notificationChannelEnum, notificationStatusEnum already defined
- `resend` ^6.9.3 in package.json — installed but unused, available if preferred over Nodemailer

### Established Patterns
- Email sending is non-blocking — failures logged but don't fail the parent request (invite email pattern)
- Token-based links for email actions (32-byte hex tokens via crypto.randomBytes)
- Audit logging for significant email events (`logAuditEvent()`)
- `withTenantContext()` wrapper for all DB access in service layer

### Integration Points
- Session completion API (`src/app/api/sessions/[id]/complete/route.ts`): Hook point for triggering post-session summary email after AI pipeline finishes
- AI pipeline output: AI summary + manager addendum + action item suggestions — all needed as email content
- Meeting series record: Stores cadence + next session date — source for scheduling reminders
- Notification table: Write scheduled notifications when series next date is computed
- User profile page: Add notification preference toggles for unsubscribe re-enable

</code_context>

<deferred>
## Deferred Ideas

- Overdue action item email notifications — tracked as MISC-02 in v2 requirements
- In-app notification center (bell icon, notification drawer) — separate feature
- Email digest mode (daily/weekly summary instead of per-event emails) — v2 if users want it

</deferred>

---

*Phase: 09-email-notifications*
*Context gathered: 2026-03-05*
