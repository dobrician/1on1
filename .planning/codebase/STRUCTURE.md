# Codebase Structure

**Analysis Date:** 2026-03-03

## Directory Layout

```
1on1/
├── src/                                # Application source code (planned)
│   ├── app/                            # Next.js App Router
│   │   ├── (auth)/                     # Public authentication routes
│   │   │   ├── login/
│   │   │   ├── register/               # Company registration
│   │   │   ├── invite/[token]/         # Accept invite via token
│   │   │   └── forgot-password/
│   │   │
│   │   ├── (dashboard)/                # Protected routes (behind auth)
│   │   │   ├── layout.tsx              # Main app shell (sidebar, header)
│   │   │   ├── overview/               # Manager dashboard / home
│   │   │   ├── people/                 # People directory
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/               # Individual user profile + history
│   │   │   ├── teams/                  # Team management
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/
│   │   │   ├── templates/              # Questionnaire template builder
│   │   │   │   ├── page.tsx            # List templates
│   │   │   │   ├── new/                # Create template
│   │   │   │   └── [id]/               # Edit template
│   │   │   ├── series/                 # Meeting series (1:1 relationships)
│   │   │   │   ├── page.tsx            # List all series
│   │   │   │   └── [id]/               # Series detail + session history
│   │   │   ├── sessions/               # Session management
│   │   │   │   ├── page.tsx            # List upcoming/past sessions
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx        # Session wizard (main interview experience)
│   │   │   │       └── summary/        # Post-session recap
│   │   │   ├── analytics/              # Analytics dashboard
│   │   │   │   ├── page.tsx            # Overview dashboard
│   │   │   │   ├── individual/[id]/    # Per-person trends
│   │   │   │   └── team/[id]/          # Team-level analytics
│   │   │   └── settings/               # Company and account settings
│   │   │       ├── company/
│   │   │       ├── account/
│   │   │       └── notifications/
│   │   │
│   │   └── api/                        # API route handlers (mutation boundary)
│   │       ├── auth/                   # Auth.js routes
│   │       ├── auth/[...nextauth].ts   # NextAuth catch-all
│   │       ├── users/
│   │       │   ├── [POST] route.ts     # Create user / invite
│   │       │   ├── [id]/[PATCH]        # Update user
│   │       │   └── [id]/[DELETE]       # Deactivate user
│   │       ├── teams/
│   │       │   ├── [POST]              # Create team
│   │       │   ├── [id]/[PATCH]        # Update team
│   │       │   └── [id]/members        # Add/remove members
│   │       ├── templates/
│   │       │   ├── [POST]              # Create template
│   │       │   └── [id]/[PATCH]        # Update template (increments version)
│   │       ├── series/
│   │       │   ├── [POST]              # Create meeting series
│   │       │   └── [id]/[PATCH]        # Update series
│   │       ├── sessions/
│   │       │   ├── [POST]              # Create session
│   │       │   ├── [id]/[PATCH]        # Update session (save answers)
│   │       │   ├── [id]/complete       # Mark session complete
│   │       │   └── [id]/answers        # Batch save answers
│   │       ├── analytics/
│   │       │   ├── [GET] snapshots     # Fetch pre-computed metrics
│   │       │   └── [GET] export        # Export data as CSV
│   │       ├── inngest/                # Inngest webhook
│   │       │   └── [...route].ts       # Serve Inngest functions
│   │       └── webhooks/               # External webhook handlers
│   │           └── (future calendar, Slack, etc.)
│   │
│   ├── components/                     # Reusable React components
│   │   ├── ui/                         # shadcn/ui components (copy-paste)
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── form.tsx                # shadcn Form wrapper
│   │   │   ├── input.tsx
│   │   │   ├── textarea.tsx
│   │   │   ├── select.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── toast.tsx
│   │   │   └── ... (20+ base components)
│   │   │
│   │   ├── layout/                     # App shell components
│   │   │   ├── sidebar.tsx             # Main navigation sidebar
│   │   │   ├── header.tsx              # Top header bar
│   │   │   ├── breadcrumbs.tsx         # Breadcrumb navigation
│   │   │   └── user-menu.tsx           # User avatar + menu
│   │   │
│   │   ├── session/                    # Session wizard components
│   │   │   ├── session-wizard.tsx      # Main wizard controller
│   │   │   ├── question-card.tsx       # Renders question by answer_type
│   │   │   ├── context-panel.tsx       # Side panel: history + action items
│   │   │   ├── notes-editor.tsx        # Rich text editor (shared + private)
│   │   │   ├── action-item-form.tsx    # Create/edit action items inline
│   │   │   ├── talking-points.tsx      # Manage talking points (check off as discussed)
│   │   │   ├── progress-bar.tsx        # Wizard progress indicator
│   │   │   └── session-summary.tsx     # Post-session recap screen
│   │   │
│   │   ├── templates/                  # Template builder components
│   │   │   ├── template-editor.tsx     # Drag-and-drop question builder
│   │   │   ├── question-form.tsx       # Configure question (type, labels, etc.)
│   │   │   ├── answer-type-picker.tsx  # Select answer type
│   │   │   └── template-preview.tsx    # Preview template as it will appear
│   │   │
│   │   ├── analytics/                  # Chart and metric components
│   │   │   ├── score-trend-chart.tsx   # Line chart: scores over time
│   │   │   ├── category-radar.tsx      # Radar chart: category breakdown
│   │   │   ├── team-heatmap.tsx        # Heatmap: team × categories
│   │   │   ├── completion-rate.tsx     # Bar chart: meeting adherence
│   │   │   ├── metric-card.tsx         # Single KPI display card
│   │   │   └── period-selector.tsx     # Date range picker
│   │   │
│   │   └── people/                     # People management components
│   │       ├── people-table.tsx        # Sortable people list
│   │       ├── invite-dialog.tsx       # Bulk invite modal
│   │       └── profile-card.tsx        # Individual user profile view
│   │
│   ├── lib/                            # Utilities and helpers
│   │   ├── db/                         # Database access layer
│   │   │   ├── schema/                 # Drizzle table definitions
│   │   │   │   ├── tenants.ts          # TENANT table
│   │   │   │   ├── users.ts            # USER table
│   │   │   │   ├── teams.ts            # TEAM + TEAM_MEMBER tables
│   │   │   │   ├── templates.ts        # QUESTIONNAIRE_TEMPLATE + TEMPLATE_QUESTION
│   │   │   │   ├── series.ts           # MEETING_SERIES table
│   │   │   │   ├── sessions.ts         # SESSION table
│   │   │   │   ├── answers.ts          # SESSION_ANSWER table
│   │   │   │   ├── notes.ts            # PRIVATE_NOTE + TALKING_POINT tables
│   │   │   │   ├── action-items.ts     # ACTION_ITEM table
│   │   │   │   ├── reminders.ts        # NOTIFICATION table
│   │   │   │   ├── audit.ts            # AUDIT_LOG table (immutable)
│   │   │   │   └── analytics.ts        # ANALYTICS_SNAPSHOT table
│   │   │   ├── index.ts                # Drizzle client export + helpers
│   │   │   ├── migrations/             # Generated migration files (git-tracked)
│   │   │   └── seed.ts                 # Development seed data
│   │   │
│   │   ├── auth/
│   │   │   ├── config.ts               # Auth.js v5 configuration
│   │   │   ├── callbacks.ts            # Auth callbacks (session, jwt, etc.)
│   │   │   └── middleware.ts           # Route protection middleware
│   │   │
│   │   ├── email/
│   │   │   ├── templates/              # React Email templates
│   │   │   │   ├── invite.tsx
│   │   │   │   ├── reminder.tsx
│   │   │   │   ├── session-summary.tsx
│   │   │   │   └── action-item-notice.tsx
│   │   │   └── send.ts                 # Email sending utility (uses Resend)
│   │   │
│   │   ├── jobs/                       # Inngest background functions
│   │   │   ├── send-reminders.ts       # 24h and 1h before sessions
│   │   │   ├── compute-analytics.ts    # Nightly: compute ANALYTICS_SNAPSHOT rows
│   │   │   ├── carry-over-actions.ts   # Before next session: flag incomplete items
│   │   │   ├── send-session-summary.ts # Post-session: email both parties
│   │   │   └── send-notifications.ts   # Scheduled notifications
│   │   │
│   │   ├── validations/                # Zod schemas (shared client/server)
│   │   │   ├── user.ts                 # User create/update schemas
│   │   │   ├── team.ts                 # Team schemas
│   │   │   ├── template.ts             # Template + question schemas
│   │   │   ├── series.ts               # Meeting series schemas
│   │   │   ├── session.ts              # Session creation/update schemas
│   │   │   ├── answer.ts               # Session answer schemas
│   │   │   ├── action-item.ts          # Action item schemas
│   │   │   └── auth.ts                 # Login, register, password reset
│   │   │
│   │   ├── utils/
│   │   │   ├── formatting.ts           # Date, number, string formatting
│   │   │   ├── scoring.ts              # Score calculation helpers
│   │   │   ├── encryption.ts           # AES-256-GCM encrypt/decrypt for private notes
│   │   │   ├── constants.ts            # App-wide constants, roles, enums
│   │   │   ├── logger.ts               # Structured logging utility
│   │   │   └── errors.ts               # Custom error classes
│   │   │
│   │   └── hooks/                      # Custom React hooks
│   │       ├── use-session.ts          # Access current session/user
│   │       ├── use-toast.ts            # Toast notifications
│   │       └── use-debounce.ts         # Debounce values
│   │
│   ├── types/
│   │   └── index.ts                    # Shared TypeScript types + generated types from Drizzle
│   │
│   └── middleware.ts                   # Next.js middleware (auth redirect, tenant context)
│
├── drizzle/                            # Drizzle CLI config + migration artifacts
│   ├── drizzle.config.ts
│   └── migrations/                     # SQL migration files (alternative location)
│
├── .github/
│   ├── workflows/
│   │   ├── deploy.yml                  # Deploy to Vercel on main
│   │   ├── test.yml                    # Run tests on PR
│   │   └── wiki-sync.yml               # Sync docs/wiki/ to GitHub Wiki
│   └── dependabot.yml
│
├── docs/                               # Design documentation
│   ├── architecture.md                 # Tech stack, project structure, deployment
│   ├── data-model.md                   # Complete database schema
│   ├── features.md                     # Feature roadmap (MVP/v2/v3)
│   ├── ux-flows.md                     # UX patterns, wireframes, flows
│   ├── questionnaires.md               # Question types, answer formats, template system
│   ├── analytics.md                    # Metrics, KPIs, charting strategy
│   ├── security.md                     # Auth, RBAC, multi-tenancy, encryption, GDPR
│   └── wiki/                           # Sprint plans (mirrors to GitHub Wiki)
│       ├── Home.md
│       ├── Architecture.md
│       ├── Features-Roadmap.md
│       ├── Sprint-Log.md               # Master sprint tracking
│       ├── Sprint-01.md through Sprint-15.md
│       └── ...
│
├── .planning/
│   └── codebase/                       # GSD analysis documents
│       ├── ARCHITECTURE.md             # This file
│       ├── STRUCTURE.md                # This file
│       ├── CONVENTIONS.md              # (for quality focus)
│       ├── TESTING.md                  # (for quality focus)
│       ├── STACK.md                    # (for tech focus)
│       ├── INTEGRATIONS.md             # (for tech focus)
│       └── CONCERNS.md                 # (for concerns focus)
│
├── scripts/
│   ├── push-wiki.sh                    # Push docs/wiki/ changes to GitHub Wiki
│   └── sync-wiki.sh                    # Full wiki sync
│
├── public/
│   └── images/                         # Static assets
│
├── .env.example                        # Template for environment variables
├── .env.local                          # Local env (git-ignored)
├── .gitignore
├── CLAUDE.md                           # Project instructions for Claude
├── CHANGELOG.md                        # Keep a Changelog format
├── README.md
├── LICENSE                             # AGPL v3
├── package.json
├── package-lock.json
├── tsconfig.json                       # TypeScript strict mode
├── tailwind.config.ts                  # Tailwind CSS 4 configuration
├── next.config.ts                      # Next.js configuration
├── drizzle.config.ts                   # Drizzle ORM configuration
└── jest.config.js                      # Jest testing config (when tests added)
```

