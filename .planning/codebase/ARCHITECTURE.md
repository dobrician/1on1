# Architecture

**Analysis Date:** 2026-03-03

## Pattern Overview

**Overall:** Monolith-first Next.js application with server-driven rendering and API-based mutations

**Key Characteristics:**
- Single Next.js 15 (App Router) application running on Vercel
- Multi-tenant shared database (PostgreSQL 16) with tenant isolation via `tenant_id` and Row-Level Security (RLS)
- Server Components for data fetching (no API calls for initial page loads)
- Client Components with TanStack Query for interactive features
- Event-driven background jobs via Inngest for async operations
- Type-safe end-to-end development with TypeScript (strict mode) and Zod validation schemas

## Layers

**Presentation Layer (Client):**
- Purpose: Render interactive UI, handle user interactions, optimistic updates via TanStack Query
- Location: `src/components/`, `src/app/(dashboard)/`
- Contains: React Components (Client and Server), page routes
- Depends on: API routes, TanStack Query, shadcn/ui components, Tailwind CSS
- Used by: End users via web browser

**API Layer:**
- Purpose: Single mutation boundary for all writes, request validation, authorization checks, audit logging
- Location: `src/app/api/`
- Contains: API route handlers for users, teams, templates, series, sessions, analytics, webhooks
- Depends on: Database (Drizzle), Zod validation schemas, Auth context, Inngest for job triggers
- Used by: Client Components (TanStack Query), Server Components (form submissions), external integrations

**Business Logic / Service Layer:**
- Purpose: Encapsulate domain logic, reusable functions for complex operations
- Location: `src/lib/` (to be created)
- Contains: Utility functions for scoring, calculations, notifications, encryption, authorization helpers
- Depends on: Database, external services (Resend, R2, Inngest)
- Used by: API routes, Server Components, Inngest functions

**Data Access Layer:**
- Purpose: Type-safe database access via ORM
- Location: `src/lib/db/schema/` (table definitions), `src/lib/db/index.ts` (client export)
- Contains: Drizzle table definitions, migrations, seed data
- Depends on: PostgreSQL 16
- Used by: All layers that read/write data

**Background Jobs Layer:**
- Purpose: Handle async operations that don't need to block the user
- Location: `src/lib/jobs/`, `src/app/api/inngest/`
- Contains: Inngest function definitions (send reminders, compute analytics, carry over actions)
- Depends on: Database, Resend (email), Inngest SDK
- Used by: Inngest scheduler, API routes that trigger events

**Auth & Session Layer:**
- Purpose: Authentication, session management, multi-tenant context
- Location: `src/lib/auth/` (Auth.js v5 config), `src/app/api/auth/`
- Contains: Auth.js configuration, custom providers, session callbacks, middleware
- Depends on: Auth.js, database for user lookups, OAuth providers
- Used by: Next.js middleware, API routes, Server Components

## Data Flow

**Initial Page Load (Server-Side Rendering):**

1. User navigates to `/dashboard/overview`
2. Next.js middleware checks auth session (via session-token cookie)
3. Server Component at `src/app/(dashboard)/overview/page.tsx` executes
4. Component calls Drizzle to fetch data directly from database (filters by tenant_id)
5. HTML is rendered with data pre-populated (no loading spinners)
6. Client hydrates with interactive elements

**Mutation (Interactive Update):**

1. User submits form in Client Component (e.g., create session)
2. React Hook Form validates with Zod schema on client
3. Form submit handler calls API route via TanStack Query mutation
4. API route (`src/app/api/sessions/[POST]`) validates input again with Zod
5. Authorization check: verify user is manager on the series
6. Business logic: compute next session date, check validations
7. Database write via Drizzle (RLS policies enforce tenant isolation)
8. Optional: trigger Inngest event (e.g., `session.created`)
9. Response returned to client
10. TanStack Query updates client cache (optimistic or pessimistic)
11. UI re-renders with new data

**Background Job (Async Work):**

1. API route triggers event: `inngest.send({ name: 'session.completed', data: {...} })`
2. Inngest picks up event and executes registered function (`send-session-summary`)
3. Function queries database for session details and participants
4. Sends email via Resend with React Email template
5. Logs result to database (notification table)
6. If failure: automatic retry with exponential backoff

**State Management:**

- **Server State (Read)**: Server Components read directly from database via Drizzle
- **Session State**: Managed by Auth.js via HTTP-only cookies
- **Client State (Interactive)**: TanStack Query caches API responses, handles refetching
- **Form State**: React Hook Form manages uncontrolled form fields
- **UI State**: React hooks (useState) for local UI toggles

## Key Abstractions

**TENANT isolation:**
- Purpose: Multi-tenant data segregation at database and application levels
- Examples: Every query filters by `tenant_id`, RLS policies enforce this at the DB level
- Pattern: Tenant ID derived from authenticated session, never from request parameters. Set via `SET LOCAL app.current_tenant_id` on each DB connection.

**MEETING_SERIES:**
- Purpose: Represents a recurring 1:1 relationship between manager and report
- Examples: `src/lib/db/schema/series.ts`
- Pattern: Links `USER (manager_id)` to `USER (report_id)` with cadence, default template, and scheduling metadata

**SESSION:**
- Purpose: A single meeting instance
- Examples: `src/lib/db/schema/sessions.ts`
- Pattern: Belongs to MEETING_SERIES, linked to QUESTIONNAIRE_TEMPLATE, contains SESSION_ANSWER records

