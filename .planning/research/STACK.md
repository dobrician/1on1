# Stack Research

**Domain:** AI-powered 1:1 meeting management SaaS
**Researched:** 2026-03-03
**Confidence:** HIGH (core stack verified via official docs; AI integration patterns verified via multiple sources)

## Context

The core application stack is already decided: Next.js 15, TypeScript, Drizzle ORM, PostgreSQL 16, Auth.js v5, shadcn/ui, Tailwind CSS 4, Bun. This research focuses on the **additive layers** that make this an AI-powered product: LLM integration, Google Calendar sync, real-time session features, and analytics computation patterns.

The project's vision is that AI is the product, not a bolt-on feature. Every meeting should get smarter over time. This has direct stack implications -- the AI layer must be deeply integrated from day one, not retrofitted.

---

## Recommended Stack

### AI / LLM Integration

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Vercel AI SDK (`ai`) | ^6.0 | Provider-agnostic LLM abstraction layer | The standard for AI in Next.js. Unified API across OpenAI, Anthropic, Google. Supports streaming, structured output with Zod schemas, tool calling, and agents. Deployed on Vercel natively. AI SDK 6 adds agent loops, MCP support, and DevTools. [Confidence: HIGH -- verified via official docs] |
| `@ai-sdk/openai` | ^3.0 | OpenAI provider for AI SDK | First-class provider. GPT-5 nano ($0.05/$0.40 per 1M tokens) is ideal for high-volume tasks like session summaries; GPT-5.2 ($1.75/$14.00 per 1M) for complex analysis. [Confidence: HIGH] |
| `@ai-sdk/anthropic` | ^3.0 | Anthropic provider for AI SDK | Claude Haiku 4.5 ($1/$5 per 1M tokens) excels at structured data extraction (>80% accuracy across prompt styles per 2025 research). Sonnet 4.5 ($3/$15 per 1M) for nuanced meeting analysis. [Confidence: HIGH] |

**Architecture decision: Use Vercel AI SDK as the abstraction layer, NOT direct OpenAI/Anthropic SDKs.**

Rationale: The AI SDK lets you swap providers with a single import change. This is critical because:
1. LLM pricing shifts rapidly (OpenAI dropped 60%+ in 18 months)
2. Model quality varies by task (Claude is better at structured extraction; OpenAI is cheaper for summaries)
3. You can route different AI features to different providers based on cost/quality tradeoffs

### AI Model Strategy

| Use Case | Recommended Model | Cost per 1M tokens | Rationale |
|----------|-------------------|---------------------|-----------|
| Session summaries | GPT-5 nano or Claude Haiku 4.5 | $0.05-1.00 input | High volume, formulaic output. Cheapest model that produces good summaries |
| Suggested questions | Claude Haiku 4.5 | $1/$5 | Needs context awareness + structured output. Haiku has the best accuracy-to-cost ratio |
| Personal profile building | Claude Sonnet 4.5 | $3/$15 | Requires nuanced reasoning over accumulated session data |
| Anomaly detection / nudges | GPT-5 nano | $0.05/$0.40 | Simple pattern matching over numeric trends. Volume makes cost matter |
| Live session suggestions | Claude Haiku 4.5 | $1/$5 | Low latency required. Haiku is 4-5x faster than Sonnet at fraction of cost |
| Growth narratives | Claude Sonnet 4.5 | $3/$15 | Needs long-form reasoning and writing quality |

[Confidence: MEDIUM -- model recommendations based on current pricing/capabilities; models change rapidly]

### Google Calendar Integration

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `@googleapis/calendar` | ^14.2 | Google Calendar API v3 client | Official Google-maintained package. Smaller than full `googleapis` (171MB). Typed API, supports events CRUD, watch notifications. [Confidence: HIGH -- verified via npm/official docs] |
| `googleapis` | - | **Do NOT install** | Full Google API client is 171MB+. Only use `@googleapis/calendar` for the specific API you need |

**OAuth Token Flow for Calendar:**

Auth.js v5 with the Drizzle adapter stores OAuth tokens in the `account` table automatically (`access_token`, `refresh_token`, `expires_at`). The integration pattern:

