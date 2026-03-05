# Phase 7: AI Pipeline - Research

**Researched:** 2026-03-04
**Domain:** AI/LLM integration, background job pipelines, structured data generation
**Confidence:** HIGH

## Summary

Phase 7 adds the AI intelligence layer: post-session summaries, pre-session nudges, and action item suggestions. The stack is Vercel AI SDK v6 (latest: 6.0.111) with `@ai-sdk/anthropic` (latest: 3.0.54) for LLM calls, and Inngest (latest: 3.52.6) for durable background pipelines. Neither package is currently installed -- full setup from scratch is required.

The architecture is event-driven: the existing session completion API endpoint fires an Inngest event (`session/completed`), which triggers a multi-step durable function that generates the summary, manager addendum, action item suggestions, and base nudges. A separate cron-triggered function refreshes nudges 24h before upcoming sessions. All AI outputs use `generateText` with `Output.object()` (the AI SDK v6 pattern) and Zod schemas for type-safe structured responses.

**Primary recommendation:** Use AI SDK v6's `generateText` + `Output.object()` pattern (NOT the deprecated `generateObject`), Inngest multi-step functions with independent retry per step, and TanStack Query polling on the client for async result delivery. Store AI outputs as JSONB columns on the session table (summary, manager addendum) and a new `ai_nudge` table for nudges. Keep it simple: no embeddings, no streaming, no real-time -- just reliable background pipelines.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Summary format**: Structured sections -- Key Takeaways (3-5 bullets), Discussion Highlights (per-category paragraph), Follow-Up items
- **Shared + manager-only**: Shared summary visible to both parties; manager-only addendum with sentiment analysis and follow-up suggestions
- **Private notes feed addendum**: Manager's decrypted private notes feed the manager addendum; shared summary uses only shared content
- **Cross-session trends**: Summary references previous scores and recurring themes
- **Nudge placement**: Dashboard overview (as cards) AND wizard context panel sidebar
- **Nudge tone**: Gentle coaching -- "Consider asking about..." / "Last time Alex mentioned..."
- **Nudge count**: 2-3 per upcoming session
- **Nudge dismissible**: Manager can dismiss individual nudges; dismissed nudges don't reappear for that session
- **Two-phase nudge generation**: Post-session base generation + pre-session refresh 24h before next meeting
- **Action item suggestions**: Shown as suggestion cards in "AI Suggestions" section on session summary screen
- **Not auto-created**: Require explicit Accept, Edit+Accept, or Skip per suggestion
- **1-3 suggestions per session**
- **AI suggests assignee**: Based on context, manager can change before accepting
- **Skipped = gone**: No resurfacing, no nagging
- **Skeleton + streaming UX**: Summary screen loads immediately with skeleton "AI Suggestions" section, content fills in async via polling
- **Provider**: Anthropic Claude via Vercel AI SDK (`@ai-sdk/anthropic`)
- **Provider-agnostic**: Via Vercel AI SDK -- switching providers is a config change
- **No embeddings/pgvector for v1**: Use existing full-text search for AI context retrieval
- **Graceful degradation**: Session completion succeeds regardless of AI status; Inngest retries (3 attempts with backoff); fallback shows "AI summary unavailable" with manual retry button

### Claude's Discretion
- Model tier per task (Haiku vs Sonnet for summaries, nudges, action items)
- Prompt engineering and system prompt design for each pipeline
- Inngest function structure and event naming conventions
- Schema design for storing AI outputs
- Polling vs SSE for streaming AI results to the summary screen
- Dashboard nudge card layout and context panel nudge integration
- Pre-session refresh scheduling strategy (cron vs event-driven)