## Directory Purposes

**src/app/(auth):**
- Purpose: Public routes for unauthenticated users
- Contains: Login, register, password reset, invite acceptance pages
- Key files: `login/page.tsx`, `register/page.tsx`, `forgot-password/page.tsx`

**src/app/(dashboard):**
- Purpose: Protected routes behind authentication
- Contains: All main application pages (overview, sessions, analytics, settings)
- Key files: `layout.tsx` (main shell with sidebar), `overview/page.tsx` (manager dashboard)

**src/app/api/:**
- Purpose: RESTful API routes for all mutations and webhooks
- Contains: Handlers for create/update/delete operations
- Key files: `sessions/[id]/[PATCH]` (update session answers), `sessions/[id]/complete` (mark complete)

**src/components/ui/:**
- Purpose: Base UI components from shadcn/ui (copy-paste, no node_modules dependencies)
- Contains: Button, Input, Select, Dialog, Form, Card, etc.
- Generated from: shadcn/ui CLI (not npm installed)

**src/components/session/:**
- Purpose: Session wizard and interview experience components
- Contains: Question renderer, context panel, notes editor, progress indicator
- Key files: `session-wizard.tsx` (main controller), `question-card.tsx` (renders any question type)

**src/components/templates/:**
- Purpose: Template builder components for admin/managers to create questionnaires
- Contains: Drag-and-drop builder, question configuration, preview
- Key files: `template-editor.tsx` (main builder)

