# Architecture Research

**Domain:** AI-powered 1:1 meeting management SaaS
**Researched:** 2026-03-03
**Confidence:** MEDIUM-HIGH

## Standard Architecture

### System Overview

```
                    +---------------------------------------------------------+
                    |                   Next.js 15 Monolith                    |
                    |                                                         |
                    |  +-------------+  +-------------+  +---------------+    |
                    |  | Server      |  | API Routes  |  | Inngest       |    |
                    |  | Components  |  | (Mutations) |  | Functions     |    |
                    |  +------+------+  +------+------+  +-------+-------+    |
                    |         |                |                  |            |
                    |  +------+----------------+------------------+-------+    |
                    |  |              Service Layer                       |    |
                    |  |  +----------+  +----------+  +-------------+    |    |
                    |  |  | AI       |  | Business |  | Analytics   |    |    |
                    |  |  | Service  |  | Logic    |  | Pipeline    |    |    |
                    |  |  +----+-----+  +----+-----+  +------+------+    |    |
                    |  +-------|-------------|---------------|------------+    |
                    |          |             |               |                 |
                    +----------|-------------|---------------|--+---------+----+
                               |             |               |  |         |
                    +----------+-------------+---------------+  |         |
                    |          PostgreSQL 16                  |  |         |
                    |  +----------+  +----------+  +-------+ |  |         |
                    |  | Relational|  | pgvector |  | RLS   | |  |         |
                    |  | Tables   |  | Embeddings|  |Policies| |  |         |
                    |  +----------+  +----------+  +-------+ |  |         |
                    +----------------------------------------+  |         |
                                                                |         |
                    +--------------------+   +------------------+----+    |
                    |   LLM Providers    |   |     Inngest Cloud     |    |
                    | (OpenAI/Anthropic) |   | (Durable Execution)   |    |
                    +--------------------+   +-----------------------+    |
                                                                          |
                    +-----------------------------------------------------+
                    |            External Services                         |
                    |  +--------+  +--------+  +--------+  +--------+    |
                    |  | Resend |  | R2/S3  |  | Google |  | OAuth  |    |
                    |  | (Email)|  | (Files)|  |Calendar|  |Providers|    |
                    |  +--------+  +--------+  +--------+  +--------+    |
                    +-----------------------------------------------------+
```

The architecture extends the existing monolith-first design with a dedicated AI Service layer and pgvector embeddings within the same PostgreSQL database. This is the critical insight: the AI layer is not a separate service -- it lives inside the monolith and uses the same database, but with clear internal boundaries.

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| **AI Service** | All LLM interactions: prompt construction, context assembly, embedding generation, response parsing | `src/lib/ai/` -- service functions called by API routes and Inngest jobs |
| **Vercel AI SDK** | Streaming LLM responses to browser, structured output with Zod schemas, provider abstraction | `ai` package -- `streamText`, `generateObject`, `streamObject` in API routes |
| **Embedding Pipeline** | Convert session answers, notes, and profile data into vector embeddings for retrieval | Inngest background job -- runs after session completion |
| **Context Assembler** | Build LLM prompts by combining retrieved embeddings, recent session data, and user profile | `src/lib/ai/context.ts` -- pure function, no side effects |
| **Analytics Pipeline** | Pre-compute metrics, generate AI growth narratives from trend data | Inngest scheduled jobs -- writes to `analytics_snapshot` and `ai_insight` tables |
| **Prompt Registry** | Store and version prompt templates per AI feature (summaries, nudges, suggestions) | `src/lib/ai/prompts/` -- typed template functions, not raw strings |
| **Multi-Tenant AI Guard** | Ensure every LLM call includes only data from the requesting tenant | Middleware in AI Service -- validates tenant_id on all context before prompt assembly |

## Recommended Project Structure