### Deferred Ideas (OUT OF SCOPE)
- pgvector embeddings -- deferred from v1
- Live AI suggestions during sessions -- v2
- AI personal profiles -- v2
- AI growth narratives -- v2
- AI anomaly detection -- v2
- Configurable AI provider per tenant
- AI-driven template generation
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AI-01 | After session completion, AI generates a concise narrative summary from structured answers and notes | Vercel AI SDK `generateText` + `Output.object()` with Zod schema; Inngest post-session pipeline triggered by `session/completed` event |
| AI-02 | AI summary is stored and viewable in session history and post-session email | JSONB columns `ai_summary` and `ai_manager_addendum` on session table; SessionSummaryView component already has AI placeholder |
| AI-03 | Before a session, AI generates 2-3 specific follow-up suggestions based on previous session answers | Pre-session nudge pipeline: two-phase (post-session base + cron refresh 24h before); `ai_nudge` table for storage |
| AI-04 | Pre-session nudges appear on the dashboard and in the pre-session state | Dashboard overview page (currently a stub) and wizard context panel are integration points |
| AI-05 | After session completion, AI suggests 1-3 action items based on session answers and discussion | Same post-session pipeline generates suggestions; stored as JSONB on session; client polling for async delivery |
| AI-06 | Embedding infrastructure (pgvector) stores session embeddings for context retrieval | DEFERRED per user decision -- use existing full-text search instead. Mark as N/A for v1 |
| AI-07 | AI features use Vercel AI SDK v6 with provider-agnostic model routing | AI SDK v6 (6.0.111) + @ai-sdk/anthropic (3.0.54); provider-agnostic via `anthropic()` model factory |
| AI-08 | AI pipelines run as durable Inngest background functions with automatic retry | Inngest 3.52.6; multi-step functions with `step.run()` for independent retry per step |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `ai` | ^6.0.111 | Vercel AI SDK -- generateText, Output.object, structured output | Unified LLM interface, provider-agnostic, Zod integration, official Vercel recommendation |
| `@ai-sdk/anthropic` | ^3.0.54 | Anthropic Claude provider for AI SDK | Official provider, supports Claude Haiku/Sonnet/Opus, auto-reads ANTHROPIC_API_KEY env |
| `inngest` | ^3.52.6 | Durable background functions, event-driven pipelines | First-class Next.js support, multi-step with independent retry, cron scheduling, local dev server |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `zod` | ^4.3.6 | Schema definition for AI structured output | Already installed -- reuse for Output.object() schemas and event type validation |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Inngest | BullMQ + Redis | BullMQ needs a Redis server; Inngest is serverless-native and works on Vercel with zero infrastructure |
| @ai-sdk/anthropic | Direct Anthropic SDK | Direct SDK lacks provider-agnostic routing; switching to OpenAI/Google would require rewriting all AI calls |
| Polling | Server-Sent Events (SSE) | SSE requires holding connections open; polling with TanStack Query is simpler, already in the codebase, and AI generation takes 5-15s (few polls) |

**Installation:**
```bash
bun add ai @ai-sdk/anthropic inngest
```

## Architecture Patterns

### Recommended Project Structure
```
src/
  inngest/
    client.ts              # Inngest client with typed event schemas
    functions/
      post-session.ts      # Post-session pipeline (summary, suggestions, base nudges)
      pre-session-nudges.ts # Cron: refresh nudges 24h before sessions
      index.ts             # Re-export all functions for serve route
  lib/
    ai/
      models.ts            # Model configuration (which model for which task)
      prompts/
        summary.ts         # System + user prompt builders for summary generation
        nudges.ts          # System + user prompt builders for nudge generation
        action-items.ts    # System + user prompt builders for action item suggestions
      schemas/
        summary.ts         # Zod schemas for AI summary output
        nudges.ts          # Zod schemas for nudge output
        action-items.ts    # Zod schemas for action item suggestion output
      context.ts           # Builds AI context from session data (answers, notes, history)
      service.ts           # Top-level AI service: generateSummary, generateNudges, generateActionSuggestions
  app/
    api/
      inngest/
        route.ts           # Inngest serve route (GET, POST, PUT)
      sessions/
        [id]/
          ai-summary/
            route.ts       # GET: fetch AI summary status/content (for polling)
          ai-suggestions/
            route.ts       # GET: fetch AI action item suggestions; POST: accept/skip
```

### Pattern 1: Event-Driven Post-Session Pipeline
**What:** Session completion fires an Inngest event; a multi-step durable function generates all AI outputs
**When to use:** After every session completion
**Example:**
```typescript
// src/inngest/client.ts
import { EventSchemas, Inngest } from "inngest";

type Events = {
  "session/completed": {
    data: {
      sessionId: string;
      seriesId: string;
      tenantId: string;
      managerId: string;
      reportId: string;
    };
  };
  "session/nudges.refresh": {
    data: {
      seriesId: string;
      tenantId: string;
      managerId: string;
      reportId: string;
      nextSessionAt: string;
    };
  };
};

export const inngest = new Inngest({
  id: "1on1",
  schemas: new EventSchemas().fromRecord<Events>(),
});
```