1. User signs in with Google OAuth via Auth.js (request `calendar.events` scope alongside `openid email profile`)
2. Auth.js stores tokens in the `account` table via Drizzle adapter
3. When creating/reading calendar events, retrieve tokens from the `account` table
4. Implement refresh token rotation in the Auth.js `jwt` callback (check `expires_at`, POST to Google token endpoint if expired)
5. Use `@googleapis/calendar` with the refreshed `access_token` for API calls

**Required OAuth scopes:**
- `calendar.events` -- read/write events on the user's calendars (needed for creating 1:1 meeting events and reading availability)
- Request scopes incrementally: start with `calendar.events.readonly` at signup, upgrade to `calendar.events` when user first creates a meeting

[Confidence: HIGH -- verified via Google official docs and Auth.js refresh token rotation guide]

### Real-Time Session Features

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Server-Sent Events (native) | N/A | Server-to-client streaming for live AI suggestions | SSE is built into browsers and Next.js Route Handlers via ReadableStream. No extra dependency needed. Perfect for streaming AI responses during sessions. [Confidence: HIGH] |
| Vercel AI SDK `streamText` | ^6.0 | Streaming LLM responses to the UI | Built-in streaming protocol that works with React hooks (`useChat`, `useCompletion`). Handles SSE under the hood. [Confidence: HIGH] |
| Inngest Realtime | ^3.52 | Real-time updates from background AI jobs | Inngest's `useAgent` React hook streams updates from durable AI workflows to the browser. Use for long-running AI tasks (profile building, analytics computation). [Confidence: MEDIUM -- feature released Sept 2025] |

**Architecture decision: Use SSE for real-time, NOT WebSockets.**

Rationale for this specific product:
1. All real-time features are server-to-client (AI suggestions, live updates) -- SSE is purpose-built for this
2. The session wizard does NOT need collaborative editing (manager fills in answers, not both simultaneously)
3. SSE works natively on Vercel's serverless infrastructure; WebSockets require persistent connections and a separate service (e.g., Pusher, Ably)
4. Auto-save uses debounced API route mutations (POST), not real-time sync -- SSE is for the AI suggestion stream, not for data sync

**When WebSockets would be needed (and when to reconsider):** If you add real-time collaborative note editing where both manager and report type simultaneously, you would need WebSockets (via Liveblocks, PartyKit, or Yjs). This is NOT in the current scope.

[Confidence: HIGH -- verified Next.js 15 SSE pattern via official docs and community implementations]

### Background AI Processing

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Inngest | ^3.52 | Durable workflow orchestration for AI pipelines | Already in the stack for non-AI jobs. Inngest's `step.ai.wrap()` integrates directly with Vercel AI SDK -- wraps `generateText` calls as retryable steps with observability. `step.ai.infer()` offloads inference to Inngest infra so you don't pay for serverless compute while waiting. [Confidence: HIGH -- verified via Inngest official docs] |

**AI Pipeline Architecture with Inngest:**

```
Event: "session.completed"
  |
  +-> step.run("prepare-context")     # Fetch session answers, previous sessions, action items
  +-> step.ai.wrap("generate-summary") # AI SDK generateText with structured output
  +-> step.ai.wrap("extract-actions")  # AI SDK generateText with Zod schema for action items
  +-> step.ai.wrap("update-profile")   # AI SDK generateText to update personal profile
  +-> step.run("persist-results")      # Write to DB
  +-> step.run("send-summary-email")   # Email via Resend
```

Benefits of using Inngest for AI pipelines:
- Each step retries independently (LLM API calls fail ~2-5% of the time)
- `step.ai.infer()` pauses serverless execution while waiting for LLM response -- zero compute cost during inference
- Full observability: see prompts, token usage, latency per step in Inngest dashboard
- Step results are cached -- if step 4 fails, steps 1-3 don't re-run

### Analytics Computation

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| PostgreSQL 16 window functions | N/A | Real-time analytics queries | Use `AVG() OVER`, `LAG()`, `RANK()` for trend calculations directly in SQL. Drizzle ORM supports window functions. Avoid pulling data into JS for computation. [Confidence: HIGH] |
| Inngest cron functions | ^3.52 | Scheduled analytics snapshot computation | Nightly/weekly cron jobs to pre-compute `analytics_snapshot` table. Inngest handles scheduling, retries, and observability. [Confidence: HIGH] |
| Drizzle ORM `sql` template | ^0.38 | Complex analytics queries | Use Drizzle's `sql` tagged template for analytics queries that need window functions, CTEs, and aggregations. Don't fight the ORM -- drop to raw SQL for analytics. [Confidence: HIGH] |