**src/components/analytics/:**
- Purpose: Chart and metric components for dashboards
- Contains: Recharts-based visualizations, metric cards, period selectors
- Key files: `score-trend-chart.tsx` (line chart of session scores over time)

**src/lib/db/:**
- Purpose: Database access layer
- Contains: Drizzle schema definitions, migrations, seed data
- Key files: `index.ts` (exports Drizzle client), `schema/*.ts` (table definitions)

**src/lib/auth/:**
- Purpose: Authentication and authorization
- Contains: Auth.js v5 configuration, callbacks, session handling
- Key files: `config.ts` (Auth.js setup), `middleware.ts` (route protection)

**src/lib/email/:**
- Purpose: Email template management and sending
- Contains: React Email templates, Resend client wrapper
- Key files: `send.ts` (email utility function)

**src/lib/jobs/:**
- Purpose: Inngest background job definitions
- Contains: Functions for reminders, analytics, notifications
- Triggered by: Inngest scheduler, API routes via `inngest.send()`

**src/lib/validations/:**
- Purpose: Shared Zod schemas for client and server validation
- Contains: Schemas for all major entities (users, sessions, templates, etc.)
- Used by: React Hook Form (client), API routes (server)

**src/lib/utils/:**
- Purpose: Helper utilities and constants
- Contains: Formatting functions, scoring logic, error classes
- Key files: `scoring.ts` (compute session score), `encryption.ts` (private notes)