```typescript
// src/inngest/functions/post-session.ts
import { inngest } from "../client";

export const postSessionPipeline = inngest.createFunction(
  {
    id: "post-session-ai-pipeline",
    retries: 3,
    concurrency: [{ scope: "fn", limit: 5 }],
  },
  { event: "session/completed" },
  async ({ event, step }) => {
    // Step 1: Gather context (DB reads)
    const context = await step.run("gather-context", async () => {
      // Fetch session data, answers, notes, history
      return await gatherSessionContext(event.data);
    });

    // Step 2: Generate shared summary
    const summary = await step.run("generate-summary", async () => {
      return await generateSummary(context);
    });

    // Step 3: Generate manager addendum (uses private notes)
    const addendum = await step.run("generate-addendum", async () => {
      return await generateManagerAddendum(context);
    });

    // Step 4: Store summary + addendum
    await step.run("store-summary", async () => {
      await storeSummary(event.data.sessionId, summary, addendum);
    });

    // Step 5: Generate action item suggestions
    const suggestions = await step.run("generate-suggestions", async () => {
      return await generateActionSuggestions(context, summary);
    });

    // Step 6: Store suggestions
    await step.run("store-suggestions", async () => {
      await storeSuggestions(event.data.sessionId, suggestions);
    });

    // Step 7: Generate base nudges for next session
    const nudges = await step.run("generate-base-nudges", async () => {
      return await generateBaseNudges(context, summary);
    });

    // Step 8: Store nudges
    await step.run("store-nudges", async () => {
      await storeNudges(event.data.seriesId, nudges);
    });
  }
);
```

### Pattern 2: AI SDK v6 Structured Output with Zod
**What:** Use `generateText` + `Output.object()` with Zod schemas for type-safe AI responses
**When to use:** Every AI generation call
**Example:**
```typescript
// src/lib/ai/service.ts
import { generateText, Output } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { summarySchema } from "./schemas/summary";

export async function generateSummary(
  context: SessionContext
): Promise<AISummary> {
  const { output } = await generateText({
    model: anthropic("claude-sonnet-4-5"),
    output: Output.object({ schema: summarySchema }),
    system: buildSummarySystemPrompt(),
    prompt: buildSummaryUserPrompt(context),
  });
  return output;
}
```

### Pattern 3: Inngest Serve Route for Next.js App Router
**What:** Expose all Inngest functions via a single API route
**When to use:** Required for Inngest to discover and invoke functions
**Example:**
```typescript
// src/app/api/inngest/route.ts
import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { functions } from "@/inngest/functions";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions,
});
```

### Pattern 4: Client-Side Polling for Async AI Results
**What:** TanStack Query polls an API endpoint until AI results are ready
**When to use:** Session summary page after completion (AI takes 5-15s)
**Example:**
```typescript
// Client component on session summary page
const { data: aiSummary } = useQuery({
  queryKey: ["ai-summary", sessionId],
  queryFn: () => fetch(`/api/sessions/${sessionId}/ai-summary`).then(r => r.json()),
  refetchInterval: (query) =>
    query.state.data?.status === "completed" ? false : 3000,
  enabled: status === "completed",
});
```

### Anti-Patterns to Avoid
- **Blocking session completion on AI:** The completion API must return immediately. AI runs in background via Inngest. Never await AI generation in the completion endpoint.
- **Single monolithic Inngest step:** Split into independent steps (gather, generate summary, generate addendum, store, generate suggestions, store). Each retries independently -- if storing the summary fails, it doesn't re-run the LLM call.
- **Hardcoded model strings:** Use a central `models.ts` config that maps task -> model. Makes it easy to upgrade models or switch providers.
- **Exposing private notes in shared summary:** The shared summary prompt must only receive shared content (answers, shared notes, talking points). Private notes only feed the manager addendum prompt.
- **Using generateObject (deprecated in v6):** Use `generateText` with `Output.object()` instead. The older `generateObject` function still exists but the v6 pattern is the recommended path forward.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Retry logic for AI calls | Custom retry with exponential backoff | Inngest `step.run()` with `retries: 3` | Each step retries independently; Inngest handles backoff, dead-letter, observability |
| Background job scheduling | setTimeout/setInterval or custom queue | Inngest cron triggers | Durable, survives process restarts, works on serverless (Vercel) |
| Structured AI output parsing | Manual JSON.parse + validation | AI SDK `Output.object()` + Zod | SDK handles JSON mode, tool-call mode, validation, error types automatically |
| Provider abstraction layer | Custom wrapper around Anthropic SDK | Vercel AI SDK provider system | One-line provider swap; community maintains 100+ providers |
| Polling infrastructure | Custom WebSocket server or SSE endpoint | TanStack Query `refetchInterval` | Already in the codebase; 3-second poll for a 5-15s operation is perfectly fine |