**Architecture decision: Push analytics computation to PostgreSQL, NOT to application code.**

The data model already has typed answer columns (`answer_text`, `answer_numeric`, `answer_json`). This enables:
- Direct `AVG()`, `SUM()`, `COUNT()` on `answer_numeric` without JSON parsing
- Window functions for session-over-session comparison (`LAG()` over `session_score`)
- Materialized views or pre-computed snapshots for dashboard queries

---

## Supporting Libraries

### AI-Specific

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `zod` | ^3.24 | Schema definitions for AI structured output | Already in stack. Used with AI SDK's `Output.object({ schema })` to define the shape of AI-generated summaries, action items, suggested questions. Shared between AI output validation and form validation. [Confidence: HIGH] |
| `tiktoken` | ^1.0 | Token counting for prompt management | Use before sending prompts to estimate token usage and stay within context windows. Essential for cost monitoring and prompt truncation. Install only if needed. [Confidence: MEDIUM] |

### Server Actions & Data Mutation

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `next-safe-action` | ^8.0 | Type-safe server actions with middleware | Wraps Next.js Server Actions with Zod validation, error handling, and middleware. Replaces manual validation in API routes. Zero dependencies. Use for ALL mutations alongside the existing API route pattern. [Confidence: MEDIUM -- popular community library, not officially Vercel-maintained] |

### Auth & Calendar

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@auth/drizzle-adapter` | ^1.11 | Drizzle ORM adapter for Auth.js | Stores users, accounts (with OAuth tokens), sessions, verification tokens in PostgreSQL via Drizzle. The `account` table automatically stores Google OAuth `access_token` and `refresh_token` needed for Calendar API. [Confidence: HIGH] |

### Encryption (Private Notes)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Node.js `crypto` (built-in) | N/A | AES-256-GCM encryption for private notes | Use Node.js built-in crypto module. No external dependency needed. HKDF for per-tenant key derivation from master key. [Confidence: HIGH] |

---

## Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Inngest Dev Server | Local AI workflow testing | Run `npx inngest-cli dev` alongside `bun run dev`. Provides local dashboard to inspect AI pipeline steps, replay failed jobs, and view prompts/responses. |
| Vercel AI SDK DevTools | Debug LLM calls in development | AI SDK 6 includes built-in DevTools showing inputs, outputs, token usage, timing per call. Enable in dev mode. |
| `drizzle-kit studio` | Database browser | Already in stack. Use to inspect analytics snapshots, session answers, and AI-generated data during development. |

---

## Installation

```bash
# AI integration (core)
bun add ai @ai-sdk/openai @ai-sdk/anthropic

# Google Calendar
bun add @googleapis/calendar

# Auth adapter (stores OAuth tokens for Calendar integration)
bun add @auth/drizzle-adapter

# Server actions (optional but recommended)
bun add next-safe-action

# Dev tools
bun add -D inngest-cli
```

**Environment variables to add:**

```env
# AI Providers
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Google Calendar (extend existing Google OAuth)
# AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET already exist for auth
# Add calendar scope to the Google provider configuration:
# scope: "openid email profile https://www.googleapis.com/auth/calendar.events"