```
src/
├── lib/
│   ├── ai/                          # AI service layer
│   │   ├── index.ts                 # AI client initialization (Vercel AI SDK)
│   │   ├── providers.ts             # LLM provider configuration
│   │   ├── context.ts               # Context assembly (builds prompts from data)
│   │   ├── embeddings.ts            # Embedding generation and search
│   │   ├── guard.ts                 # Multi-tenant data isolation for AI calls
│   │   ├── prompts/                 # Prompt templates per feature
│   │   │   ├── session-summary.ts   # Post-session summary generation
│   │   │   ├── pre-session-nudge.ts # Pre-meeting nudges and suggestions
│   │   │   ├── live-suggestion.ts   # During-session contextual suggestions
│   │   │   ├── growth-narrative.ts  # Longitudinal growth story
│   │   │   └── action-items.ts      # Auto-suggested action items
│   │   ├── schemas/                 # Zod schemas for structured AI output
│   │   │   ├── summary.ts           # Session summary output shape
│   │   │   ├── nudge.ts             # Pre-session nudge output shape
│   │   │   ├── suggestion.ts        # Live suggestion output shape
│   │   │   └── profile.ts           # AI-generated profile shape
│   │   └── pipelines/               # Multi-step AI workflows
│   │       ├── post-session.ts      # Summary + action items + profile update
│   │       └── profile-builder.ts   # Incremental profile construction
│   │
│   ├── db/
│   │   ├── schema/
│   │   │   ├── ...existing tables...
│   │   │   ├── embeddings.ts        # Vector embedding table (pgvector)
│   │   │   ├── ai-insights.ts       # AI-generated insights table
│   │   │   └── ai-profiles.ts       # AI personal profile table
│   │   └── ...
│   │
│   ├── jobs/                        # Inngest functions
│   │   ├── ...existing jobs...
│   │   ├── generate-summary.ts      # Post-session AI summary
│   │   ├── generate-nudges.ts       # Pre-session nudge generation
│   │   ├── update-embeddings.ts     # Embed session data after completion
│   │   ├── update-profile.ts        # Rebuild AI profile incrementally
│   │   └── generate-narrative.ts    # Periodic growth narrative
│   │
│   └── ...existing lib directories...
│
├── app/
│   ├── api/
│   │   ├── ai/                      # AI-specific API routes
│   │   │   ├── suggest/route.ts     # Live suggestions (streaming)
│   │   │   ├── summary/route.ts     # On-demand summary generation
│   │   │   └── nudges/route.ts      # Pre-session nudge retrieval
│   │   └── ...existing API routes...
│   │
│   └── ...existing app routes...
```

### Structure Rationale

- **`src/lib/ai/`:** Isolated AI service layer. All LLM interactions go through here -- never called directly from components. This makes it possible to swap providers, add caching, or extract to a microservice later without touching UI code.
- **`src/lib/ai/prompts/`:** Prompt templates are code, not strings. Each file exports a typed function that accepts structured data and returns a prompt. This enables versioning, testing, and per-tenant customization.
- **`src/lib/ai/schemas/`:** Zod schemas define the exact shape of AI output. The Vercel AI SDK's `generateObject` uses these to guarantee type-safe, validated responses from LLMs.
- **`src/lib/ai/pipelines/`:** Multi-step AI workflows that chain multiple LLM calls. These are orchestrated by Inngest for reliability (retries, state persistence) rather than running in a single API request.
- **`src/app/api/ai/`:** Thin API routes that validate auth, assemble context, and delegate to the AI service. Streaming routes use `streamText`/`streamObject` from Vercel AI SDK.

## Architectural Patterns

### Pattern 1: Tenant-Scoped Context Assembly

**What:** Every AI prompt is assembled from data that has been filtered by tenant_id at the database level, and the assembled context is validated by a guard function before being sent to the LLM.

**When to use:** Every single AI feature. No exceptions.

**Trade-offs:** Adds a validation step before each LLM call (negligible latency), but prevents the catastrophic risk of cross-tenant data leakage in AI responses.

