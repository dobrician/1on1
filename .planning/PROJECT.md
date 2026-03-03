# 1on1

## What This Is

An AI-powered one-on-one meeting management platform where the AI is the product — not a bolt-on feature. It builds personal profiles over time, surfaces context before meetings, suggests questions during sessions, and generates actionable insights afterward. Built as a multi-tenant SaaS that any company can sign up for, with Apple-level UI polish that makes 1:1 meetings a pleasure to plan, execute, and review.

## Core Value

The AI context layer that makes every meeting smarter than the last — knowing what happened before, what matters now, and what should happen next.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Structured session wizard with step-by-step question flow and context panel
- [ ] Custom questionnaire templates per company (6+ question types)
- [ ] Session history with full continuity between meetings
- [ ] AI-generated session summaries, suggested questions, and action items
- [ ] AI personal profiles built from accumulated session data
- [ ] AI proactive nudges before meetings ("Last time Alex mentioned burnout — follow up?")
- [ ] AI live suggestions during sessions based on answers and history
- [ ] Score trends, action item velocity, and AI-generated growth narratives
- [ ] Action items that carry over between sessions with progress tracking
- [ ] Multi-tenant with company-level customization (templates, settings, cadence)
- [ ] Manager dashboard with upcoming sessions, overdue items, quick stats
- [ ] Team management with reporting lines
- [ ] Email notifications (invites, reminders, summaries)
- [ ] Basic analytics (score trends, category breakdown, session comparison)
- [ ] RBAC: admin, manager, member with resource-level authorization
- [ ] Auth: email/password, magic link, Google OAuth, Microsoft OAuth
- [ ] Company onboarding with registration wizard
- [ ] Google Calendar integration for scheduling meetings
- [ ] Dockerized local test environment (blue-green style, port 4300)
- [ ] Vercel-deployable production build

### Out of Scope

- Mobile app — web-first, mobile later (v3)
- Slack/Teams integration — defer to v2
- PDF export & branded reports — defer to v2
- SSO (SAML/OIDC) — defer to v2
- eNPS tracking — defer to v3
- 360 feedback — defer to v3
- Goal/OKR tracking — defer to v3
- Public API & webhooks — defer to v3
- Multi-language (i18n) — defer to v3
- Outlook/O365 calendar sync — defer to v2 (Google Calendar first)

## Context

**Origin**: The founder has been running structured 1:1s using Google Forms with a multi-step wizard format. This validated that structured meetings with step-by-step questions work well. The pain points: no context from previous sessions, results trapped in spreadsheets (text + 5-star ratings), no actionability, no intelligence layer.

**Market position**: Existing 1:1 tools either lack AI or bolt it on as an afterthought. This product treats AI as the core experience — the wizard IS an AI-assisted conversation. The structured data collection feeds the AI, and the AI makes the structure worth collecting.

**Design philosophy**: Apple-level UI/UX. Minimalistic, reactive, intuitive. The surface of the app must be extremely polished. A dedicated design phase will establish the visual language before implementation begins — design key screens (wizard, dashboard, history, templates, action items), derive the design system from those, then build.

**Existing documentation**: Comprehensive design docs in `docs/` covering architecture, data model, features, UX flows, questionnaires, analytics, and security. 15 sprint plans in `docs/wiki/`. Codebase map in `.planning/codebase/`.

**AI vision**: Full-lifecycle AI assistant:
- **Pre-session**: Proactive nudges based on previous sessions, suggested agenda items
- **During session**: Live question suggestions, contextual insights from past data
- **Post-session**: Auto-generated summaries, recommended action items, growth narratives
- **Over time**: Personal profiles built from accumulated 1:1 data, team-level patterns

## Constraints

- **Package manager**: Bun (not npm) — user preference for speed and DX
- **Tech stack**: Next.js 15 + TypeScript + Drizzle ORM + PostgreSQL 16 — already decided and documented
- **UI framework**: shadcn/ui + Tailwind CSS 4 — already decided
- **Deployment**: Vercel (production) — serverless-first architecture
- **Local test env**: Docker Compose on port 4300, accessible on local network, blue-green style (stable test instance always running while developing next version)
- **Test URL**: `https://1on1.surmont.co/` → reverse proxy to `localhost:4300`
- **Design first**: Key screen mockups must be designed and agreed upon before implementation of UI components
- **Multi-tenancy**: Every table with tenant data includes `tenant_id`, enforced by PostgreSQL RLS
- **Private notes**: Encrypted at rest with AES-256-GCM, per-tenant keys via HKDF
- **Language**: English for all code, comments, docs, and commits (open source project, AGPL v3)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| AI is core, not v3 add-on | AI context layer is the primary differentiator; building it later means retrofitting | — Pending |
| Design first, build second | Apple-level polish requires intentional design; can't be achieved by coding first | — Pending |
| Bun over npm | Faster installs, better DX, native TypeScript support | — Pending |
| Port 4300 for test env | Avoids conflicts with other local projects (3000, 4100 taken) | — Pending |
| Blue-green local deploy | Stable test environment always available while developing next version | — Pending |
| Google Calendar first | Most common calendar; Outlook deferred to v2 | — Pending |
| Monolith-first | Single Next.js app — no microservices until proven necessary | — Pending |
| Full MVP scope | All 11 documented features + AI — validated by Google Forms experience | — Pending |

---
*Last updated: 2026-03-03 after initialization*
