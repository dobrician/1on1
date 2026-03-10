# 1on1

## What This Is

An AI-powered one-on-one meeting management platform where the AI context layer makes every meeting smarter than the last. Managers run structured 1:1s through a step-by-step wizard, the AI surfaces context from previous sessions, generates summaries, suggests follow-ups, and recommends action items. Built as a multi-tenant SaaS with Apple-level UI polish.

## Core Value

The AI context layer that makes every meeting smarter than the last — knowing what happened before, what matters now, and what should happen next.

## Requirements

### Validated

- ✓ Structured session wizard with step-by-step question flow and context panel — v1.0
- ✓ Custom questionnaire templates per company (6 question types, versioning, conditional logic) — v1.0
- ✓ Session history with full continuity between meetings — v1.0
- ✓ AI-generated session summaries, suggested questions, and action items — v1.0
- ✓ AI proactive nudges before meetings ("Last time Alex mentioned burnout — follow up?") — v1.0
- ✓ Score trends, category breakdown, team analytics, velocity charts, CSV export — v1.0
- ✓ Action items that carry over between sessions with progress tracking — v1.0
- ✓ Multi-tenant with company-level customization (templates, settings, cadence) — v1.0
- ✓ Manager dashboard with upcoming sessions, overdue items, quick stats — v1.0
- ✓ Team management with reporting lines — v1.0
- ✓ Email notifications (invites, reminders, summaries) — v1.0
- ✓ RBAC: admin, manager, member with resource-level authorization — v1.0
- ✓ Auth: email/password, Google OAuth, Microsoft OAuth — v1.0
- ✓ Company onboarding with registration wizard — v1.0
- ✓ Dockerized local test environment (blue-green style, port 4300) — v1.0
- ✓ Vercel-deployable production build — v1.0
- ✓ Dark mode with org color themes — v1.0
- ✓ Full-text search and command palette (Cmd+K) — v1.0
- ✓ i18n framework with UI language per-user and content language per-company — v1.1
- ✓ Full UI translation: English + Romanian (~650-800 keys, locale-aware formatting) — v1.1
- ✓ AI-generated content (summaries, nudges, action items) in company language — v1.1
- ✓ Email notifications in company language — v1.1
- ✓ Browser locale detection for pre-login screens — v1.1
- ✓ JSON schema spec for templates (downloadable, AI-friendly, methodology principles + weight system docs) — v1.2
- ✓ Template export as portable JSON (schemaVersion, tenant-neutral, language field, role-gated) — v1.2
- ✓ Template import from JSON (preview, language mismatch warning, conflict resolution, field-specific validation errors) — v1.2
- ✓ In-app AI template generator (describe → AI generates in company language → preview → save) — v1.2
- ✓ DIY prompt kit (copyable schema + principles + example for Claude, ChatGPT, etc.) — v1.2

### Active

- [ ] Session correction: manager can edit answers in a completed session (v1.4)
- [ ] Correction reason: explicit text explanation required, AI-validated in company language (v1.4)
- [ ] Correction notification: email sent to report and admins with before/after context (v1.4)
- [ ] Correction audit trail: stored with timestamp, actor, reason, and original values (v1.4)

### Future

- **v1.5 planned:** Playwright E2E testing suite with CI integration (GitHub Actions), SMTP mocking, role-switching helpers, full edge case + regression coverage, designed for maintainability and future-proof expansion
- AI personal profiles built from accumulated session data (pgvector embeddings)
- AI live suggestions during active sessions (streaming, low latency)
- AI-generated growth narratives ("Over Q1, Alex improved communication by 23%...")
- AI anomaly detection with proactive alerts
- Google Calendar integration for scheduling meetings
- Outlook/O365 calendar sync
- Magic link passwordless login
- Overdue action item email notifications
- Slack/Teams integration (reminders, nudges, quick updates)
- PDF export with organization branding for performance reviews
- SSO (SAML 2.0, OIDC) for enterprise organizations
- System template library (pre-built questionnaires)

### Out of Scope

- Mobile native app — web responsive is sufficient; native if mobile demand is proven
- Real-time video/audio — run wizard alongside video call, don't compete with Zoom/Teams
- AI meeting transcription — structured questionnaire approach IS the alternative
- Full HRIS integration — CSV import for bulk users suffices
- Anonymous peer feedback / 360 — poisons the 1:1 trust relationship
- OKR / goal tracking — separate product category, reference goals in notes
- Gamification (badges, leaderboards) — trivializes professional conversations
- Slack bot replacing session wizard — chat answers produce lower-quality responses
- Manager scoring / ranking — creates perverse incentives
- Multi-language template translations — questionnaires defined in one language per company, no per-template multi-language support yet