**Example:**
```typescript
// src/lib/ai/guard.ts
export function validateTenantContext(
  tenantId: string,
  contextData: AIContextData
): AIContextData {
  // Verify all retrieved records belong to the requesting tenant
  for (const session of contextData.previousSessions) {
    if (session.tenantId !== tenantId) {
      throw new TenantIsolationError(
        `Session ${session.id} does not belong to tenant ${tenantId}`
      );
    }
  }
  for (const embedding of contextData.retrievedEmbeddings) {
    if (embedding.tenantId !== tenantId) {
      throw new TenantIsolationError(
        `Embedding ${embedding.id} does not belong to tenant ${tenantId}`
      );
    }
  }
  return contextData;
}

// src/lib/ai/context.ts
export async function assembleSessionContext(
  tenantId: string,
  seriesId: string,
  userId: string
): Promise<AIContextData> {
  // All queries filter by tenant_id (+ RLS as safety net)
  const previousSessions = await db.query.sessions.findMany({
    where: and(
      eq(sessions.seriesId, seriesId),
      eq(sessions.tenantId, tenantId),
      eq(sessions.status, 'completed')
    ),
    orderBy: [desc(sessions.completedAt)],
    limit: 5,
    with: { answers: true, actionItems: true }
  });

  const embeddings = await searchSimilarEmbeddings(
    tenantId, seriesId, queryVector, { limit: 10 }
  );

  const profile = await db.query.aiProfiles.findFirst({
    where: and(
      eq(aiProfiles.userId, userId),
      eq(aiProfiles.tenantId, tenantId)
    )
  });

  const contextData = { previousSessions, retrievedEmbeddings: embeddings, profile };

  // Guard: validate everything belongs to this tenant
  return validateTenantContext(tenantId, contextData);
}
```

### Pattern 2: Streaming AI Responses via Vercel AI SDK

**What:** Use Vercel AI SDK's `streamText` and `streamObject` in API routes to stream LLM responses directly to the browser. The client uses `useChat` or `useObject` hooks for real-time rendering.

**When to use:** Live suggestions during sessions, on-demand summary generation -- any feature where the user is waiting for AI output.

**Trade-offs:** Streaming adds complexity (partial state management on the client) but transforms perceived latency from 3-8 seconds of loading spinner to immediate progressive display.

**Example:**
```typescript
// src/app/api/ai/suggest/route.ts
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { assembleSessionContext } from '@/lib/ai/context';
import { buildLiveSuggestionPrompt } from '@/lib/ai/prompts/live-suggestion';

export async function POST(req: Request) {
  const { seriesId, currentAnswers, questionContext } = await req.json();
  const session = await getAuthSession();
  if (!session) return new Response('Unauthorized', { status: 401 });

  const context = await assembleSessionContext(
    session.tenantId, seriesId, session.userId
  );

  const prompt = buildLiveSuggestionPrompt(context, currentAnswers, questionContext);

  const result = streamText({
    model: openai('gpt-4o-mini'), // Use smaller model for live suggestions (speed + cost)
    system: prompt.system,
    messages: prompt.messages,
    maxTokens: 300,
  });

  return result.toDataStreamResponse();
}

// Client: src/components/session/ai-suggestion-panel.tsx
'use client';
import { useCompletion } from '@ai-sdk/react';

export function AISuggestionPanel({ seriesId, currentAnswers, questionContext }) {
  const { completion, isLoading, complete } = useCompletion({
    api: '/api/ai/suggest',
    body: { seriesId, currentAnswers, questionContext },
  });

  return (
    <div className="ai-suggestion-panel">
      {isLoading && <TypingIndicator />}
      {completion && <MarkdownRenderer content={completion} />}
    </div>
  );
}
```

### Pattern 3: Durable AI Pipelines via Inngest

**What:** Multi-step AI workflows (post-session summary + action item extraction + profile update + embedding generation) run as Inngest functions with automatic retries, state persistence, and step-level observability.

**When to use:** Any AI workflow that chains multiple LLM calls or combines LLM calls with database writes. Never chain 3+ LLM calls in a single API request.

**Trade-offs:** Adds Inngest dependency and slight latency (event dispatch + execution), but provides retry semantics, cost visibility, and prevents API route timeouts on Vercel (10-second limit on serverless functions).

