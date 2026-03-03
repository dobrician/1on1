# Project Research Summary

**Project:** 1on1 — AI-powered 1:1 meeting management SaaS
**Domain:** HR Tech / Manager Effectiveness / AI-native SaaS
**Researched:** 2026-03-03
**Confidence:** HIGH

## Executive Summary

The 1on1 product occupies a well-defined but competitive niche: structured manager-report meeting software with AI as the primary value driver. The competitive landscape (Fellow, 15Five, Windmill, Lattice) reveals a critical strategic opening — every competitor either uses unstructured notes (Fellow), periodic survey pulses (15Five, Lattice), or noisy work-tool context (Windmill). None collect structured, typed, categorized data at the cadence of every 1:1. This structural data advantage — six typed question formats producing SQL-aggregatable session answers — is the moat. The recommended approach is to exploit it immediately: ship AI features in v1 grounded in this structured data, not as a v3 add-on.

The technology stack is well-defined and proven. The additive AI layer should be built on the Vercel AI SDK (provider-agnostic abstraction over OpenAI and Anthropic), with Inngest handling all multi-step AI pipelines as durable, retryable workflows. Real-time features use SSE via Next.js Route Handlers — no WebSocket infrastructure needed. The AI context layer lives inside the existing Next.js monolith with clear internal boundaries. pgvector within the existing Neon PostgreSQL instance handles embedding storage up to ~1M vectors without a separate vector database. At a 50-user company with 200 sessions/month, total LLM costs are approximately $7-15/month — negligible.

The dominant risk is not technical complexity but strategic misalignment: the existing `docs/features.md` defers all AI to v3 and calendar integration to v2, directly contradicting the "AI-first" product positioning. The roadmap must resolve this contradiction in Phase 1 of planning. Three pitfalls require Phase 1 design decisions that cannot be retrofitted: (1) RLS enforcement via a dedicated database role (not `neondb_owner`) with `withTenantContext()` wrappers; (2) AI tenant isolation via an explicit context guard before every LLM call; and (3) private note encryption with versioned key derivation. Getting these wrong means rewrites or unrecoverable data loss, not just bugs.

## Key Findings

### Recommended Stack

The core stack (Next.js 15, TypeScript, Drizzle ORM, PostgreSQL 16, Auth.js v5, shadcn/ui, Tailwind CSS 4, Bun) is decided. The AI layer adds four components: the Vercel AI SDK (`ai@^6.0`) as the provider-agnostic LLM abstraction; `@ai-sdk/openai` and `@ai-sdk/anthropic` as provider packages; `@googleapis/calendar` (scoped package, not the 171MB full `googleapis`) for Google Calendar integration; and the existing Inngest (`^3.52`) for durable AI pipeline orchestration via `step.ai.wrap()`. No LangChain, no LlamaIndex, no separate vector database, no WebSockets, no Redis.

**Core technologies:**
- Vercel AI SDK (`ai@^6.0`): LLM abstraction layer — switches providers with one import change; streaming, structured output with Zod schemas, and tool calling all included
- `@ai-sdk/openai` + `@ai-sdk/anthropic`: provider packages — route tasks to cheapest capable model (GPT-5 nano for summaries at $0.05/1M tokens; Claude Haiku 4.5 for structured extraction; Claude Sonnet 4.5 for nuanced analysis)
- Inngest `step.ai.wrap()`: durable AI pipelines — wraps `generateText` calls as independently-retryable steps; `step.ai.infer()` pauses serverless execution during inference at zero compute cost
- `@googleapis/calendar@^14.2`: Google Calendar integration — scoped package only; Auth.js Drizzle adapter stores OAuth tokens automatically in the `account` table
- pgvector (Neon, built-in): embedding storage — 1536-dim vectors with HNSW cosine similarity index; no separate vector DB needed below ~1M vectors
- Node.js built-in `crypto`: AES-256-GCM private note encryption — no external dependency; HKDF for per-tenant key derivation from master key

