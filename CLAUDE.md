# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project: 1on1

Structured one-on-one meeting management SaaS for companies. License: AGPL v3.

**Status**: Planning/documentation phase. No application code implemented yet. Full design docs are in `docs/`.

## Tech Stack

- **Framework**: Next.js 15 (App Router) + TypeScript (strict mode)
- **UI**: shadcn/ui + Tailwind CSS 4
- **ORM**: Drizzle ORM + PostgreSQL 16
- **Auth**: Auth.js v5 (NextAuth)
- **Validation**: Zod (shared client/server schemas)
- **Forms**: React Hook Form
- **Charts**: Recharts
- **Email**: Resend + React Email
- **Jobs**: Inngest (event-driven background functions)
- **State**: TanStack Query (React Query)
- **Deployment**: Vercel + Neon/Supabase (managed PostgreSQL)

## Common Commands

Once the project is scaffolded (Next.js + Drizzle):

```bash
# Development
npm run dev                          # Start Next.js dev server
npm run build                        # Production build
npm run lint                         # ESLint
npm run typecheck                    # tsc --noEmit

# Database (Drizzle)
docker compose up -d                 # Start local PostgreSQL
npx drizzle-kit generate             # Generate migration from schema changes
npx drizzle-kit migrate              # Apply migrations
npx drizzle-kit studio               # Open Drizzle Studio (DB browser)
npx tsx src/lib/db/seed.ts           # Seed development data

# Wiki sync
./scripts/push-wiki.sh               # Push docs/wiki/ changes to GitHub Wiki
./scripts/sync-wiki.sh               # Full wiki sync (alternative, clones + pushes)
```

## Architecture

Monolith-first: single Next.js app with API routes, Server Components, and Inngest background jobs. No microservices.

### Multi-tenancy

Every DB table with tenant data includes `tenant_id`. PostgreSQL Row-Level Security (RLS) provides a second safety layer. The app sets `app.current_tenant_id` via `SET LOCAL` on every DB connection. Tenant ID is always derived from the authenticated session, never from request parameters.

### Data flow pattern

- **Reads**: Server Components fetch data directly via Drizzle (no API calls for initial page loads)
- **Writes**: All mutations go through API routes (`src/app/api/`) for validation, authorization, and audit logging
- **Interactive UI**: Client Components use TanStack Query to fetch/mutate through API routes
- **Async work**: Inngest functions handle reminders, analytics computation, action item carry-over

### Key data model relationships

`TENANT → USER → MEETING_SERIES → SESSION → SESSION_ANSWER`

- A `MEETING_SERIES` links a manager-report pair with a cadence and default template
- A `SESSION` is a single meeting instance, using a `QUESTIONNAIRE_TEMPLATE`
- `SESSION_ANSWER` uses typed columns (`answer_text`, `answer_numeric`, `answer_json`) based on the question's `answer_type` — enables direct SQL aggregation
- `ANALYTICS_SNAPSHOT` stores pre-computed metrics per user/team/period for fast dashboard rendering
- `PRIVATE_NOTE` content is encrypted at the application level (AES-256-GCM, per-tenant keys)

Full schema: `docs/data-model.md`. Planned Drizzle schema files: `src/lib/db/schema/`. Complete planned project structure (all directories and files): `docs/architecture.md`.

## Conventions

- **Language**: English for everything — code, comments, documentation, GitHub issues, discussions, and commit messages. This is an open source project.
- **Components**: Server Components by default. Use `"use client"` only when interactivity is needed.
- **Validation**: All inputs validated with Zod schemas shared between client and server (`src/lib/validations/`).
- **Tenant isolation**: Every query must filter by `tenant_id`. RLS policies enforce this at the DB level as a safety net.
- **Private notes**: Encrypted at rest with AES-256-GCM. Per-tenant keys derived from master key via HKDF.
- **Existing patterns**: Follow patterns already in the codebase before introducing new ones.

## Authorization (RBAC)

Three roles: `admin`, `manager`, `member`. Key boundaries:
- **Members** can only view/participate in their own sessions and action items
- **Managers** can conduct sessions and view data for their direct reports only
- **Admins** have company-wide access (settings, analytics, user management, invites)

Resource-level checks go beyond role: verify the user is actually the manager or report on a given series/session.

## Documentation

Full project documentation is in `docs/`:
- `architecture.md` — Tech stack, project structure, deployment, environment variables
- `data-model.md` — Complete database schema with all tables, indexes, and RLS policies
- `features.md` — Feature roadmap (MVP / v2 / v3)
- `ux-flows.md` — UX patterns, wireframes, screen flows
- `questionnaires.md` — Question types, answer formats, template system
- `analytics.md` — Metrics, KPIs, charting strategy
- `security.md` — Auth, authorization, multi-tenancy, GDPR, audit logging

Sprint plans: `docs/wiki/Sprint-01.md` through `Sprint-15.md`. Sprint dependency graph and parallelizable sprints: `docs/wiki/Sprint-Log.md` (sprints 05+06, 11+12, 13+14 can run in parallel).

## Changelog

`CHANGELOG.md` follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format. Update it with every commit — a PostToolUse hook on Bash will remind you if a `git commit` doesn't include `CHANGELOG.md`. Group entries under `## [Unreleased]` with subsections: `Added`, `Changed`, `Fixed`, `Removed`.

## Sprint Progress Tracking

Implementation progress is tracked live on the [GitHub Wiki](https://github.com/dobrician/1on1/wiki/Sprint-Log).

**When completing sprint work, you MUST update the wiki:**

1. Check off completed deliverables (`- [x]`) and acceptance criteria in the sprint's `docs/wiki/Sprint-XX.md`
2. Update the sprint's `**Status**` field (`Not Started` / `In Progress` / `Done`)
3. Update the Status column in `docs/wiki/Sprint-Log.md`
4. The wiki auto-syncs via a PostToolUse hook on Edit/Write — changes to `docs/wiki/*.md` are pushed to the GitHub wiki automatically

If the hook doesn't fire (e.g., first run), manually sync with: `./scripts/push-wiki.sh`