**Example:**
```typescript
// src/lib/jobs/generate-summary.ts
import { inngest } from '@/lib/inngest/client';
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { sessionSummarySchema } from '@/lib/ai/schemas/summary';
import { buildSummaryPrompt } from '@/lib/ai/prompts/session-summary';
import { assembleSessionContext } from '@/lib/ai/context';

export const generateSessionSummary = inngest.createFunction(
  { id: 'generate-session-summary', retries: 3 },
  { event: 'session.completed' },

  async ({ event, step }) => {
    const { sessionId, seriesId, tenantId, reportUserId } = event.data;

    // Step 1: Assemble context (automatically retried on failure)
    const context = await step.run('assemble-context', async () => {
      return assembleSessionContext(tenantId, seriesId, reportUserId);
    });

    // Step 2: Generate summary via LLM
    const summary = await step.run('generate-summary', async () => {
      const prompt = buildSummaryPrompt(context);
      const { object } = await generateObject({
        model: openai('gpt-4o'),
        schema: sessionSummarySchema,
        system: prompt.system,
        prompt: prompt.user,
      });
      return object;
    });

    // Step 3: Extract suggested action items
    const actionItems = await step.run('extract-actions', async () => {
      const { object } = await generateObject({
        model: openai('gpt-4o-mini'),
        schema: suggestedActionsSchema,
        prompt: buildActionExtractionPrompt(context, summary),
      });
      return object;
    });

    // Step 4: Save results to database
    await step.run('save-results', async () => {
      await db.insert(aiInsights).values({
        sessionId, tenantId,
        insightType: 'session_summary',
        content: summary,
        suggestedActions: actionItems,
      });
    });

    // Step 5: Update embeddings for this session
    await step.run('update-embeddings', async () => {
      await generateAndStoreEmbeddings(tenantId, sessionId);
    });

    // Step 6: Incrementally update AI profile
    await step.run('update-profile', async () => {
      await updateAIProfile(tenantId, reportUserId, summary);
    });
  }
);
```

### Pattern 4: pgvector Embeddings in PostgreSQL (Same Database)

**What:** Store vector embeddings in the same PostgreSQL database using the pgvector extension. Use cosine similarity search to retrieve relevant historical context for AI prompts. No separate vector database needed.

**When to use:** Always for this scale. pgvector handles up to ~1M vectors comfortably. A separate vector database (Pinecone, Weaviate) adds operational complexity without benefit until you have millions of users.

**Trade-offs:** Simpler operations (one database), but pgvector's query performance degrades above ~1M vectors without careful HNSW index tuning. For a meeting SaaS, even at 10K users with 50 sessions each generating 5 embedding chunks, that is 250K vectors -- well within pgvector's sweet spot.

**Example:**
```typescript
// src/lib/db/schema/embeddings.ts
import { pgTable, uuid, text, integer, timestamp, index } from 'drizzle-orm/pg-core';
import { vector } from 'drizzle-orm/pg-core'; // pgvector support

export const sessionEmbeddings = pgTable('session_embedding', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  sessionId: uuid('session_id').notNull().references(() => sessions.id),
  seriesId: uuid('series_id').notNull().references(() => meetingSeries.id),
  userId: uuid('user_id').notNull().references(() => users.id),
  chunkType: text('chunk_type').notNull(), // 'answer', 'note', 'summary', 'action_item'
  chunkText: text('chunk_text').notNull(), // Original text that was embedded
  embedding: vector('embedding', { dimensions: 1536 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  tenantSeriesIdx: index('idx_embedding_tenant_series')
    .on(table.tenantId, table.seriesId),
  embeddingIdx: index('idx_embedding_hnsw')
    .using('hnsw', table.embedding.op('vector_cosine_ops')),
}));

// src/lib/ai/embeddings.ts
import { openai } from '@ai-sdk/openai';
import { embed } from 'ai';

export async function generateEmbedding(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model: openai.embedding('text-embedding-3-small'),
    value: text,
  });
  return embedding;
}

export async function searchSimilarEmbeddings(
  tenantId: string,
  seriesId: string,
  queryText: string,
  options: { limit?: number } = {}
) {
  const queryEmbedding = await generateEmbedding(queryText);
  const limit = options.limit ?? 10;

  // Cosine similarity search filtered by tenant + series
  return await db.execute(sql`
    SELECT id, chunk_type, chunk_text,
           1 - (embedding <=> ${queryEmbedding}::vector) as similarity
    FROM session_embedding
    WHERE tenant_id = ${tenantId}
      AND series_id = ${seriesId}
    ORDER BY embedding <=> ${queryEmbedding}::vector
    LIMIT ${limit}
  `);
}
```

### Pattern 5: AI Personal Profiles via Incremental Accumulation

**What:** Build a persistent AI-generated profile for each user by incrementally updating it after each session. The profile captures patterns, preferences, recurring themes, and growth trajectories -- not by storing all data in the profile, but by using it as a compressed summary that the LLM updates.