**Key insight:** The entire AI pipeline is glue code between well-established libraries. The value is in the prompt engineering and data assembly, not in infrastructure. Let Inngest handle durability and the AI SDK handle LLM abstraction.

## Common Pitfalls

### Pitfall 1: Token Limit Overflow
**What goes wrong:** Session with many answers, long notes, and 3 sessions of history exceeds context window
**Why it happens:** Claude Haiku has 200K tokens but the prompt must leave room for the response
**How to avoid:** Truncate context intelligently -- limit history to last 3 sessions, cap individual text answers at 500 chars, cap notes at 1000 chars. Calculate approximate token count (1 token ~ 4 chars for English) before calling the API.
**Warning signs:** AI_NoObjectGeneratedError or truncated/incoherent outputs

### Pitfall 2: Inngest Function Not Found in Dev
**What goes wrong:** Inngest Dev Server can't find functions, shows empty function list
**Why it happens:** The serve route isn't registering functions, or the dev server URL doesn't match
**How to avoid:** Ensure `INNGEST_DEV=1` is set, the dev server runs on port 8288, and the Next.js app is serving at the expected URL. The Inngest Dev Server auto-discovers functions by calling the serve route's GET endpoint.
**Warning signs:** Empty function list in Inngest Dev Server UI at localhost:8288

### Pitfall 3: Private Note Decryption in Background Jobs
**What goes wrong:** Inngest function can't decrypt private notes because it doesn't have user context
**Why it happens:** `decryptNote()` needs `tenantId` (for key derivation), and the Inngest function runs outside a user request
**How to avoid:** Pass `tenantId` in the event data. The `decryptNote` function only needs the `tenantId` and `keyVersion` from the payload -- it doesn't need the full tenant context. For DB access in Inngest functions, use `adminDb` (bypasses RLS) since we've already validated the user at the API level when the event was sent. Alternatively, use `withTenantContext` with the managerId from the event.
**Warning signs:** Decryption errors in Inngest function logs

### Pitfall 4: Race Condition Between Completion and AI Polling
**What goes wrong:** Client polls for AI summary before the Inngest event has even been processed
**Why it happens:** Network latency between completion response and Inngest event delivery
**How to avoid:** The polling endpoint should return a clear status: `{ status: "pending" | "generating" | "completed" | "failed" }`. The client shows a skeleton when status is "pending" or "generating". The session table can have an `ai_status` enum column.
**Warning signs:** Users see "AI unavailable" when the pipeline simply hasn't started yet

### Pitfall 5: Stale Context in Nudge Refresh
**What goes wrong:** Pre-session nudges reference action items that have already been completed
**Why it happens:** Base nudges generated post-session become stale as action items are updated
**How to avoid:** The 24h refresh cron re-fetches current action item statuses. The refresh overwrites base nudges with fresh ones.
**Warning signs:** Nudges suggesting follow-up on completed action items

### Pitfall 6: Inngest withTenantContext vs adminDb
**What goes wrong:** Inngest function uses `withTenantContext` but there's no authenticated session
**Why it happens:** Background functions don't have a request context or auth session
**How to avoid:** Two options: (1) Use `adminDb` directly since the event data already contains validated tenant/user IDs from the original authenticated request, or (2) Use `withTenantContext(tenantId, managerId, ...)` by passing IDs from the event. Option 2 is safer -- it preserves RLS guarantees even in background jobs.
**Warning signs:** RLS policy violations or missing data in Inngest function results

## Code Examples

### AI Summary Zod Schema
```typescript
// src/lib/ai/schemas/summary.ts
import { z } from "zod";

export const summarySchema = z.object({
  keyTakeaways: z
    .array(z.string())
    .min(2)
    .max(5)
    .describe("3-5 key takeaways from the session as bullet points"),
  discussionHighlights: z
    .array(
      z.object({
        category: z.string().describe("The category/section name"),
        summary: z.string().describe("1-2 paragraph summary of the discussion in this category"),
      })
    )
    .describe("Per-category discussion highlights"),
  followUpItems: z
    .array(z.string())
    .max(5)
    .describe("Items that need follow-up or attention"),
  overallSentiment: z
    .enum(["positive", "neutral", "mixed", "concerning"])
    .describe("Overall tone of the session"),
});

export type AISummary = z.infer<typeof summarySchema>;
```