**docs/:**
- Purpose: Design documentation and sprint plans
- Contains: Architecture decisions, data model, feature roadmap, security policies
- Key files: `data-model.md` (full schema), `architecture.md` (technical decisions)

## Key File Locations

**Entry Points:**

- `src/middleware.ts` — Next.js middleware (auth checks, tenant context setup)
- `src/app/(dashboard)/layout.tsx` — Main app shell (sidebar, header)
- `src/app/(auth)/login/page.tsx` — Login page
- `src/app/(dashboard)/overview/page.tsx` — Manager dashboard

**Configuration:**

- `next.config.ts` — Next.js build and runtime config
- `tsconfig.json` — TypeScript configuration (strict mode enabled)
- `tailwind.config.ts` — Tailwind CSS design tokens
- `drizzle.config.ts` — Drizzle ORM and database config
- `.env.example` — Template for environment variables

**Core Logic:**

- `src/lib/db/index.ts` — Drizzle client initialization with multi-tenant helper
- `src/lib/auth/config.ts` — Auth.js v5 configuration (providers, callbacks)
- `src/lib/email/send.ts` — Resend integration for sending emails
- `src/lib/validations/*.ts` — Zod schemas (replicate on client and server)

**Session Wizard (Core Experience):**

- `src/components/session/session-wizard.tsx` — Main wizard controller
- `src/components/session/question-card.tsx` — Question renderer by type
- `src/components/session/context-panel.tsx` — History, action items, trends sidebar
- `src/app/(dashboard)/sessions/[id]/page.tsx` — Session page container