**When to use:** Pre-session nudges, live suggestions, growth narratives -- any feature that needs "what do we know about this person over time."

**Trade-offs:** Profile quality improves with more sessions (cold start problem for new users). Requires careful prompt engineering to avoid hallucination and maintain consistency across updates.

**Example:**
```typescript
// src/lib/db/schema/ai-profiles.ts
export const aiProfiles = pgTable('ai_profile', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  userId: uuid('user_id').notNull().references(() => users.id),
  profileData: jsonb('profile_data').notNull().$type<AIProfileData>(),
  sessionCount: integer('session_count').notNull().default(0),
  lastUpdatedFromSessionId: uuid('last_updated_from_session_id'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Type for structured profile data
interface AIProfileData {
  recurringThemes: string[];        // ["career growth concerns", "workload management"]
  communicationStyle: string;       // "Prefers direct feedback, responds well to examples"
  strengths: string[];              // ["Technical problem-solving", "Team collaboration"]
  growthAreas: string[];            // ["Time management", "Delegation"]
  recentMoodTrend: string;          // "Gradually improving over last 3 sessions"
  keyInsights: string[];            // ["Mentioned interest in leadership role twice"]
  lastNotableChange: string;        // "Engagement score dropped in last session"
}

// src/lib/ai/pipelines/profile-builder.ts
export async function updateAIProfile(
  tenantId: string,
  userId: string,
  latestSummary: SessionSummary
) {
  const existingProfile = await db.query.aiProfiles.findFirst({
    where: and(eq(aiProfiles.userId, userId), eq(aiProfiles.tenantId, tenantId)),
  });

  const { object: updatedProfile } = await generateObject({
    model: openai('gpt-4o'),
    schema: aiProfileSchema,
    system: `You are updating a personal profile for a team member based on their
      latest 1:1 meeting session. Merge new insights with the existing profile.
      Preserve important historical patterns. Remove outdated information.
      Be factual and specific -- never speculate or invent details.`,
    prompt: `
      Existing profile: ${JSON.stringify(existingProfile?.profileData ?? {})}
      Sessions completed: ${(existingProfile?.sessionCount ?? 0) + 1}

      Latest session summary:
      ${JSON.stringify(latestSummary)}

      Update the profile to incorporate insights from this latest session.
    `,
  });

  await db
    .insert(aiProfiles)
    .values({
      tenantId, userId,
      profileData: updatedProfile,
      sessionCount: (existingProfile?.sessionCount ?? 0) + 1,
    })
    .onConflictDoUpdate({
      target: [aiProfiles.tenantId, aiProfiles.userId],
      set: {
        profileData: updatedProfile,
        sessionCount: sql`ai_profile.session_count + 1`,
        updatedAt: new Date(),
      },
    });
}
```

## Data Flow

### Pre-Session Nudge Flow

```
Inngest Cron (24h before session)
    |
    v
Query: upcoming sessions for tomorrow
    |
    v
For each session:
    +-> Fetch AI profile for report user
    +-> Fetch last 3 session summaries (from ai_insights table)
    +-> Fetch open action items
    +-> Search embeddings for relevant past context
    |
    v
Validate tenant context (guard)
    |
    v
Assemble nudge prompt
    |
    v
generateObject() -> structured nudge (Zod-validated)
    |
    v
Save nudge to ai_insights table (type: 'pre_session_nudge')
    |
    v
(Optional) Send email digest with nudges
    |
    v
Manager sees nudges on dashboard / session prep screen
```

### Live Suggestion Flow (Real-Time)

```
User answers question in session wizard
    |
    v
Client Component debounces (500ms)
    |
    v
POST /api/ai/suggest (with current answers + question context)
    |
    v
API Route:
    +-> Authenticate + extract tenant_id
    +-> Assemble context (last 3 sessions + profile + relevant embeddings)
    +-> Validate tenant context (guard)
    +-> Build live suggestion prompt
    |
    v
streamText() -> SSE stream to browser
    |
    v
Client: useCompletion() renders streamed text progressively
    |
    v
Suggestion appears in AI panel beside the session wizard
```

### Post-Session AI Pipeline Flow

