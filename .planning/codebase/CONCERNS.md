# Codebase Concerns

**Analysis Date:** 2026-03-03

## Tech Debt

**Multi-tenant Row-Level Security (RLS) Enforcement Complexity:**
- Issue: RLS policies (`src/lib/db/schema/*.ts`) must be correctly configured on every tenant-scoped table. The design relies on application middleware (`src/lib/db/index.ts`) to set `app.current_tenant_id` via `SET LOCAL` on each database connection. If this middleware is bypassed or misconfigured in even one location, tenant data could leak across companies.
- Files: `src/lib/db/index.ts`, `src/lib/db/schema/` (all schema files), `docs/security.md` (lines 102-145)
- Impact: Critical security issue. A single bypass in an API route could expose sensitive multi-tenant data (session answers, private notes, action items) across tenants.
- Fix approach: (1) Create a centralized `withTenantContext()` wrapper function that enforces RLS before any database query; (2) Linter rule to catch direct `db.query()` calls not wrapped in `withTenantContext()`; (3) Audit every `src/app/api/**` route to ensure RLS context is set; (4) Database-level audit logs to detect and alert on cross-tenant queries.

**Private Notes Encryption Key Management:**
- Issue: Per-tenant encryption keys are derived from a master key using HKDF, with tenant_id as context (per `docs/security.md` lines 206-208). The master key location and rotation strategy are undefined in documentation. If the master key is lost or compromised, all encrypted private notes (`src/lib/db/schema/` private_note table) become inaccessible or exposed.
- Files: `docs/security.md` (lines 204-208), `src/lib/db/schema/` (private_note table definition)
- Impact: Data loss or security breach. Cannot decrypt historical notes; cannot re-encrypt with a new key without implementing key versioning.
- Fix approach: (1) Define master key storage (AWS Secrets Manager, Vault, or Vercel KV); (2) Implement key versioning in the encrypted payload (add `key_version` field to private_note table); (3) Create a key rotation job (`src/lib/jobs/rotate-encryption-keys.ts`) that re-encrypts old notes on-read if key_version mismatch; (4) Document the entire key lifecycle in `docs/security.md`.

**Inngest Background Job Failure Handling:**
- Issue: Background jobs (`src/lib/jobs/`) for sending reminders, computing analytics snapshots, and carrying over action items have no explicit error recovery strategy documented. If an Inngest function fails (e.g., database timeout, API timeout), it's unclear whether it retries automatically, logs to monitoring, or silently fails.
- Files: `src/lib/jobs/send-reminders.ts`, `src/lib/jobs/compute-analytics.ts`, `src/lib/jobs/carry-over-actions.ts`, `docs/architecture.md` (lines 211-217)
- Impact: Silent failures lead to missed reminders, stale analytics, and unprocessed action items. Users don't know their data wasn't updated. No audit trail of what failed.
- Fix approach: (1) Document Inngest retry policy (exponential backoff, max attempts); (2) Add error handling and logging to every job function; (3) Create `src/lib/jobs/error-handler.ts` for consistent error reporting; (4) Add monitoring/alerting integration (Sentry or Datadog) to notify ops of job failures; (5) Implement dead-letter queue or manual retry dashboard for failed jobs.

**Analytics Snapshot Computation Scaling:**
- Issue: The `ANALYTICS_SNAPSHOT` table stores pre-computed metrics. The `compute-analytics.ts` Inngest job runs on a schedule (weekly/monthly/quarterly per `docs/analytics.md` lines 235-249), computing snapshots for all active users and teams. As the user base grows (thousands of users), this job could take hours to complete, blocking other work.
- Files: `src/lib/jobs/compute-analytics.ts`, `docs/analytics.md` (lines 231-250), `src/lib/db/schema/` (analytics_snapshot table)
- Impact: Late-night analytics snapshots. Stale dashboards if computation is delayed. Potential timeout on large tenants.
- Fix approach: (1) Implement incremental snapshot computation (only recompute since last snapshot, not full history); (2) Partition the job by user batch (compute 100 users at a time); (3) Add progress tracking and resume capability; (4) Consider switching to event-driven computation (trigger snapshot update when a session completes, not on a schedule); (5) Add metrics/logging to monitor job duration.

## Known Bugs

None documented yet — project is in documentation/planning phase with no implementation code.

## Security Considerations