### Expected Features

Research identifies a critical strategic reassessment of the existing feature roadmap. The current `docs/features.md` places AI in v3 and Google Calendar in v2. Both decisions contradict competitive reality and the stated product positioning.

**Must have at launch (table stakes — every competitor has these):**
- Shared meeting agendas / talking points — users assume bidirectional, not manager-only
- Action item tracking with owners, due dates, and carry-over across sessions — carry-over is table stakes, not v2; trivial to implement, transforms session continuity
- Session history with full context — chronological list with click-through to details
- Google Calendar read-only integration — show upcoming 1:1s from calendar; absence is a dealbreaker for managers with 5+ reports
- Email notifications (reminders + post-session summaries) — retention mechanism
- Manager dashboard with status indicators — the home screen
- Multi-user roles (admin/manager/member) with resource-level RBAC
- Questionnaire template builder (6 question types) — the structured data engine
- Auto-save during sessions (500ms debounce)
- Mobile-responsive session view (tablet minimum)
- Full-text search across session notes
- **AI session summaries** — first proof of AI-first positioning; structured data makes this straightforward and reliable
- **AI pre-session nudges** — the "wow" moment; surgical, specific nudges grounded in typed answer history

**Should have — competitive differentiators:**
- Session wizard with context panel (historical trends, action items, AI suggestions in sidebar) — the core UX differentiator; no competitor combines structure + continuity this way
- AI live suggestions during sessions (streaming, low-latency) — add when LLM infra is proven stable
- AI anomaly detection (numeric trends, no LLM needed initially — z-scores on `answer_numeric`) — add when users have 8+ sessions
- AI personal profiles (longitudinal compressed summaries updated after each session)
- Private notes with AES-256-GCM encryption — trust feature; strongest security posture in category
- Structured data enabling SQL-native analytics — architectural differentiator; enables all AI and analytics to be built faster and more reliably
- "Constant feeling of progress" UX philosophy — sparklines, trend arrows, completion rates, streak indicators on every relevant screen

**Defer to v2+:**
- Advanced analytics (heatmaps, team aggregates, comparison views) — needs data maturity
- AI growth narratives — requires personal profiles and analytics maturity
- Google Calendar read/write — extend from read-only once integration is proven
- Conditional question logic in template builder
- Slack/Teams integration (reminders and nudges via chat)
- SSO (SAML/OIDC) — enterprise requirement, add when deals demand it
- Outlook/O365 calendar sync
- PDF export with company branding
- Public API and webhooks
- Mobile native app
- i18n

**Explicitly do NOT build:**
- Real-time video/audio in the session wizard — competing with Zoom/Teams is suicidal; deep-link from calendar instead
- AI meeting transcription — commodity; the structured questionnaire produces cleaner data; integrate with Otter/Fireflies via API in v3 if needed
- Full HRIS integration — swamp of custom APIs; CSV import for MVP
- Anonymous peer feedback / 360 reviews — poisons 1:1 trust dynamic
- OKR tracking embedded in product — separate product category; dilutes focus
- Gamification (badges, leaderboards) — trivializes serious professional conversations
- Slack/Teams bot replacing the session wizard — lower-quality answers; notification-only role for chat tools
- Manager scoring / ranking across company — creates perverse incentives; destroys psychological safety

### Architecture Approach

The AI layer extends the existing Next.js monolith as an internal service (`src/lib/ai/`) with clear boundaries — it is not a separate deployment. All LLM interactions flow through this service layer: context assembly, tenant guard validation, prompt construction, and response parsing. The three AI data flows are: (1) pre-computed AI insights read by Server Components from the `ai_insight` and `ai_profile` tables (never LLM calls on page load); (2) streaming LLM responses via `streamText` and SSE for interactive features; (3) multi-step durable pipelines via Inngest triggered by events from API routes. The session wizard's "live" suggestions are the only place real-time LLM calls happen.