# Encryption (private notes)
ENCRYPTION_MASTER_KEY=... # 32-byte hex string, generate with: openssl rand -hex 32
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Vercel AI SDK | Direct `@anthropic-ai/sdk` or `openai` SDK | Only if you need provider-specific features not exposed by AI SDK (e.g., Claude's computer use, OpenAI's assistants API). For this project, AI SDK covers all needs |
| `@googleapis/calendar` | Full `googleapis` package | Never for this project. The full package is 171MB+ and includes every Google API. Use the scoped calendar package |
| SSE (native) | Pusher / Ably / Liveblocks | Only if you add real-time collaborative editing between manager and report. Current wizard is single-user-fills-in, so SSE suffices |
| Inngest `step.ai.wrap()` | Direct LLM calls in API routes | Only for simple, single-call AI features where reliability doesn't matter. For multi-step AI pipelines (summarize + extract + profile), Inngest provides retries, observability, and cost savings |
| PostgreSQL window functions | Application-level computation | Never for this project. The data model is designed for SQL aggregation. Computing analytics in JS means pulling all data into memory |
| `next-safe-action` | Raw Server Actions | Raw Server Actions if you prefer API routes for all mutations (project already plans this). `next-safe-action` is best if you want to use Server Actions directly from components |
| GPT-5 nano | Claude Haiku 4.5 | For highest-volume, lowest-cost tasks where Claude's quality advantage doesn't matter. Test both and compare output quality per use case |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| LangChain | Massive dependency, abstracts away too much, adds indirection without value for this use case. You don't need a framework -- you need direct LLM calls with structured output | Vercel AI SDK `generateText` with `Output.object()` + Zod schemas |
| LlamaIndex | Designed for RAG over document stores. This product's data is structured in PostgreSQL, not unstructured documents | Direct Drizzle queries to build context, then pass to AI SDK |
| Pinecone / Weaviate / vector DB | Overkill. Session data is structured (ratings, text answers) and relational. You don't need semantic search over embeddings for this domain | PostgreSQL full-text search (`tsvector`) for searching session notes. `LIKE` / `ILIKE` for simple search |
| Socket.io / WebSockets | Requires persistent connections, separate infrastructure, and doesn't work natively on Vercel serverless | SSE via Next.js Route Handlers for server-to-client streaming |
| Cron jobs via Vercel Cron | Limited to 1 execution per minute on Pro plan, no retries, no observability, no multi-step workflows | Inngest cron functions with `step.ai.wrap()` for reliable scheduled AI work |
| `openai` npm package directly | Locks you to one provider. When Claude drops prices or adds features, you'd need to refactor | `@ai-sdk/openai` provider via Vercel AI SDK |
| Redis for real-time | Adds infrastructure complexity for a feature (pub/sub) that SSE handles natively | SSE for streaming, TanStack Query for polling-based updates |

---

## Stack Patterns by AI Feature

**If building session summaries:**
- Use Inngest `step.ai.wrap()` with AI SDK `generateText`
- Define a Zod schema for the summary structure (key themes, action items, sentiment)
- Use the cheapest model (GPT-5 nano or Claude Haiku 4.5) -- test both for quality
- Run as background job triggered by `session.completed` event

**If building live session suggestions:**
- Use AI SDK `streamText` in a Next.js API route
- Stream suggestions via SSE to the session wizard's context panel
- Use Claude Haiku 4.5 for speed (4-5x faster than Sonnet)
- Pass last 3 sessions + current answers as context