**CSRF Protection in API Routes:**
- Risk: The design specifies CSRF tokens on state-changing requests (`docs/security.md` line 285), but no explicit mention of how CSRF tokens are handled in `src/app/api/` routes. If POST/PUT/DELETE routes don't validate CSRF tokens, cross-site request forgery attacks are possible.
- Files: `src/app/api/**`, `middleware.ts`, `docs/security.md` (line 285)
- Current mitigation: Auth.js v5 has built-in CSRF protection, but only if properly configured.
- Recommendations: (1) Document CSRF middleware setup in `src/lib/auth/middleware.ts`; (2) Create a wrapper `withCsrfProtection()` for all mutation API routes; (3) Test CSRF protection in integration tests; (4) Add CSRF token to all form submissions in `src/components/` (verify via React Hook Form integration).

**OAuth State Validation:**
- Risk: Google OAuth and Microsoft OAuth integrations (`docs/security.md` lines 12-13) require state parameter validation to prevent authorization code injection attacks. Auth.js handles this automatically, but misconfiguration could bypass it.
- Files: `src/lib/auth/config.ts` (Auth.js configuration), `docs/security.md` (lines 12-13)
- Current mitigation: Auth.js v5 OAuth providers include state validation by default.
- Recommendations: (1) Confirm state validation is enabled in Auth.js config (`allowDangerousEmailAccountLinking` should be false); (2) Test OAuth flow with invalid state parameter to ensure rejection; (3) Document the OAuth provider IDs and secret rotation process.

**Rate Limiting Implementation:**
- Risk: `docs/security.md` (lines 271-278) defines rate limits (10 req/15min for auth, 100 req/1min for general API), but no implementation details are provided. Without enforcing these limits, attackers can brute-force passwords or DoS the API.
- Files: `src/app/api/**`, `src/lib/auth/**`, `middleware.ts`, `docs/security.md` (lines 271-278)
- Current mitigation: None documented.
- Recommendations: (1) Implement rate limiting middleware using a library like `upstash/ratelimit` (works on Vercel); (2) Create `src/lib/middleware/rate-limit.ts` with configurable limits per endpoint; (3) Return HTTP 429 with Retry-After header when limit exceeded; (4) Store rate limit state in Redis (Vercel KV or Upstash); (5) Add monitoring to detect abuse patterns.

**Private Note Authorization Check:**
- Risk: The private_note table has an RLS policy enforcing `author_id = current_setting('app.current_user_id')` (`docs/security.md` line 444). However, if the application code doesn't check this, an admin might accidentally expose a private note endpoint that returns all notes, not just the requester's.
- Files: `src/lib/db/schema/` (private_note table), `src/app/api/sessions/[id]/notes/` (private notes endpoint)
- Current mitigation: RLS policy provides defense in depth.
- Recommendations: (1) Add explicit authorization check in the API route: verify `note.author_id === currentUser.id` before returning; (2) Test that non-authors cannot access via direct UUID; (3) Add a note in `docs/security.md` that private notes have dual protection (application + RLS).

## Performance Bottlenecks

**Session Wizard Real-time Saving:**
- Problem: The session wizard auto-saves answers, notes, and action items on every change (debounced, per `docs/features.md` line 76). Each auto-save makes a database write. With 5 questions in a session and a 1-second debounce, that's ~5-10 writes per question. On a slow network or overloaded database, users see lag.
- Files: `src/components/session/session-wizard.tsx`, `src/app/api/sessions/[id]/answers/route.ts`, `docs/features.md` (line 76)
- Cause: Naive debounced saves without batching. Each question save triggers a separate API call.
- Improvement path: (1) Batch all unsaved changes (answers, notes, action items) into a single API call; (2) Increase debounce delay to 2-3 seconds to reduce chatter; (3) Use optimistic updates (update UI immediately, sync with server in background) so users never see lag; (4) Add offline support via TanStack Query's persister (cache answers locally if offline, sync when back online).

**Analytics Query Performance at Scale:**
- Problem: Real-time analytics queries (`docs/analytics.md` lines 189-211) join session_answer, template_question, and session tables to compute category scores. With thousands of sessions, this query runs slowly, causing dashboard load delays.
- Files: `src/lib/db/schema/answers.ts`, `src/app/api/analytics/[userId]/route.ts`, `docs/analytics.md` (lines 189-211)
- Cause: Raw queries on large dimension tables without aggregation. Missing indexes on (session_id, question_id).
- Improvement path: (1) Pre-compute metrics on session completion (not in background job, but synchronously). Store session_score immediately in session table; (2) Add indexes: `INDEX(session_id, question_id)` on session_answer; `INDEX(question_id, category)` on template_question; (3) For large date ranges, read from analytics_snapshot (pre-computed) instead of raw session_answer; (4) Implement caching: cache category scores for the last 7 days in Redis, invalidate on new session completion.