Three new tables are required beyond the existing schema: `session_embedding` (pgvector, HNSW-indexed, tenant-scoped); `ai_insight` (pre-computed summaries, nudges, narratives); and `ai_profile` (incrementally-updated compressed user profile). The AI personal profile pattern — compressing all session history into a structured JSON profile, updated incrementally after each session — eliminates the "stuff all history into every prompt" anti-pattern and keeps per-call token counts bounded regardless of session count.

**Major components:**
1. AI Service (`src/lib/ai/`) — LLM provider configuration, context assembly, tenant guard, prompt registry, output schemas, multi-step pipelines; called by API routes and Inngest jobs
2. Embedding Pipeline (Inngest job on `session.completed`) — generates 1536-dim embeddings of text answers, notes, summaries, and action items; stored in `session_embedding` with HNSW cosine index
3. Durable AI Pipelines (Inngest functions) — post-session summary + action extraction + profile update as independently-retryable steps; pre-session nudge generation as cron job 24h before scheduled sessions
4. Streaming API Routes (`src/app/api/ai/`) — thin handlers for interactive features; authenticate, assemble context, guard, stream via `streamText`; never chain multiple LLM calls inline
5. Pre-computed AI reads (Server Components) — dashboard nudges, session prep, summaries all read from database tables populated by Inngest jobs; zero LLM latency on page load

### Critical Pitfalls

1. **AI deferred to v3 despite "AI-first" intent** — The existing `docs/features.md` directly contradicts PROJECT.md. Resolve this in Phase 1 planning: AI session summaries and pre-session nudges must ship in v1. Build the session wizard with an AI panel slot from day one. Without this correction, the product ships as a structured Google Forms replacement. Prevention: AI pipeline scaffolding (tables, service layer, Inngest job skeleton) in the foundation phase.

2. **Multi-tenant AI context leakage** — RLS at the database layer is not sufficient for the AI pipeline. Every assembled prompt must pass through a `validateTenantContext()` guard that verifies all records (sessions, embeddings, profiles) belong to the requesting tenant before the LLM call. Embedding vectors in pgvector must be filtered by `tenant_id` on every similarity search. Prevention: build the guard function before the first AI feature ships; treat it as the AI equivalent of RLS.

3. **RLS bypass via `neondb_owner` role and transaction pooling** — Neon's default role has `BYPASSRLS` and silently ignores all RLS policies. PgBouncer in transaction mode requires `SET LOCAL` to run inside transactions; any query outside `withTenantContext()` skips tenant scoping. Prevention: create a dedicated app role without `BYPASSRLS`; set `prepare: false` in Drizzle client config; wrap every database operation in `withTenantContext()`; write cross-tenant access integration tests using the actual app role.

4. **Private note encryption key management failure** — Lost master key means permanent, unrecoverable data loss for all private notes. HKDF derivation parameters must be pinned and versioned. Every encrypted note must store a `key_version` field (currently missing from the schema). Prevention: store master key in a secrets manager (not `.env`); version the encryption scheme; implement lazy key rotation (decrypt old version, re-encrypt on read); document and test the key backup procedure before any private notes are stored.

5. **LLM cost explosion at scale** — A single AI feature at $0.02/call is cheap; five AI features at 1,000 tenants is $5,000-15,000/month before meaningful revenue. Prevention: model costs per feature before shipping; use cheapest capable model per use case (GPT-5 nano for summaries, not GPT-4o); implement per-tenant rate limits from the start; use Inngest batch API (50% cheaper) for non-real-time features; compress context via AI profiles rather than stuffing raw session history into prompts.

## Implications for Roadmap

Based on research, the dependency graph and pitfall-to-phase mapping suggest the following phase structure. The existing 15-sprint plan in `docs/wiki/` reflects a solid foundation-first approach but requires two corrections: (1) AI features must be pulled forward into the v1 feature set, and (2) the "AI is v3" framing must be abandoned in the planning phase.

