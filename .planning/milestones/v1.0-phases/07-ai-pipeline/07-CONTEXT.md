# Phase 7: AI Pipeline - Context

**Gathered:** 2026-03-04
**Status:** Ready for planning

<domain>
## Phase Boundary

AI generates session summaries and pre-meeting nudges, proving the "AI-first" positioning with reliable background pipelines. After session completion, AI produces a structured summary (shared) with a manager-only addendum, suggests action items for accept/edit/skip, and generates pre-session nudges for upcoming meetings. All AI pipelines run as durable Inngest background functions with Vercel AI SDK. Does NOT include: live AI suggestions during sessions (v2), AI personal profiles (v2), analytics/dashboards (Phase 8), email notifications (Phase 9).

</domain>

<decisions>
## Implementation Decisions

### Summary format & audience
- Structured sections format: Key Takeaways (3-5 bullets), Discussion Highlights (per-category paragraph), Follow-Up items
- Shared summary visible to both manager and report
- Manager-only addendum section with sentiment analysis and follow-up suggestions — visible only to the manager
- Manager's private notes (decrypted) feed into the manager addendum; shared summary uses only shared content (answers, shared notes, talking points)
- Cross-session trends included — summary references previous scores and recurring themes (e.g., "Wellbeing improved from 3.2 to 4.1")

### Pre-session nudges
- Appear on dashboard overview (as cards) AND in the wizard context panel sidebar
- Gentle coaching tone: "Consider asking about..." / "Last time Alex mentioned... — worth following up?"
- 2-3 nudges per upcoming session (per AI-03)
- Dismissible — manager can dismiss individual nudges; dismissed nudges don't reappear for that session
- Two-phase generation: post-session base generation (alongside summary) + pre-session refresh 24h before next meeting with latest data (action item updates, etc.)

### Action item suggestions
- Shown as suggestion cards in an "AI Suggestions" section on the session summary screen after completion
- Not auto-created — require explicit Accept, Edit+Accept, or Skip per suggestion
- 1-3 suggestions per session (per AI-05)
- AI suggests assignee (manager or report) based on context — manager can change before accepting
- Skipped suggestions are gone permanently — no resurfacing, no nagging
- Skeleton + streaming UX: summary screen loads immediately with skeleton "AI Suggestions" section, content fills in async (~5-15s) via polling when Inngest pipeline completes

### AI provider & model
- Default provider: Anthropic Claude via Vercel AI SDK (`@ai-sdk/anthropic`)
- Provider-agnostic routing via Vercel AI SDK (per AI-07) — switching providers is a config change
- No embeddings/pgvector for v1 — use existing PostgreSQL full-text search (Phase 6) for AI context retrieval
- Graceful degradation: session completion succeeds regardless of AI status; Inngest handles retries (3 attempts with backoff); final fallback shows "AI summary unavailable" with manual retry button
- No OpenAI API key needed for v1 (embeddings deferred)

### Claude's Discretion
- Model tier per task (Haiku vs Sonnet for summaries, nudges, action items) — optimize for quality/cost balance
- Prompt engineering and system prompt design for each pipeline
- Inngest function structure and event naming conventions
- Schema design for storing AI outputs (ai_summary column, nudges table, suggestion records)
- Polling vs SSE for streaming AI results to the summary screen
- Dashboard nudge card layout and context panel nudge integration
- Pre-session refresh scheduling strategy (cron vs event-driven)

</decisions>

<specifics>
## Specific Ideas

- "AI-generated meeting minutes are the north star for the summary screen" (from Phase 5 discussion) — the structured sections format is the v1 implementation of this vision
- Manager addendum is the "private debrief" — sentiment analysis, pattern detection, coaching suggestions that the manager doesn't share with the report
- Nudges should feel like having a thoughtful assistant who read your last meeting notes — not an alert system
- The session completion flow must never be blocked by AI — if AI is slow or down, the user experience is identical minus the AI sections
- Phase 5 built "structured recap" on session first screen; Phase 7's AI summary replaces/augments this with intelligent narrative
- Phase 6's "AI summary placeholder" on session summary page is the exact integration point for the shared summary

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- Session completion API (`src/app/api/sessions/[id]/complete/route.ts`): Clean hook point after audit log write — fire Inngest event here
- Session summary page (`src/app/(dashboard)/sessions/[id]/summary/page.tsx`): Assembles full session view (sections, questions+answers, notes, action items) — same query pattern feeds the AI prompt
- `SessionSummaryView` component: Receives structured data props, needs AI summary prop wired in
- Private note decryption (`src/lib/encryption/private-notes.ts`): `decryptNote()` utility for manager addendum pipeline
- Full-text search API (`src/app/api/search/route.ts`): Uses `websearch_to_tsquery` with GIN indexes — reusable for AI context retrieval instead of embeddings
- Dashboard overview page (`src/app/(dashboard)/overview/page.tsx`): Currently a stub — clean slate for nudge cards
- `withTenantContext()` wrapper: AI service layer must use this for all DB access
- `logAuditEvent()`: AI operations should be audit-logged (summary generated, nudges generated)

### Established Patterns
- Inngest not yet installed — full setup needed (client, serve route, function files)
- Vercel AI SDK not yet installed — needs `ai` + `@ai-sdk/anthropic`
- API route pattern: auth check -> RBAC guard -> Zod validation -> withTenantContext -> audit log
- TanStack Query for client-side data fetching — polling for AI results fits this pattern
- Server Component data fetch + Client Component interactivity (summary page uses this)

### Integration Points
- Session completion endpoint: add Inngest event dispatch (`session/completed`)
- Session summary page: add AI summary section (shared + manager addendum)
- Dashboard overview: add nudge cards for upcoming sessions
- Wizard context panel: add nudge display alongside existing structured context
- New env vars needed: `ANTHROPIC_API_KEY`, `INNGEST_SIGNING_KEY`, `INNGEST_EVENT_KEY`
- New DB columns: `aiSummary`, `aiManagerAddendum` on session table; new `ai_nudge` table for nudge storage
- Inngest serve route: `src/app/api/inngest/route.ts`
- Inngest functions: `src/lib/jobs/` directory (post-session pipeline, pre-session nudge pipeline)

</code_context>

<deferred>
## Deferred Ideas

- **pgvector embeddings** — Deferred from v1 scope. Full-text search sufficient for AI context retrieval at v1 scale. Add when semantic search proves necessary for quality improvements.
- **Live AI suggestions during sessions** — v2 feature (AI-V2-01). Requires streaming, low latency, and real-time context. Separate from the background pipeline approach.
- **AI personal profiles** — v2 feature (AI-V2-02). Built from accumulated session data over time.
- **AI growth narratives** — v2 feature (AI-V2-03). "Over Q1, Alex improved communication by 23%..."
- **AI anomaly detection** — v2 feature (AI-V2-04). Proactive alerts for score drops.
- **Configurable AI provider per tenant** — Admin picks provider in org settings. Deferred to when multiple providers are validated.
- **AI-driven template generation** — From Phase 5 deferred ideas. AI conducts a dynamic questionnaire to generate tailored templates.

</deferred>

---

*Phase: 07-ai-pipeline*
*Context gathered: 2026-03-04*