**Template Versioning Lookup:**
- Problem: When a session references `template_id` and displays questions, the app must look up the original questions from template_question (not the current version, which may differ). If templates have hundreds of versions with thousands of archived questions, this lookup is slow.
- Files: `src/lib/db/schema/templates.ts`, `src/app/(dashboard)/sessions/[id]/page.tsx`, `docs/questionnaires.md` (lines 36-45)
- Cause: No unique constraint preventing duplicate questions across versions. Full table scan to find the right questions.
- Improvement path: (1) Add `template_version` to session table (denormalize which version was used); (2) Add index `INDEX(template_id, template_version, is_archived)` to template_question; (3) Query by `template_id = ? AND template_version = ? AND is_archived = false`; (4) Consider archiving old question versions to a separate table after 6 months.

## Fragile Areas

**Template Versioning & Data Integrity:**
- Files: `src/lib/db/schema/templates.ts`, `docs/questionnaires.md` (lines 36-45)
- Why fragile: When a template is edited, questions are archived (not deleted), and a new version is created. If a developer accidentally deletes a question row (bypassing soft-delete), past sessions lose data. If version increments inconsistently, analytics breaks.
- Safe modification: (1) Add database constraints to prevent deletion (no CASCADE on foreign keys); (2) Create a `template_audit` table logging all changes (who edited, when, what changed); (3) Add a `@deprecated` marker to question rows being archived; (4) Test that loading an old session always returns the same questions, even after template edits.
- Test coverage: Need integration tests: "Edit template, complete old session, verify session sees old questions. Complete new session, verify it sees new questions."

**Multi-tenant Data Isolation in Queries:**
- Files: All `src/app/api/**` routes, `src/lib/db/index.ts`, `docs/security.md` (lines 147-153)
- Why fragile: Every query must include `WHERE tenant_id = ?`. A single missed filter leaks data across tenants. Developers may forget to add the filter when adding a new endpoint.
- Safe modification: (1) Create a type-safe query builder wrapper that enforces tenant_id filtering (e.g., `db.query.users.findFirst().forTenant(tenantId)`); (2) Linter rule to catch direct `db.query()` calls; (3) Code review checklist: every new API route must verify `tenant_id` in WHERE clause; (4) Integration tests with two tenants to catch isolation bugs.
- Test coverage: Each API endpoint needs a test: "User from Tenant A cannot read data from Tenant B."

**RLS Policies & Middleware Synchronization:**
- Files: `src/lib/db/schema/` (all schema with RLS), `src/lib/db/index.ts` (middleware setting app.current_tenant_id), `docs/security.md` (lines 102-145)
- Why fragile: RLS policies depend on `app.current_tenant_id` being set correctly. If middleware fails to set it, RLS blocks all queries. If RLS policy is created incorrectly (e.g., using != instead of =), all rows become inaccessible.
- Safe modification: (1) Add a smoke test: "Verify RLS policies block cross-tenant queries even with wrong tenant_id"; (2) Document the exact RLS policy syntax for each table type; (3) Add a migration helper function that validates RLS policies on startup; (4) Audit logs: track when RLS context is set/cleared.
- Test coverage: Test that queries fail (not succeed silently) when tenant context is missing.

**Private Note Encryption & Decryption:**
- Files: `src/lib/security/encryption.ts` (once created), `docs/security.md` (lines 167-208)
- Why fragile: If the IV (initialization vector) or auth tag is corrupted, decryption fails with no recovery. If key derivation is wrong, decryption silently returns garbage (no error).
- Safe modification: (1) Always verify auth tag is present before decryption; (2) Test decryption with corrupted IV — should throw error, not return garbage; (3) Add a `keyVersion` field to private_note; (4) On decryption error, log error and fall back to "Note encrypted with unavailable key (admin can re-encrypt)"; (5) Never silently ignore decryption errors.
- Test coverage: Unit tests: "Decrypt with wrong key → error", "Decrypt with corrupted IV → error", "Decrypt with correct key → success".

## Scaling Limits