### Phase 1: Security and Data Foundation
**Rationale:** Everything else depends on correct multi-tenancy, RLS, auth, and encryption. Mistakes here require rewrites. This phase has no optional parts.
**Delivers:** Database schema with RLS policies; dedicated app role (not `neondb_owner`); `withTenantContext()` transaction wrapper; Auth.js v5 with tenant_id embedded in JWT; AES-256-GCM encryption for private notes with key versioning; Drizzle client configured with `prepare: false` for Neon pooling.
**Addresses:** Auth + multi-tenancy + user management (FEATURES.md table stakes)
**Avoids:** RLS bypass pitfall; encryption key management failure; Auth.js secret management issues
**Research flag:** Standard patterns — well-documented in Neon + Drizzle + Auth.js official docs. Skip research-phase.

### Phase 2: Core Data Model and Background Infrastructure
**Rationale:** The questionnaire template system, meeting series, and session data model are the foundation for every feature. The AI tables and Inngest scaffolding must be built here alongside the business tables — not retrofitted later.
**Delivers:** All DB schema tables (tenant, user, meeting_series, session, session_answer, action_item, private_note, analytics_snapshot, plus AI tables: session_embedding, ai_insight, ai_profile); Inngest client setup with `generate-session-summary` function skeleton; pgvector extension enabled on Neon.
**Addresses:** Questionnaire template builder (internal data model); meeting series (internal data model); AI pipeline scaffolding
**Avoids:** "AI as afterthought" pitfall — embedding the AI tables here prevents retrofitting; audit log partitioning trap
**Research flag:** Standard patterns for the business tables. The pgvector + HNSW index setup may need verification against Neon's current extension docs. Suggest light research-phase for embedding schema.

### Phase 3: Authentication, Onboarding, and User Management
**Rationale:** Users must exist before any tenant-scoped feature can be tested. Invites and team structure (manager-report pairs) gate the session wizard.
**Delivers:** Sign-in with Google (Auth.js); email/password sign-in; user invitation flow; team management (reporting lines); tenant provisioning on signup.
**Addresses:** Multi-user roles (RBAC); user management with invites (FEATURES.md table stakes)
**Avoids:** Auth.js JWT missing tenant_id; OAuth token refresh issues
**Research flag:** Standard patterns. Skip research-phase.

### Phase 4: Questionnaire Template Builder and Meeting Series
**Rationale:** The template system creates the structured data — the product's entire data advantage depends on getting the 6 question types right. Meeting series pairs managers with reports and sets cadence, which gates the session wizard.
**Delivers:** Template builder UI (6 question types: rating_1_5, rating_1_10, multiple_choice, text_short, text_long, yes_no); default templates (3-4 seeded from `docs/questionnaires.md`); meeting series creation with cadence, manager-report pairing, and default template; template assignment per series.
**Addresses:** Questionnaire template system; meeting series (FEATURES.md table stakes)
**Uses:** shadcn/ui form components; Zod validation; Drizzle mutations via API routes
**Research flag:** Standard patterns for form builder UI. Skip research-phase.

### Phase 5: Session Wizard — Core Experience
**Rationale:** This is the product. Everything before enables this; everything after builds on it. The session wizard must include the AI panel slot from day one — a context panel placeholder that the live suggestion feature will populate — so the layout is not rearchitected when AI arrives in Phase 6.
**Delivers:** Step-by-step session wizard with category-grouped questions (4-6 steps); context panel (shows last 3 sessions, open action items, AI suggestion placeholder); auto-save at 500ms debounce; shared notes with clear private/shared visual distinction; action item creation inline; session completion flow that fires `session.completed` Inngest event.
**Addresses:** Session wizard with context panel (core UX differentiator); auto-save; action item creation (FEATURES.md)
**Avoids:** N+1 queries in context panel (batch-load last 3 sessions with Drizzle `with`); synchronous LLM calls blocking wizard; private note UI confusion (strong visual distinction)
**Research flag:** Standard Next.js + shadcn patterns for the wizard UI. The streaming integration point (AI panel) should be stubbed correctly from day one — low research needed.

