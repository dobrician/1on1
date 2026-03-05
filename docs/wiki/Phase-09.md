# Phase 9: Email Notifications

**Status**: Complete
**Depends on**: Phase 5
**Completed**: 2026-03-05

## Goal

The application keeps users engaged between sessions with timely, well-designed email notifications.

## Success Criteria

1. Invited users receive a well-formatted invite email with a link to join the organization
2. Pre-meeting reminder email is sent configurable hours before a session (default 24h)
3. Post-session summary email is sent to both manager and report with answers, notes, action items, and AI summary
4. Agenda prep reminder email ("Add your talking points") is sent 48h before meeting

## What Was Built

- **Plan 09-01**: Email infrastructure — React Email templates (invite, reminder, agenda prep, post-session summary), Nodemailer transport, Inngest-driven send functions, notification preferences with per-type opt-out
- **Plan 09-02**: Email triggers and scheduling — cron-based reminder/agenda prep scanning, post-session summary trigger on session completion, organization language support for AI-generated email content

## Key Decisions

- React Email for template rendering (JSX-based, preview-friendly)
- Inngest cron functions scan for upcoming sessions and send reminders at configurable intervals
- Post-session summary email includes AI-generated content (summary, sentiment, coaching suggestions for managers)
- Organization language setting controls AI output language in emails
- Notification preferences stored per-user with granular per-type toggles

## Key Files

- `src/lib/email/templates/` — React Email templates (invite, reminder, agenda-prep, post-session)
- `src/lib/email/send.ts` — Nodemailer transport wrapper
- `src/lib/inngest/functions/send-reminders.ts` — Cron-based reminder scanning
- `src/lib/inngest/functions/send-post-session-summary.ts` — Post-session email trigger
- `src/app/(dashboard)/settings/notifications/page.tsx` — Notification preferences UI

## Requirements

NOTF-01, NOTF-02, NOTF-03, NOTF-04

> **Note**: This phase executed in parallel with Phases 6 and 7 (all depend only on Phase 5). Email infrastructure (nodemailer) was already set up in Phase 2.