## Current Milestone: v1.4 Session Corrections & Accountability

**Goal:** Allow managers to correct answers in past sessions with a mandatory explanation that is AI-validated in the company language, producing a full audit trail and email notification to all involved parties.

**Target features:**
- Session correction: manager can edit answers in a completed session
- Mandatory correction reason: explicit text explanation required before saving
- AI validation: reason checked for quality, relevance, and company language compliance
- Email notification: all involved parties (report, admins) notified of the correction with before/after context
- Audit trail: correction stored with timestamp, actor, reason, and original values

## Context

**Shipped v1.2 AI-Ready Templates** on 2026-03-07 (323 TypeScript/TSX source files). v1.0 shipped 2026-03-05 (41,464 LOC / 290 files), v1.1 shipped 2026-03-07 (i18n + Romanian), v1.2 shipped 2026-03-07 (template portability + AI co-authoring).

**Tech stack:** Next.js 15 (App Router) + TypeScript + Drizzle ORM + PostgreSQL 16 + shadcn/ui + Tailwind CSS 4 + Vercel AI SDK + Auth.js v5 + Inngest + TanStack Query + Recharts + React Email + Tiptap.

**Architecture:** Monolith-first — single Next.js app with Server Components for reads, API routes for writes, direct async functions for AI pipeline (Inngest removed mid-milestone in favor of simpler direct execution).

**Key technical patterns:** PostgreSQL RLS for tenant isolation, AES-256-GCM for private note encryption, delete-then-insert for analytics snapshots, useReducer for wizard state, Collapsible context panels, optimistic UI updates, cursor-based pagination, full-text search with websearch_to_tsquery.

**What worked well:** Phase-based planning with parallel execution paths (6/7/9 after 5), UAT-driven gap closure phases, yolo mode for autonomous execution.

**Known tech debt:**
- AI context retrieval uses full-text search (pgvector deferred)
- Inngest partially removed but some infrastructure remains
- Client-side filtering for people directory (acceptable for v1 volumes)
- Shared notes searched via JSONB text extraction without GIN index

## Constraints

- **Package manager**: Bun (not npm)
- **Tech stack**: Next.js 15 + TypeScript + Drizzle ORM + PostgreSQL 16
- **UI framework**: shadcn/ui + Tailwind CSS 4
- **Deployment**: Vercel (production), Docker Compose (local, port 4300)
- **Test URL**: `https://1on1.surmont.co/` → reverse proxy to `localhost:4300`
- **Multi-tenancy**: Every table with tenant data includes `tenant_id`, enforced by PostgreSQL RLS
- **Private notes**: Encrypted at rest with AES-256-GCM, per-tenant keys via HKDF
- **Language**: English for all code, comments, docs, and commits (AGPL v3)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| AI is core, not v3 add-on | AI context layer is the primary differentiator | ✓ Good — AI pipeline ships in v1 |
| Bun over npm | Faster installs, better DX, native TypeScript support | ✓ Good |
| Port 4300 for test env | Avoids conflicts with other local projects | ✓ Good |
| Blue-green local deploy | Stable test environment always available | ✓ Good |
| Google Calendar first | Most common calendar; Outlook deferred to v2 | — Pending (deferred entirely from v1) |
| Monolith-first | Single Next.js app — no microservices | ✓ Good |
| Design-first per-phase | Mockups within phase plans, not separate phase | ✓ Good — faster iteration |
| Direct AI pipeline over Inngest | Simpler, fewer moving parts, retry via UI | ✓ Good — reduced complexity |
| Full-text search over pgvector | Sufficient for v1 context retrieval, pgvector deferred | ✓ Good — avoided premature optimization |
| useReducer for wizard state | Single source of truth for cross-category logic | ✓ Good |
| Delete-then-insert for snapshots | NULL-safe unique index handling | ✓ Good |
| Nodemailer over Resend | Works with any SMTP provider | ✓ Good — provider flexibility |

---
*Last updated: 2026-03-10 after v1.4 milestone start (Session Corrections & Accountability)*