### Phase 6: AI Pipeline — Session Summaries and Pre-Session Nudges
**Rationale:** AI must ship in v1. These two features — post-session summaries and pre-meeting nudges — are the highest-value, most implementable AI features. They use background Inngest pipelines (no real-time latency pressure) and prove the "AI-first" positioning. This phase also establishes the embedding pipeline that all future AI features depend on.
**Delivers:** Post-session Inngest pipeline (context assembly -> summary generation via `generateObject` with Zod schema -> action item extraction -> embedding generation -> profile update); `ai_insight` table populated with summaries; pre-session nudge Inngest cron job (24h before sessions); nudge display on dashboard and session prep screen; per-tenant AI rate limiting; cost-per-call logging.
**Addresses:** AI session summaries; AI pre-session nudges (pulled forward from v3 per FEATURES.md strategic reassessment); action item carry-over (queries open items per series)
**Avoids:** AI context leakage (tenant guard in place before first LLM call); LLM cost explosion (cheapest capable model per task; cost tracking from day one); serverless timeout (all LLM calls via Inngest, never blocking API routes); prompt injection (sanitize user input before LLM context assembly)
**Research flag:** Needs research-phase. Inngest `step.ai.wrap()` patterns, Zod structured output with AI SDK, and multi-tenant prompt architecture all benefit from deeper research before implementation.

### Phase 7: Manager Dashboard and Session History
**Rationale:** With sessions completing and AI generating insights, the manager needs a home screen that surfaces everything: upcoming sessions, AI nudges, overdue action items, and trend indicators.
**Delivers:** Manager dashboard (upcoming sessions with status indicators, overdue action items, AI nudges for upcoming meetings, session adherence streak); session history (chronological list with click-through to completed sessions and their AI summaries); basic analytics (score trend sparklines per series, category breakdown); "constant feeling of progress" UX patterns throughout (trend arrows, completion percentages).
**Addresses:** Manager dashboard; session history; basic analytics (FEATURES.md table stakes)
**Avoids:** Analytics queries on raw session_answer table (read from analytics_snapshot pre-computed by Inngest cron); analytics dashboard overwhelming users (3 key metrics first, progressive disclosure)
**Research flag:** Analytics computation patterns are well-documented for PostgreSQL window functions. Skip research-phase.

### Phase 8: Action Items, Full-Text Search, and Email Notifications
**Rationale:** These three features complete the engagement loop: action items create accountability; search makes history accessible; email keeps users returning between sessions.
**Delivers:** Action item tracking with owner, due date, status; carry-over of incomplete items to next session (already architected); action item dashboard view; full-text search across session notes (PostgreSQL `tsvector` with GIN index); email notification templates for reminders (24h before) and post-session summaries (via Resend + React Email).
**Addresses:** Action items with carry-over (moved to MVP); full-text search; email notifications (FEATURES.md table stakes)
**Avoids:** Full-text search without proper indexing (GIN index on tsvector); carried-over items duplicating on repeated carries; email delivery without tracking (Resend webhook callbacks)
**Research flag:** Standard patterns. Skip research-phase.