**SESSION_ANSWER (Polymorphic Design):**
- Purpose: Store responses with flexible answer types (text, numeric, JSON) for efficient SQL aggregation
- Examples: `src/lib/db/schema/answers.ts`
- Pattern: Single table with typed columns (answer_text, answer_numeric, answer_json). The question's answer_type determines which column to read. Enables direct aggregation without JOINs across type-specific tables.

**QUESTIONNAIRE_TEMPLATE:**
- Purpose: Reusable set of questions with versioning
- Examples: `src/lib/db/schema/templates.ts`
- Pattern: Version increments on edit; past sessions retain answers via question references. System templates (tenant_id = NULL) are read-only and shared across tenants.

**Private Notes Encryption:**
- Purpose: Additional security layer for sensitive manager observations
- Examples: `src/lib/utils/encryption.ts` (planned)
- Pattern: AES-256-GCM at application level. Per-tenant encryption keys derived from master key via HKDF.

**ANALYTICS_SNAPSHOT (Pre-computed Metrics):**
- Purpose: Fast dashboard rendering by storing pre-aggregated metrics
- Examples: `src/lib/db/schema/analytics.ts`
- Pattern: Computed nightly/weekly by Inngest job. Metrics: avg_session_score, wellbeing_score, meeting_adherence, action_completion_rate, etc.

**RBAC (Role-Based Access Control):**
- Purpose: Three-tier authorization: admin (company-wide), manager (own reports), member (self)
- Examples: Authorization checks in API routes before mutations
- Pattern: Role check + resource-level check. Example: verify user is manager on a series before allowing session edit.

## Entry Points

**Web Application:**
- Location: `src/app/` (Next.js App Router)
- Triggers: User navigates to URL
- Responsibilities: Render pages, manage client state, display UI

**Auth Routes (Public):**
- Location: `src/app/(auth)/`
- Triggers: Unauthenticated user visits `/login`, `/register`, `/forgot-password`
- Responsibilities: Handle authentication, OAuth/magic link flows, set session cookie

**Dashboard Routes (Protected):**
- Location: `src/app/(dashboard)/`
- Triggers: Authenticated user navigates to `/overview`, `/sessions/[id]`, etc.
- Responsibilities: Fetch data via Server Components, render dashboard UI

**API Routes:**
- Location: `src/app/api/`
- Triggers: Client mutations, external webhooks
- Responsibilities: Validate input, authorize request, execute business logic, trigger background jobs

**Inngest Webhook:**
- Location: `src/app/api/inngest/`
- Triggers: Inngest event scheduler
- Responsibilities: Execute background functions (reminders, analytics, notifications)

**Next.js Middleware:**
- Location: `middleware.ts` (root)
- Triggers: Every request
- Responsibilities: Check auth session, set tenant context, redirect unauthenticated users

## Error Handling

**Strategy:** Layered error handling with specific error types and user-friendly messages

**Patterns:**

1. **Validation Errors** (Client + Server):
   - Zod schemas validate input on both client (pre-submit feedback) and server (security)
   - Zod throws ZodError with field-level messages
   - API routes return 400 with parsed validation errors
   - Client displays field errors via React Hook Form

2. **Authorization Errors** (API Routes):
   - Resource-level checks verify user can access/modify resource
   - Throw ForbiddenError if unauthorized
   - Return 403 Forbidden response
   - Log to audit log

3. **Database Errors** (Drizzle):
   - Unique constraint violations caught and converted to user-friendly messages
   - RLS violations return 403 (should not happen if app code is correct)
   - Connection errors logged and retried with exponential backoff

4. **External Service Errors** (Resend, R2, Inngest):
   - Wrapped in try/catch, logged with context
   - Inngest functions implement automatic retries (exponential backoff)
   - Failed email notifications stored in database for retry
   - Non-critical failures don't block user requests (async jobs)

5. **Unexpected Errors:**
   - Caught at API layer, logged with request context
   - Return 500 Internal Server Error
   - Log to error tracking service (configured via environment)

## Cross-Cutting Concerns

**Logging:**
- Approach: Structured logging with context (tenant_id, user_id, request_id)
- Location: `src/lib/utils/logger.ts` (planned)
- Used by: API routes, Inngest functions, database operations
- Example: Log all mutations (user_id, action, resource_id, timestamp) for audit trail

**Validation:**
- Approach: Zod schemas shared between client and server
- Location: `src/lib/validations/`
- Used by: Client (React Hook Form), Server (API routes)
- Pattern: Define schema once, reuse everywhere for consistency

**Authentication:**
- Approach: Auth.js v5 with multiple providers (email/password, OAuth, magic link)
- Location: `src/lib/auth/config.ts`
- Session: HTTP-only cookies + optional JWT for API authentication
- Multi-tenant: Tenant ID stored in session, validated on every request

**Multi-tenancy:**
- Approach: Tenant ID on every table, enforced by RLS policies
- Implementation: Middleware sets `app.current_tenant_id` on each connection
- Safety Net: Database RLS prevents data leaks even if app code has bugs
- Validation: Tenant ID always derived from session, never from request params

**Audit Logging:**
- Approach: Immutable audit log table recording all significant events
- Schema: `src/lib/db/schema/audit.ts` (planned)
- Events: User invites, deactivations, data exports, settings changes, sessions started/completed
- Retention: 2 years minimum (regulatory requirement)

---

*Architecture analysis: 2026-03-03*