**If building personal profiles:**
- Use Inngest multi-step workflow
- Step 1: Aggregate all session data for the user
- Step 2: AI SDK `generateText` with `Output.object()` to produce structured profile
- Step 3: Diff with existing profile, merge changes
- Trigger on `session.completed` with debouncing (don't rebuild on every session)

**If building proactive nudges:**
- Use Inngest cron function (daily or before scheduled meetings)
- Query recent sessions + action items for upcoming meetings
- Use GPT-5 nano for cost efficiency -- nudges are simple pattern matching
- Store nudges in a `nudge` table, display on dashboard

**If building analytics computation:**
- Use Inngest cron function (weekly/monthly)
- Compute in PostgreSQL using window functions and CTEs
- Write results to `analytics_snapshot` table
- Dashboard reads from snapshots (fast) not raw session data (slow)

---

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `ai@^6.0` | `@ai-sdk/openai@^3.0`, `@ai-sdk/anthropic@^3.0` | AI SDK 6 uses v3 Language Model Specification. Provider packages must be v3+ |
| `ai@^6.0` | `next@^15.0` | Full App Router support, streaming in Route Handlers, Server Actions |
| `inngest@^3.52` | `ai@^6.0` | `step.ai.wrap()` supports AI SDK `generateText` and `streamText` |
| `@auth/drizzle-adapter@^1.11` | `drizzle-orm@^0.38`, `next-auth@^5.0` | Adapter bridges Auth.js and Drizzle schema |
| `@googleapis/calendar@^14.2` | Node.js 18+ / Bun | Uses Google's official client library, compatible with Bun runtime |
| `next@^15.0` | `bun@^1.1` | Bun runtime support is GA on Vercel since Oct 2025. Use `bun --bun` prefix for scripts |
| `next-safe-action@^8.0` | `next@^15.0`, `zod@^3.24` | Supports any Standard Schema validator (Zod, Valibot, ArkType) |

**Bun compatibility note:** Bun runs the vast majority of npm packages without changes. All packages listed here are compatible. Use `bun add` instead of `npm install` per project constraints.

---

## Cost Estimation (AI Features)

Assuming a company with 50 active users, 200 sessions/month:

| Feature | Model | Calls/Month | Avg Tokens | Est. Monthly Cost |
|---------|-------|-------------|------------|-------------------|
| Session summaries | GPT-5 nano | 200 | ~2K in / 500 out | ~$0.06 |
| Suggested questions | Claude Haiku 4.5 | 600 (3 per session) | ~3K in / 200 out | ~$2.40 |
| Personal profiles | Claude Sonnet 4.5 | 50 (1 per user/month) | ~10K in / 1K out | ~$2.25 |
| Proactive nudges | GPT-5 nano | 400 (2 per session) | ~1K in / 200 out | ~$0.06 |
| Live suggestions | Claude Haiku 4.5 | 1000 (5 per session) | ~2K in / 100 out | ~$2.50 |
| **Total** | | | | **~$7.27/month** |

At scale (1000 users, 4000 sessions/month), costs would be approximately $145/month. LLM costs are negligible relative to hosting costs until very high scale.

[Confidence: MEDIUM -- based on current published pricing as of March 2026; actual token counts depend on prompt engineering]

---

## Sources

- [Vercel AI SDK 6 announcement](https://vercel.com/blog/ai-sdk-6) -- features, backwards compatibility, agent support [HIGH confidence]
- [AI SDK documentation](https://ai-sdk.dev/docs/introduction) -- `generateText`, `streamText`, structured output with `Output.object()` [HIGH confidence]
- [AI SDK structured data generation](https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data) -- Zod integration, output types [HIGH confidence]
- [Inngest AI orchestration docs](https://www.inngest.com/docs/features/inngest-functions/steps-workflows/step-ai-orchestration) -- `step.ai.infer()`, `step.ai.wrap()` [HIGH confidence]
- [Inngest AgentKit announcement](https://www.inngest.com/blog/ai-orchestration-with-agentkit-step-ai) -- `useAgent` React hook, real-time AI streaming [MEDIUM confidence]
- [Google Calendar API auth scopes](https://developers.google.com/workspace/calendar/api/auth) -- 17 scopes, incremental authorization [HIGH confidence]
- [Auth.js refresh token rotation guide](https://authjs.dev/guides/refresh-token-rotation) -- jwt callback pattern for Google token refresh [HIGH confidence]
- [Auth.js Drizzle adapter](https://authjs.dev/getting-started/adapters/drizzle) -- account table schema, token storage [HIGH confidence]
- [Drizzle ORM RLS documentation](https://orm.drizzle.team/docs/rls) -- `pgTable.withRLS()`, `pgPolicy()`, `pgRole()` [HIGH confidence]
- [OpenAI pricing](https://platform.openai.com/docs/pricing) -- GPT-5.2, GPT-5 nano pricing as of March 2026 [HIGH confidence]
- [Anthropic pricing](https://platform.claude.com/docs/en/about-claude/pricing) -- Claude Haiku/Sonnet/Opus 4.5 pricing [HIGH confidence]
- [Next.js Bun support](https://bun.com/docs/guides/ecosystem/nextjs) -- GA on Vercel since Oct 2025 [HIGH confidence]
- [npm: ai@6.0.105](https://www.npmjs.com/package/ai) -- latest version verified [HIGH confidence]
- [npm: @ai-sdk/anthropic@3.0.50](https://www.npmjs.com/package/@ai-sdk/anthropic) -- latest version verified [HIGH confidence]
- [npm: inngest@3.52.4](https://www.npmjs.com/package/inngest) -- latest version verified [HIGH confidence]
- [npm: @googleapis/calendar@14.2.0](https://www.npmjs.com/package/@googleapis/calendar) -- latest version verified [HIGH confidence]
- [npm: @auth/drizzle-adapter@1.11.1](https://www.npmjs.com/package/@auth/drizzle-adapter) -- latest version verified [HIGH confidence]
- [2025 LLM structured extraction research](https://www.preprints.org/manuscript/202506.1937) -- Claude >80% accuracy across prompt styles [MEDIUM confidence]

---
*Stack research for: AI-powered 1:1 meeting management SaaS*
*Researched: 2026-03-03*