### Phase 9: Google Calendar Integration (Read-Only)
**Rationale:** Calendar integration is table stakes at launch, not v2. Read-only (display upcoming 1:1s from Google Calendar, deep-link to session wizard) is sufficient to resolve the "where are my meetings?" problem without the complexity of creating/modifying calendar events.
**Delivers:** Google OAuth calendar scope added to Auth.js provider (`calendar.events.readonly`); calendar sync via `@googleapis/calendar`; dashboard shows upcoming 1:1 sessions from Google Calendar; OAuth token refresh rotation in Auth.js `jwt` callback; polling fallback with `syncToken` incremental sync.
**Addresses:** Google Calendar read-only integration (moved to MVP per FEATURES.md strategic reassessment)
**Avoids:** Google Calendar webhook unreliability (build polling fallback from day one; webhooks accelerate, polling guarantees); OAuth token storage without encryption; requesting overly broad scopes
**Research flag:** Needs research-phase. Google Calendar webhook renewal, `syncToken` incremental sync, and App verification timeline (2-4 weeks — apply early) all require careful implementation. Google's app verification process must be initiated well before this phase.

### Phase 10: AI Live Suggestions (Streaming)
**Rationale:** Live suggestions during sessions are the most visible and technically complex AI feature. They should ship after the AI pipeline (Phase 6) is proven stable and the embedding infrastructure has accumulated real data. The session wizard already has the AI panel slot (Phase 5).
**Delivers:** Streaming `/api/ai/suggest` API route (`streamText` -> SSE); client-side AI suggestion panel using `useCompletion`; debounced trigger (500ms after answer input); context assembly using last 3 sessions + AI profile + top-10 relevant embeddings; Claude Haiku 4.5 for speed (4-5x faster than Sonnet).
**Addresses:** AI live suggestions during sessions (P2 feature from FEATURES.md)
**Avoids:** Blocking wizard with AI processing (streaming progressively renders; no loading spinner); unbounded context window (profile + recent sessions + RAG, not all history); AI suggestions feeling generic (pattern-based on score changes, not generic questions)
**Research flag:** Standard Vercel AI SDK streaming patterns. Light review of `useCompletion` hook API. Skip dedicated research-phase.

### Phase 11: AI Personal Profiles and Anomaly Detection
**Rationale:** By this phase, users have sufficient session history for profiles to be meaningful. Anomaly detection requires numeric trend data. Both features surface in the context panel and dashboard, providing the "compounding insights" product vision.
**Delivers:** AI profile builder Inngest pipeline (incremental update after each session, activated after 5+ sessions); AI profile display in context panel; anomaly detection on `answer_numeric` trends (z-scores, moving averages — rules-based, no LLM); dashboard alerts for score drops exceeding threshold.
**Addresses:** AI personal profiles; AI anomaly detection (P2 features from FEATURES.md)
**Avoids:** AI profile cold start (only activate after 5+ sessions; set user expectation in onboarding); over-stuffing prompts with raw history (profile is the compressed representation); per-tenant fine-tuning (use base model with profile-enriched context)
**Research flag:** The incremental profile update pattern benefits from prompt engineering research. Suggest light research-phase for profile schema and merge prompts.