**Single Next.js Monolith:**
- Current capacity: Design supports ~100-200 concurrent users per deployment (Vercel serverless). At peak (20 companies × 20 users), this is fine. At 1000 users or 100 concurrent sessions, the monolith becomes a bottleneck.
- Limit: When analytics computation takes >1 hour or when API response times exceed 2 seconds under load, the monolith has outgrown.
- Scaling path: (1) Extract analytics computation to a separate worker service (Inngest is already event-driven, make it truly async); (2) Move session wizard API routes to a separate endpoint (scales independently); (3) Eventually, move to a proper backend service (Node.js with Bull queues or Python with Celery); (4) Use read replicas for analytics queries while keeping writes to primary.

**PostgreSQL Database Connections:**
- Current capacity: Neon or Supabase offers ~20-30 concurrent connections in the free tier. The monolith uses Drizzle connection pooling, but at scale (100+ concurrent requests), connection exhaustion is likely.
- Limit: When connection pool is exhausted, requests timeout with "too many connections" error. Not recoverable without manual intervention.
- Scaling path: (1) Implement Drizzle's built-in connection pooling (`max: 50`); (2) Add PgBouncer (connection proxy) between app and database; (3) Upgrade to a higher tier database plan that offers more connections; (4) Implement request queuing in the API layer (queue excess requests, serve from queue when connections free up).

**Storage for File Uploads:**
- Current capacity: Cloudflare R2 or S3 has no practical limits for a SaaS app. But the app doesn't yet implement file upload (profile pictures, attachments are placeholders).
- Limit: When implementing file uploads, need to consider storage costs, CDN delivery, and virus scanning.
- Scaling path: (1) Use R2 with Workers for image resizing and optimization; (2) Implement virus scanning on upload (ClamAV or third-party API); (3) Set expiry on old files (clean up after 90 days if not referenced).