```
Manager marks session as completed
    |
    v
API route updates session.status = 'completed'
    |
    v
inngest.send({ name: 'session.completed', data: {...} })
    |
    v
Inngest triggers: generate-session-summary function
    |
    +-> Step 1: Assemble full context (all answers, notes, action items)
    +-> Step 2: Generate summary (generateObject with Zod schema)
    +-> Step 3: Extract suggested action items
    +-> Step 4: Save summary + suggestions to ai_insights table
    +-> Step 5: Generate embeddings for this session's content
    +-> Step 6: Incrementally update AI profile for the report user
    |
    v
Each step retries independently on failure
    |
    v
Summary visible on session summary page
Nudges will use this data for the next session
```

### Embedding Pipeline Flow

```
Session completed event (via Inngest)
    |
    v
Collect embeddable content:
    +-> Free-text answers (answer_text)
    +-> Shared notes
    +-> AI-generated summary
    +-> Action item titles + descriptions
    |
    v
Chunk content (by type, not by fixed size)
    |
    v
For each chunk:
    +-> Generate embedding via OpenAI text-embedding-3-small
    +-> Store in session_embedding table with tenant_id, series_id, user_id
    |
    v
HNSW index on embedding column enables fast similarity search
    |
    v
Future AI calls retrieve relevant chunks via cosine similarity
```

### Key Data Flows Summary

1. **Read path (page load):** Server Component -> Drizzle query (filtered by tenant_id + RLS) -> render HTML. AI data comes from pre-computed tables (ai_insights, ai_profiles), not live LLM calls.
2. **Write path (mutation):** Client Component -> API Route -> validate -> authorize -> write to DB -> trigger Inngest event for async AI processing.
3. **AI read path (live suggestion):** Client Component -> API Route -> assemble context -> guard -> streamText -> SSE -> progressive rendering.
4. **AI write path (background):** Inngest event -> multi-step function -> LLM calls with retries -> write results to ai_insights / ai_profiles / session_embeddings.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-1K users | Monolith is fine. pgvector handles ~50K embeddings easily. Use `gpt-4o-mini` for live suggestions (fast + cheap), `gpt-4o` for summaries (quality matters). Estimated ~$50-200/mo in LLM costs. |
| 1K-100K users | Add Redis/Upstash caching for AI profiles and pre-computed nudges. Batch embedding generation. Consider Vercel AI Gateway for rate limiting and provider failover. pgvector handles ~5M embeddings with HNSW indexes. LLM costs become significant -- implement per-tenant usage tracking and tiered limits. |
| 100K+ users | Extract AI service into separate deployment (still same codebase, different Vercel project). Consider dedicated vector database (Pinecone/Weaviate) if pgvector becomes a bottleneck. Implement prompt caching (Anthropic) or cached completions (OpenAI) for repeated context patterns. May need to shard embeddings by tenant for largest customers. |

### Scaling Priorities

1. **First bottleneck: LLM API costs and rate limits.** At ~500 sessions/day with post-session pipelines (3-4 LLM calls each), you hit OpenAI rate limits. Mitigation: use `gpt-4o-mini` where quality is acceptable, batch non-urgent calls, implement per-tenant usage quotas.
2. **Second bottleneck: Embedding search latency.** When a single series has 100+ sessions (2+ years of weekly meetings), embedding search slows down. Mitigation: HNSW index with appropriate `m` and `ef_construction` parameters, limit retrieval to top-10 chunks.
3. **Third bottleneck: Inngest function throughput.** At scale, many sessions complete simultaneously. Mitigation: Inngest handles this natively with concurrency controls and queuing. No custom infrastructure needed.

## Anti-Patterns

### Anti-Pattern 1: Sending Raw Tenant Data to LLMs Without Validation

**What people do:** Query the database, build a prompt, call the LLM -- without verifying all data in the prompt belongs to the requesting tenant.
**Why it's wrong:** A bug in a JOIN or a missing WHERE clause could leak another tenant's session data into an AI response. Unlike a UI leak (visible to one user), an AI response could quote or summarize another tenant's data verbatim.
**Do this instead:** Always run context through `validateTenantContext()` before prompt assembly. This is the AI equivalent of RLS -- defense in depth.

### Anti-Pattern 2: Chaining Multiple LLM Calls in a Single API Request