### Phase 12: Advanced Analytics and Growth Narratives
**Rationale:** Once users have 3+ months of data and the AI infrastructure is mature, richer analytics and narrative interpretation become possible and impactful.
**Delivers:** Advanced analytics views (session-over-session comparison, category heatmaps, team aggregate views for admins); AI growth narratives (Claude Sonnet 4.5 for writing quality; monthly generation via Inngest cron; integration with analytics dashboard and PDF export groundwork).
**Addresses:** Advanced analytics; AI growth narratives (v2 features from FEATURES.md)
**Avoids:** Analytics job scalability trap (fan out per-tenant via Inngest, not sequential processing); dashboard overwhelm (highlight anomalies, don't dump charts)
**Research flag:** Standard patterns. Skip research-phase.

### Phase Ordering Rationale

- **Security foundation before user features:** RLS bypass and encryption key failures cannot be retrofitted. They must be right before any tenant data is written.
- **AI tables in Phase 2, not Phase 6:** The "AI as afterthought" pitfall happens when AI tables are added later. Building them alongside the business schema signals architectural commitment and prevents retrofitting the session wizard.
- **Session wizard before AI features:** The wizard generates the data that AI consumes. Three sessions minimum before nudges are useful; five before profiles are meaningful.
- **Embedding pipeline in Phase 6, not later:** Embeddings must accumulate before retrieval-augmented suggestions (Phase 10) can work well. Starting the pipeline in Phase 6 gives 2-3 phases of data accumulation before Phase 10.
- **Google Calendar in Phase 9, not v2:** Table stakes for manager adoption. Read-only is sufficient for v1. Start App verification well before this phase — it takes 2-4 weeks.
- **Live suggestions after AI pipeline is stable:** Phase 10 after Phase 6 ensures the streaming path is built on a proven foundation, not alongside the initial LLM integration.

### Research Flags

Phases needing deeper research during planning (before implementation sprint):
- **Phase 6 (AI Pipeline):** Inngest `step.ai.wrap()` patterns; Zod structured output shapes; multi-tenant prompt architecture; cost modeling per AI call; rate limiting implementation
- **Phase 9 (Google Calendar):** Webhook renewal mechanism; `syncToken` incremental sync; App verification timeline and process; OAuth token refresh in production; incremental vs. full sync strategy
- **Phase 11 (AI Profiles):** Incremental profile merge prompt engineering; cold start detection and user communication; profile schema versioning

Phases with standard patterns (skip dedicated research-phase):
- **Phase 1 (Foundation):** Neon + Drizzle + Auth.js RLS patterns are thoroughly documented in official sources
- **Phase 3 (Auth/Onboarding):** Auth.js v5 with Google OAuth is well-established
- **Phase 4 (Template Builder):** React Hook Form + shadcn/ui + Zod are the stack defaults
- **Phase 5 (Session Wizard):** Next.js App Router + shadcn/ui component patterns are well-documented
- **Phase 7 (Dashboard):** Server Components + TanStack Query + Recharts are the stack defaults
- **Phase 8 (Action Items + Email):** Inngest + Resend + React Email are well-documented

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Core additive packages (AI SDK, @googleapis/calendar, @auth/drizzle-adapter) verified via official npm and docs. Version compatibility table verified. LLM pricing is MEDIUM — models change rapidly. |
| Features | MEDIUM-HIGH | Competitor analysis from official product sites. The strategic reassessment (AI in v1, calendar in v1) is well-reasoned from multiple competitive sources. Specific competitor feature claims from vendor sites are inherently partial. |
| Architecture | HIGH | AI service layer patterns, Inngest `step.ai.wrap()`, pgvector HNSW, and tenant context guard are all from official documentation. Scaling estimates are reasonable extrapolations. |
| Pitfalls | HIGH | Critical pitfalls (RLS bypass, encryption key management, AI context leakage) verified against official docs, OWASP LLM Top 10, and academic research. Cost explosion and calendar webhook unreliability are well-documented production failure modes. |

**Overall confidence:** HIGH

### Gaps to Address

- **LLM model recommendations:** Specific model capabilities (GPT-5 nano, Claude Haiku 4.5) are based on March 2026 pricing and benchmarks. Validate current pricing and test both models on sample session data before committing to per-feature model assignments.
- **Inngest Realtime (`useAgent` hook):** Released September 2025; less documented than core Inngest patterns. Evaluate for long-running AI workflows in Phase 11 once core pipeline (Phase 6) is stable.
- **Google App verification timeline:** 2-4 weeks with possible rejection. Initiate the verification process before Phase 9 begins — ideally during Phase 6 or 7. Factor this into sprint scheduling.
- **pgvector HNSW index tuning:** At scale, `m` and `ef_construction` parameters affect performance. Default values are fine for MVP; revisit when series have 100+ sessions.
- **Private note `key_version` field:** Currently absent from the schema in `docs/data-model.md`. Must be added in Phase 1 before any private notes are stored. Flag for schema review.
- **Prompt injection prevention:** OWASP LLM Top 10 identifies this as the top risk. Input sanitization strategy for session notes entering LLM context should be specified in Phase 6 research before implementation.

## Sources

### Primary (HIGH confidence)
- [Vercel AI SDK 6 docs](https://ai-sdk.dev/docs/introduction) — `streamText`, `generateObject`, `streamObject`, `useCompletion`, structured output with Zod
- [Inngest AI orchestration docs](https://www.inngest.com/docs/features/inngest-functions/steps-workflows/step-ai-orchestration) — `step.ai.wrap()`, `step.ai.infer()`, durable AI pipelines
- [Neon pgvector extension docs](https://neon.com/docs/extensions/pgvector) — HNSW index, vector cosine similarity search
- [Drizzle ORM RLS docs](https://orm.drizzle.team/docs/rls) — `pgPolicy()`, `pgRole()`, RLS with serverless pooling
- [Neon RLS with Drizzle guide](https://neon.com/docs/guides/rls-drizzle) — dedicated app role, `prepare: false` configuration
- [Auth.js refresh token rotation guide](https://authjs.dev/guides/refresh-token-rotation) — Google OAuth token refresh in `jwt` callback
- [Auth.js Drizzle adapter](https://authjs.dev/getting-started/adapters/drizzle) — account table stores OAuth tokens
- [Google Calendar Push Notifications](https://developers.google.com/workspace/calendar/api/guides/push) — 7-day expiry, empty-body notifications, webhook reliability caveats
- [OWASP LLM Top 10: Prompt Injection (LLM01:2025)](https://genai.owasp.org/llmrisk/llm01-prompt-injection/) — prompt injection prevention
- [OpenAI pricing](https://platform.openai.com/docs/pricing) — GPT-5.2, GPT-5 nano pricing as of March 2026
- [Anthropic pricing](https://platform.claude.com/docs/en/about-claude/pricing) — Claude Haiku/Sonnet 4.5 pricing as of March 2026
- Project documentation (`docs/features.md`, `docs/data-model.md`, `docs/architecture.md`, `docs/ux-flows.md`, `docs/questionnaires.md`) — first-party design specs

### Secondary (MEDIUM confidence)
- [Windmill 1:1 features](https://gowindmill.com/features/one-on-ones/), [Fellow](https://fellow.ai/use-cases/one-on-one-meetings), [15Five](https://www.15five.com/products/perform/check-ins), [Lattice](https://lattice.com/platform/performance/one-on-ones) — competitor feature analysis via official sites
- [Hedy AI Topic Insights announcement](https://www.globenewswire.com/news-release/2025/11/24/3193943/0/en/) — November 2025, cross-session AI insights on transcripts
- [Multi-Tenant RAG Architecture Patterns](https://www.maviklabs.com/blog/multi-tenant-rag-2026) — context isolation, embedding namespacing
- [Anthropic: Effective Context Engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) — context window management strategies
- [Multi-Tenant AI Leakage (LayerX)](https://layerxsecurity.com/generative-ai/multi-tenant-ai-leakage/) — AI context leakage case studies
- [Burn-After-Use Multi-Tenant LLM Security (arXiv)](https://arxiv.org/abs/2601.06627) — academic research on cross-tenant data leakage in shared LLM serving

### Tertiary (LOW confidence)
- [Fellow action item tracking stats](https://fellow.ai/blog/how-to-track-action-items-steps-to-ensure-follow-through/) — 44% of action items never completed (vendor blog, unverified independently)
- [AI 1:1 meeting features analysis (TeamGPS)](https://teamgps.com/blog/productivity-and-performance/ai-1-on-1-meetings/) — single blog source
- [2025 LLM structured extraction research](https://www.preprints.org/manuscript/202506.1937) — Claude >80% accuracy across prompt styles (preprint, not peer-reviewed)

---
*Research completed: 2026-03-03*
*Ready for roadmap: yes*