### Manager Addendum Zod Schema
```typescript
// src/lib/ai/schemas/addendum.ts
import { z } from "zod";

export const managerAddendumSchema = z.object({
  sentimentAnalysis: z
    .string()
    .describe("Brief analysis of the report's emotional state and engagement level"),
  patterns: z
    .array(z.string())
    .max(3)
    .describe("Recurring themes or patterns noticed across sessions"),
  coachingSuggestions: z
    .array(z.string())
    .max(3)
    .describe("Suggestions for the manager to improve support for this report"),
  followUpPriority: z
    .enum(["low", "medium", "high"])
    .describe("How urgently the manager should follow up on this session"),
});

export type AIManagerAddendum = z.infer<typeof managerAddendumSchema>;
```

### Nudge Zod Schema
```typescript
// src/lib/ai/schemas/nudges.ts
import { z } from "zod";

export const nudgesSchema = z.object({
  nudges: z
    .array(
      z.object({
        content: z.string().describe("The nudge text in coaching tone"),
        reason: z.string().describe("Brief explanation of why this nudge is relevant"),
        priority: z.enum(["high", "medium", "low"]),
        sourceSessionId: z.string().optional().describe("Session ID that triggered this nudge"),
      })
    )
    .min(2)
    .max(3)
    .describe("2-3 pre-session nudges for the manager"),
});

export type AINudges = z.infer<typeof nudgesSchema>;
```

### Action Item Suggestion Schema
```typescript
// src/lib/ai/schemas/action-items.ts
import { z } from "zod";

export const actionSuggestionsSchema = z.object({
  suggestions: z
    .array(
      z.object({
        title: z.string().max(200).describe("Clear, actionable title for the action item"),
        description: z.string().max(500).describe("Brief description with context"),
        suggestedAssignee: z
          .enum(["manager", "report"])
          .describe("Who should own this action item"),
        reasoning: z.string().describe("Why this action item was suggested"),
      })
    )
    .min(1)
    .max(3)
    .describe("1-3 suggested action items based on session content"),
});

export type AIActionSuggestions = z.infer<typeof actionSuggestionsSchema>;
```

### Model Configuration
```typescript
// src/lib/ai/models.ts
import { anthropic } from "@ai-sdk/anthropic";

// Model tier per task -- optimize for quality/cost balance
export const models = {
  // Summaries need quality -- use Sonnet
  summary: anthropic("claude-sonnet-4-5"),
  // Manager addendum needs nuance -- use Sonnet
  managerAddendum: anthropic("claude-sonnet-4-5"),
  // Nudges are shorter, less complex -- Haiku is sufficient
  nudges: anthropic("claude-haiku-4-5"),
  // Action item suggestions need accuracy -- use Sonnet
  actionSuggestions: anthropic("claude-sonnet-4-5"),
} as const;
```

### Event Dispatch from Completion Endpoint
```typescript
// Addition to src/app/api/sessions/[id]/complete/route.ts
// After the existing audit log and before returning response:
import { inngest } from "@/inngest/client";

// Fire-and-forget -- don't await, don't block completion
inngest.send({
  name: "session/completed",
  data: {
    sessionId,
    seriesId: series.id,
    tenantId: session.user.tenantId,
    managerId: series.managerId,
    reportId: series.reportId,
  },
});
```