**What people do:** Call LLM to summarize, then call again to extract action items, then call again to update profile -- all in one API route handler.
**Why it's wrong:** Vercel serverless functions have a 10-second timeout (60s on Pro). Three sequential LLM calls easily exceed this. A failure in step 3 means steps 1-2 are wasted. No retry granularity.
**Do this instead:** Use Inngest `step.run()` for each LLM call. Each step retries independently, persists state, and has no timeout constraints.

### Anti-Pattern 3: Stuffing Entire Session History into Every Prompt

**What people do:** Load all historical sessions and dump them into the LLM context window for "maximum context."
**Why it's wrong:** Token costs scale linearly. A user with 100 sessions generates a prompt that costs 10-50x more than necessary. Context window limits get hit. LLM quality degrades with excessive context (lost in the middle problem).
**Do this instead:** Use embedding-based retrieval (pgvector) to find the 5-10 most relevant chunks. Combine with the AI profile (a compressed summary of all history) and the last 3 sessions. This provides better context at 1/10th the token cost.

### Anti-Pattern 4: Calling LLMs on Page Load

**What people do:** Generate AI insights in real-time when a user navigates to the dashboard or session prep page.
**Why it's wrong:** Adds 2-8 seconds to page load. Users see loading spinners. LLM failures break the page. Costs multiply with every page view.
**Do this instead:** Pre-compute AI insights in background jobs (Inngest). Store results in the database. Server Components read pre-computed data -- no LLM call, no loading state, instant rendering. Only use real-time LLM calls for interactive features where the user explicitly requests AI assistance (live suggestions during a session).

### Anti-Pattern 5: Per-Tenant Model Fine-Tuning

**What people do:** Fine-tune a model for each tenant to "personalize" the AI experience.
**Why it's wrong:** Operationally nightmarish. Cost per tenant skyrockets. Models need retraining as base models update. Marginal quality improvement over good prompt engineering with RAG.
**Do this instead:** Use the same base model for all tenants. Personalize through context: tenant-specific prompt templates (stored in DB), per-user AI profiles, and embedding-based retrieval. This achieves 90% of fine-tuning's benefit at 1% of the cost and operational complexity.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| **OpenAI API** | Via Vercel AI SDK provider (`@ai-sdk/openai`). `gpt-4o` for quality tasks (summaries, profiles), `gpt-4o-mini` for speed tasks (live suggestions). `text-embedding-3-small` for embeddings. | Primary LLM provider. Consider adding Anthropic (`@ai-sdk/anthropic`) as fallback. Vercel AI SDK makes provider switching a one-line change. |
| **Inngest** | Event-driven triggers from API routes. Multi-step functions for AI pipelines. Cron triggers for scheduled nudge generation. | Already in the stack for non-AI jobs. AI pipelines are the same pattern -- `step.run()` with retries. |
| **pgvector (Neon)** | Enable `vector` extension. Store 1536-dim embeddings alongside relational data. HNSW index for fast cosine similarity search. | Neon has pgvector pre-installed. No additional service to manage. Same connection pool, same RLS policies. |
| **Vercel AI Gateway** | Optional. Routes LLM requests through Vercel's gateway for rate limiting, caching, observability, and multi-provider failover. | Evaluate at 1K+ users. Not needed initially. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| **API Routes -> AI Service** | Direct function call. API route calls `assembleSessionContext()` then `streamText()`. | No network hop. Same process. AI Service is a library, not a service. |
| **API Routes -> Inngest** | Event dispatch via `inngest.send()`. Async, fire-and-forget from the API route's perspective. | API route returns immediately. Inngest handles the pipeline asynchronously. |
| **Inngest Jobs -> AI Service** | Direct function call within `step.run()`. Each step calls AI Service functions for context assembly and LLM interaction. | Same codebase. Inngest runs the function, AI Service provides the logic. |
| **AI Service -> Database** | Drizzle ORM queries. All queries include `tenant_id` filter. RLS policies as safety net. | AI reads from relational tables + pgvector. AI writes to ai_insights, ai_profiles, session_embeddings. |
| **AI Service -> LLM Provider** | Via Vercel AI SDK. `streamText()` for streaming, `generateObject()` for structured output, `embed()` for embeddings. | Provider-agnostic abstraction. Switch from OpenAI to Anthropic by changing one line. |

