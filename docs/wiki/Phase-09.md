# Phase 9: Email Notifications

**Status**: Not Started
**Depends on**: Phase 5

## Goal

The application keeps users engaged between sessions with timely, well-designed email notifications.

## Success Criteria

1. Invited users receive a well-formatted invite email with a link to join the organization
2. Pre-meeting reminder email is sent configurable hours before a session (default 24h)
3. Post-session summary email is sent to both manager and report with answers, notes, action items, and AI summary
4. Agenda prep reminder email ("Add your talking points") is sent 48h before meeting

## Planned Scope

- **Plan 09-01**: Email infrastructure (nodemailer + React Email templates)
- **Plan 09-02**: Invite and reminder emails (Inngest scheduled jobs)
- **Plan 09-03**: Post-session summary and agenda prep emails

## Requirements

NOTF-01, NOTF-02, NOTF-03, NOTF-04

> **Note**: This phase can execute in parallel with Phases 6 and 7 (all depend only on Phase 5). Email infrastructure (nodemailer) was already set up in Phase 2.