**Email Sending at Scale:**
- Current capacity: Resend offers 10k emails/month free tier. At 200 users with 1 session/month, that's ~600 emails (pre-meeting reminder + summary). Still within free tier.
- Limit: When scaling to 10k+ users, email volume could hit 100k+/month, exceeding free tier. Cost increases. Bounce/spam rates must be monitored.
- Scaling path: (1) Implement email suppression list (don't send to inactive users); (2) Add email engagement tracking (clicks, opens) to Resend; (3) Monitor bounce rates and maintain list hygiene; (4) Consider dedicated email IP for better deliverability; (5) Set up DMARC/SPF/DKIM for authentication.

## Dependencies at Risk

**Auth.js v5 (NextAuth) — Rapid Release Cycle:**
- Risk: Auth.js v5 is relatively new (2024 release). Security patches and breaking changes may come frequently. The stack depends heavily on it for session management, OAuth, and CSRF protection.
- Impact: If Auth.js releases a critical security patch, the app must be updated immediately. Breaking changes could require refactoring `src/lib/auth/` and `middleware.ts`.
- Migration plan: (1) Pin Auth.js version in package.json to a specific release (not `^5.x`); (2) Monitor Auth.js releases weekly; (3) Have a plan to migrate to Clerk or Supabase Auth if Auth.js becomes unmaintained (separate from application code); (4) Document the authentication abstraction layer (what Auth.js features are used vs. which could be swapped).

**Inngest — Job Orchestration Vendor Lock-in:**
- Risk: Inngest is a closed-source service. If pricing increases or service is deprecated, migrating away is difficult.
- Impact: Background jobs (`send-reminders`, `compute-analytics`, `carry-over-actions`) are tightly coupled to Inngest SDK. Switching to Bull (Redis) or AWS SQS would require rewriting all job functions.
- Migration plan: (1) Create `src/lib/jobs/types.ts` with a generic job interface; (2) Implement an Inngest adapter that conforms to this interface; (3) If Inngest fails, have a Bull/Redis adapter ready as a drop-in replacement; (4) Don't use Inngest-specific features (like durable execution); (5) Monitor Inngest pricing and terms annually.

**Drizzle ORM — Immature Ecosystem:**
- Risk: Drizzle ORM is newer than Prisma or TypeORM. Some advanced features (migrations, introspection) are still stabilizing. Community help is smaller.
- Impact: If a bug is encountered in complex queries (e.g., nested joins, type inference), fixing it may require forking or switching to a different ORM.
- Migration plan: (1) Avoid overly complex queries; keep queries simple and testable; (2) Write raw SQL fallbacks for complex analytics queries (`src/lib/db/raw-queries.ts`); (3) Monitor Drizzle releases; (4) If switching needed, Prisma is a drop-in replacement (similar SQL generation); (5) Document which ORM features are critical vs. nice-to-have.

**Tailwind CSS 4 — Breaking Changes:**
- Risk: Tailwind CSS 4 was released in 2024. Major versions often have breaking changes in utility names, configuration, or build process.
- Impact: A future Tailwind 5 could break styling throughout the app (`src/components/**`).
- Migration plan: (1) Pin Tailwind version in package.json; (2) Centralize custom Tailwind config in `tailwind.config.ts`; (3) Use CSS variables for theme tokens, not just Tailwind classes; (4) Monitor Tailwind releases; (5) Plan a major refactor every 2-3 years when a new major version arrives.

## Missing Critical Features

**Offline Support for Session Wizard:**
- Problem: The session wizard auto-saves to the API. If a user loses internet connection during a session, all unsaved answers are lost. Users cannot continue offline.
- Blocks: Mobile users, field workers, unreliable networks.
- Recommendation: (1) Implement local storage caching via TanStack Query's persister; (2) Detect offline state and show a warning; (3) Queue mutations locally and sync when back online; (4) Show a "Draft" indicator; (5) Test with Chrome DevTools offline mode.

**Audit Logging Implementation:**
- Problem: `docs/security.md` (lines 303-340) specifies an audit_log table and what events should be logged, but no implementation code exists. Audit logs are critical for compliance (GDPR, SOC 2).
- Blocks: Security compliance, breach investigation, user accountability.
- Recommendation: (1) Create `src/lib/db/schema/audit-logs.ts` with the audit_log table; (2) Create `src/lib/audit/index.ts` with `logAuditEvent()` helper; (3) Call `logAuditEvent()` from every API route that modifies data; (4) Add integration tests verifying that sensitive actions are logged.

**Email Template Rendering:**
- Problem: `src/lib/email/templates/` is planned but not implemented. Email sending (`src/lib/email/send.ts`) will need React Email templates for invite, reminder, and summary emails.
- Blocks: User onboarding, reminders, engagement.
- Recommendation: (1) Implement `src/lib/email/templates/invite.tsx`, `reminder.tsx`, `session-summary.tsx` using React Email; (2) Add preview URLs for testing; (3) Test email rendering across email clients; (4) Add plain-text fallback for each template.

## Test Coverage Gaps

**Multi-tenancy Isolation:**
- What's not tested: No tests document that User A from Tenant 1 cannot read/write data from Tenant B.
- Files: `src/app/api/**`, `src/lib/db/index.ts`, `docs/security.md` (lines 147-153)
- Risk: A subtle bug in tenant filtering could leak data across companies.
- Priority: **High** — implement before launch. Test every API endpoint with two tenants to verify isolation.

**Private Note Encryption/Decryption:**
- What's not tested: No tests verify that private notes are encrypted at rest, decrypted correctly on read, and inaccessible to other users.
- Files: `src/lib/security/encryption.ts` (not yet created), `src/app/api/sessions/[id]/notes/` (not yet created)
- Risk: Encryption could be broken or bypass silently. Notes could be leaked to other users.
- Priority: **High** — implement unit and integration tests before private note feature ships in Sprint 09.

**Authorization on All API Routes:**
- What's not tested: No tests verify that Members cannot access Manager-only endpoints, that Managers cannot access other Managers' reports, that Admins cannot bypass RLS.
- Files: All `src/app/api/**` routes
- Risk: Authorization bypass allows privilege escalation (member becomes admin, manager sees all reports).
- Priority: **High** — implement authorization tests for each role and resource.

**Session Wizard State Management:**
- What's not tested: No tests verify that closing and reopening a session wizard preserves all unsaved answers, that answers are validated before submission, that concurrent edits don't cause conflicts.
- Files: `src/components/session/session-wizard.tsx`, `src/app/api/sessions/[id]/answers/route.ts`
- Risk: Data loss, invalid data persisted, race conditions.
- Priority: **Medium** — implement after session wizard is built. Simulate concurrent edits, network interruptions.

**Analytics Snapshot Computation:**
- What's not tested: No tests verify that `compute-analytics.ts` correctly computes wellbeing_score, engagement_score, etc., that snapshots are not duplicated, that computation includes all users and teams.
- Files: `src/lib/jobs/compute-analytics.ts`, `src/lib/db/schema/analytics.ts`
- Risk: Incorrect metrics, stale data, duplicated rows.
- Priority: **Medium** — implement integration tests that (1) create sessions with known answers, (2) run the job, (3) verify snapshot values are correct.

---

*Concerns audit: 2026-03-03*