### Database Schema Additions
```typescript
// Addition to src/lib/db/schema/sessions.ts
// New columns on sessions table:
aiSummary: jsonb("ai_summary").$type<AISummary | null>(),
aiManagerAddendum: jsonb("ai_manager_addendum").$type<AIManagerAddendum | null>(),
aiSuggestions: jsonb("ai_suggestions").$type<AIActionSuggestions | null>(),
aiStatus: text("ai_status").$type<"pending" | "generating" | "completed" | "failed">().default("pending"),
aiCompletedAt: timestamp("ai_completed_at", { withTimezone: true }),

// New table: ai_nudge
export const aiNudges = pgTable("ai_nudge", {
  id: uuid("id").primaryKey().defaultRandom(),
  seriesId: uuid("series_id").notNull().references(() => meetingSeries.id),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  targetSessionAt: timestamp("target_session_at", { withTimezone: true }),
  content: text("content").notNull(),
  reason: text("reason"),
  priority: text("priority").$type<"high" | "medium" | "low">().default("medium"),
  sourceSessionId: uuid("source_session_id").references(() => sessions.id),
  isDismissed: boolean("is_dismissed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  refreshedAt: timestamp("refreshed_at", { withTimezone: true }),
}, (table) => [
  index("ai_nudge_series_target_idx").on(table.seriesId, table.targetSessionAt),
  index("ai_nudge_tenant_dismissed_idx").on(table.tenantId, table.isDismissed),
]);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `generateObject()` standalone function | `generateText()` + `Output.object()` | AI SDK v6 (late 2025) | Unified API; structured output works with tool calling loops |
| Inngest EventSchemas with Zod | EventSchemas with `fromRecord<T>()` or Standard Schema | Inngest SDK 3.42+ (Sep 2025) | Zod 4 / Valibot / ArkType all supported for event validation |
| Custom retry/backoff for LLM calls | Inngest `step.run()` with configurable retries | Inngest architecture | Zero custom retry code; each step retries independently |
| Claude claude-3-5-sonnet | Claude claude-sonnet-4-5 / claude-haiku-4-5 | 2025 | Newer model names; improved quality; same API |

**Deprecated/outdated:**
- `generateObject()` from AI SDK v4/v5: Still functional but the v6 `Output.object()` pattern is the recommended approach
- Inngest `EventSchemas.fromZod()`: Replaced by `fromRecord<T>()` with TypeScript types or Standard Schema support

## Open Questions

1. **Model tier for summaries: Haiku vs Sonnet**
   - What we know: Sonnet produces higher quality but costs ~10x more than Haiku; summaries need nuance
   - What's unclear: Whether Haiku's quality is sufficient for session summaries at this use case
   - Recommendation: Start with Sonnet for summaries/addendum/suggestions, Haiku for nudges. Monitor quality and cost. Easy to swap via `models.ts` config.

2. **Nudge refresh: cron vs event-driven**
   - What we know: Post-session base generation is event-driven. The 24h refresh needs a trigger.
   - What's unclear: Cron checking all upcoming sessions vs individual scheduled events
   - Recommendation: Use Inngest cron (e.g., `0 */6 * * *` -- every 6 hours) that checks for sessions in the next 24h. Simpler than scheduling individual events per session. The cron does a DB query, finds sessions needing refresh, and fires individual `session/nudges.refresh` events.

3. **DB access pattern in Inngest functions**
   - What we know: Inngest functions run outside request context. Two options: `adminDb` or `withTenantContext` with IDs from event.
   - What's unclear: Whether to bypass RLS in background jobs or preserve it
   - Recommendation: Use `withTenantContext(tenantId, managerId, ...)` from event data. This preserves RLS guarantees. The managerId serves as the userId for private note RLS. Only use `adminDb` for cross-tenant queries in the cron function.

## Sources

### Primary (HIGH confidence)
- [AI SDK v6 Official Docs](https://ai-sdk.dev/docs/introduction) - generateText, Output.object, structured data generation
- [AI SDK Anthropic Provider](https://ai-sdk.dev/providers/ai-sdk-providers/anthropic) - model names, configuration, env vars
- [Inngest Next.js Quick Start](https://www.inngest.com/docs/getting-started/nextjs-quick-start) - serve route, client, function creation
- [Inngest Multi-Step Functions](https://www.inngest.com/docs/guides/multi-step-functions) - step.run, step.sleep, retry behavior
- [Inngest TypeScript Docs](https://www.inngest.com/docs/typescript) - typed events, EventSchemas, fromRecord
- npm registry: `ai@6.0.111`, `@ai-sdk/anthropic@3.0.54`, `inngest@3.52.6` (all verified 2026-03-04)

### Secondary (MEDIUM confidence)
- [AI SDK 6 Blog Post](https://vercel.com/blog/ai-sdk-6) - v6 breaking changes, migration, Output pattern
- [Inngest Cron Guide](https://www.inngest.com/docs/guides/scheduled-functions) - cron trigger syntax, timezone support
- [Inngest Concurrency/Retry Docs](https://www.inngest.com/docs/guides/concurrency) - concurrency limits, throttling

### Tertiary (LOW confidence)
- Model quality comparison (Haiku vs Sonnet for this use case) -- needs empirical testing during implementation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - versions verified on npm, official docs consulted, API patterns confirmed
- Architecture: HIGH - all patterns drawn from official documentation; integration points verified in existing codebase
- Pitfalls: HIGH - based on documented Inngest behavior and known AI SDK error types
- Prompt engineering: MEDIUM - schema design is sound but prompt quality needs iteration during implementation
- Model tier selection: LOW - cost/quality tradeoff needs empirical validation

**Research date:** 2026-03-04
**Valid until:** 2026-04-04 (30 days -- AI SDK and Inngest are actively maintained but core APIs are stable)