**Analytics:**

- `src/lib/jobs/compute-analytics.ts` — Inngest function (compute nightly snapshots)
- `src/components/analytics/*.tsx` — Chart components (Recharts)
- `src/app/(dashboard)/analytics/page.tsx` — Analytics dashboard

## Naming Conventions

**Files:**

- `.tsx` — React components (Server or Client)
- `.ts` — TypeScript utilities, helpers, functions
- `[id]` — Dynamic route segments
- `route.ts` — API route handler (Next.js convention)
- `layout.tsx` — Layout component for route group/segment
- `page.tsx` — Page component (rendered as route)
- `.test.ts` / `.spec.ts` — Test files (co-located or in __tests__)

**Directories:**

- `src/app/(group)/` — Route groups (use parentheses to not affect URL)
- `src/lib/` — Utilities and helpers (not exported as routes)
- `src/components/` — Reusable UI components
- `docs/wiki/` — Sprint plans (synced to GitHub Wiki)

**Component Files:**

- `PascalCase` — React components (`SessionWizard.tsx` or `session-wizard.tsx`)
- kebab-case — Directories (`src/components/session/`)

**Functions and Variables:**

- `camelCase` — All functions and variables

**Constants:**

- `UPPER_SNAKE_CASE` — App-wide constants (defined in `src/lib/utils/constants.ts`)

## Where to Add New Code

**New Feature (e.g., "Calendar Integration"):**
- Primary code: `src/app/(dashboard)/calendar/` (pages) + `src/components/calendar/` (UI)
- API endpoints: `src/app/api/calendar/[POST]`, `[id]/[PATCH]`, etc.
- Validation: `src/lib/validations/calendar.ts`
- Database: `src/lib/db/schema/calendar.ts` (if new tables)
- Jobs (if async): `src/lib/jobs/sync-calendar.ts`
- Tests: Co-located `src/app/api/calendar/__tests__/` or dedicated test directory

**New Component/Module:**
- UI component: `src/components/[category]/ComponentName.tsx` (or `.tsx` for file)
- Business logic: Extract to `src/lib/[feature]/` (e.g., `src/lib/analytics/compute.ts`)
- Hooks: `src/lib/hooks/useComponentName.ts`

**Utilities:**
- Shared helpers: `src/lib/utils/` (formatting, scoring, etc.)
- Domain-specific: `src/lib/[domain]/` (e.g., `src/lib/email/`, `src/lib/auth/`)

**Database Changes:**
- Schema: Add/modify in `src/lib/db/schema/` (appropriate file)
- Migrations: Auto-generated via `drizzle-kit generate`
- Seed: Update `src/lib/db/seed.ts`

## Special Directories

**src/lib/db/migrations/:**
- Purpose: Drizzle-generated SQL migration files
- Generated: `npx drizzle-kit generate`
- Committed: Yes (git-tracked for reproducibility)
- Applied: `npx drizzle-kit migrate` or automatic on deploy

**node_modules/:**
- Purpose: npm dependencies
- Generated: `npm install`
- Committed: No (.gitignore)

**public/:**
- Purpose: Static assets (images, fonts)
- Generated: No (manually added)
- Committed: Yes

**drizzle/:**
- Purpose: Drizzle Studio snapshots and config
- Generated: Drizzle CLI
- Committed: Check per team preference

**docs/wiki/:**
- Purpose: Sprint plans and documentation synced to GitHub Wiki
- Generated: No (manually written)
- Committed: Yes (auto-synced to GitHub Wiki via hook on Edit/Write)

---

*Structure analysis: 2026-03-03*