## New Database Tables for AI Layer

The AI layer requires three new tables beyond the existing schema:

| Table | Purpose | Populated By | Read By |
|-------|---------|-------------|---------|
| `session_embedding` | Vector embeddings of session content (answers, notes, summaries) for similarity search | Inngest job after session completion | AI context assembler (pre-session, live suggestions) |
| `ai_insight` | AI-generated content (summaries, nudges, suggested actions, growth narratives) | Inngest AI pipeline jobs | Server Components (dashboard, session prep, session summary) |
| `ai_profile` | Compressed, incrementally-updated AI profile per user | Inngest profile builder job | AI context assembler (all AI features) |

These tables follow the same multi-tenancy pattern: `tenant_id` column, RLS policies, indexed by tenant.

## Build Order (Dependencies)

The AI layer should be built in this order, where each phase depends on the previous:

1. **AI Service Foundation** (no dependencies beyond existing stack)
   - `src/lib/ai/` directory structure
   - LLM provider configuration (Vercel AI SDK + OpenAI)
   - Prompt registry with typed template functions
   - Zod output schemas
   - Tenant context guard

2. **Embedding Infrastructure** (depends on: AI Service Foundation)
   - Enable pgvector extension in Neon
   - `session_embedding` table schema
   - Embedding generation function (`embed()`)
   - Similarity search function
   - Inngest job: generate embeddings on session completion

3. **Post-Session AI Pipeline** (depends on: Embedding Infrastructure)
   - `ai_insight` table schema
   - Session summary generation (Inngest multi-step function)
   - Suggested action item extraction
   - Save + display on session summary page

4. **AI Personal Profiles** (depends on: Post-Session Pipeline)
   - `ai_profile` table schema
   - Incremental profile builder
   - Profile display in UI (read-only initially)

5. **Pre-Session Nudges** (depends on: Profiles + Embeddings)
   - Nudge generation Inngest job (cron-triggered)
   - Nudge display on dashboard and session prep

6. **Live Suggestions** (depends on: Profiles + Embeddings + Streaming)
   - Streaming API route (`/api/ai/suggest`)
   - Client-side suggestion panel with `useCompletion`
   - Debounced trigger based on answer input

7. **Growth Narratives** (depends on: Profiles + Analytics Snapshots)
   - Periodic narrative generation (monthly)
   - Integration with analytics dashboard

## Sources

- [Vercel AI SDK documentation](https://ai-sdk.dev/docs/introduction) -- HIGH confidence (official docs, current version 6.0)
- [Vercel AI SDK Getting Started with Next.js App Router](https://ai-sdk.dev/docs/getting-started/nextjs-app-router) -- HIGH confidence (official docs)
- [Inngest AI orchestration](https://www.inngest.com/ai) -- HIGH confidence (official docs)
- [Inngest: Running chained LLMs in production](https://www.inngest.com/blog/running-chained-llms-typescript-in-production) -- HIGH confidence (official blog)
- [Neon pgvector extension docs](https://neon.com/docs/extensions/pgvector) -- HIGH confidence (official docs, pgvector pre-installed in Neon)
- [Multi-Tenant RAG Architecture Patterns](https://www.maviklabs.com/blog/multi-tenant-rag-2026) -- MEDIUM confidence (third-party, well-structured analysis)
- [Microsoft: Multi-tenant AI/ML Architecture](https://learn.microsoft.com/en-us/azure/architecture/guide/multitenant/approaches/ai-ml) -- MEDIUM confidence (Azure-focused but patterns are universal)
- [Anthropic: Effective Context Engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) -- HIGH confidence (official engineering blog)
- [Context Window Management Strategies](https://www.getmaxim.ai/articles/context-window-management-strategies-for-long-context-ai-agents-and-chatbots/) -- MEDIUM confidence (third-party, multiple strategies documented)
- [pgvector PostgreSQL Guide 2025](https://dbadataverse.com/tech/postgresql/2025/12/pgvector-postgresql-vector-database-guide) -- MEDIUM confidence (third-party, verified against Neon docs)

---
*Architecture research for: AI-powered 1:1 meeting management SaaS*
*Researched: 2026-03-03*
