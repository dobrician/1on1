# Phase 6: Action Items & Session History - Research

**Researched:** 2026-03-04
**Domain:** Action item management, session history browsing, full-text search, command palette
**Confidence:** HIGH

## Summary

Phase 6 adds two major feature areas to a well-established codebase: (1) action item management with a dedicated cross-series view and carry-over display, and (2) session history browsing with read-only detail views and full-text search. The codebase already has substantial infrastructure for both -- action item schema, CRUD API, inline creation component, context panel display, and session timeline. The work is primarily new pages, new API endpoints, and enhancing existing components.

The most technically significant addition is full-text search. PostgreSQL's built-in `tsvector`/`tsquery` with GIN indexes is the right approach -- no external search service needed at this scale. The command palette uses `cmdk` (already installed, shadcn/ui `Command` component already present). The generated column approach for tsvector is cleanest with Drizzle ORM.

**Primary recommendation:** Build on existing patterns (Server Component data fetch, Client Component interactivity, TanStack Query mutations). Use PostgreSQL native full-text search with generated tsvector columns and GIN indexes. Use the existing shadcn/ui Command component for the command palette. Keep action item status as a simple Open/Done toggle in the UI while preserving the 4-state enum in the database.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Dedicated top-level nav item: "Action Items" page showing all open items across all series
- Items grouped by series (report name) on the dedicated page
- Simple status toggle: Open or Done (two states only, not the full 4-state flow)
- Action items are always editable after session completion -- title, description, assignee, due date, status can be updated anytime
- Overdue items surfaced prominently within each series group
- No explicit carry-over mechanism -- open items are queried by series + status (always visible, not copied)
- `carriedToSessionId` column in schema not used for linking; open items from any session in the series appear in the context panel
- Items show a "from Session #X" badge with age/overdue indicator in the wizard context panel
- Items persist until explicitly marked done or cancelled -- no auto-expiry
- Clicking a completed session opens a summary page (single scrollable page, not a wizard replay)
- Summary shows everything: all answers grouped by category, shared notes, action items created, session score, duration, date
- Action items on summary page show current/live status (not historical snapshot)
- AI summary placeholder section included -- ready for Phase 7 to populate
- In-progress (abandoned) sessions appear in timeline with a direct "Resume" button that reopens the wizard
- Both manager and report can view session history, but report does not see private notes or manager-only fields
- Session comparison deferred to Phase 8 analytics
- Separate top-level nav item: "History" -- distinct from the "Sessions" (series card grid) page
- Sessions grouped by series, with a score trend sparkline per series group header
- Each session row shows: session number, date, score, status, duration
- Search bar + filters on the History page for focused browsing (date range, status, series/report)
- Global universal search accessible from anywhere via Cmd+K
- Searches everything text-based: session notes, talking points, free-text answers, action item titles/descriptions, templates, people
- Role-based visibility -- users only see results they have access to
- Search results show inline preview snippet, clicking navigates to full session summary or relevant page
- Results grouped by type (sessions, action items, templates, people)
- History page has its own search bar in addition to command palette
- Filters: date range, session status (completed/in-progress), series/report
- Full-text search covers: shared notes, talking points, free-text answers, action item titles/descriptions

### Claude's Discretion
- Command palette component implementation (cmdk library or custom)
- Full-text search implementation approach (PostgreSQL tsvector vs application-level)
- Action items page layout details (table vs cards, sorting options)
- Session summary page layout and typography
- History page pagination approach
- Empty states across all new pages
- Mobile responsive behavior for command palette and new pages

### Deferred Ideas (OUT OF SCOPE)
- Session comparison side-by-side -- Phase 8 analytics feature
- Action item velocity charts -- Phase 8 analytics
- Auto-cancel stale action items -- keep showing until resolved
- Background carry-over job -- not needed since items are queried live by series + status
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ACTN-01 | User can create action items with title, description, assignee, and optional due date | Existing `createActionItemSchema` + POST API. Needs expansion for description field and standalone (non-wizard) creation. |
| ACTN-02 | Action items track status: Open -> In Progress -> Completed / Cancelled | Schema has 4-state enum. CONTEXT simplifies UI to Open/Done toggle. DB retains full enum for future use. |
| ACTN-03 | Unfinished action items automatically carry over and appear flagged in next session's context panel | Context panel already shows open items grouped by session number. Need to add overdue indicator and age badge per CONTEXT. |
| ACTN-04 | Dedicated list view shows all open action items across all series | New `/action-items` page. Server Component fetch of all open items for user's visible series. Group by series. |
| ACTN-05 | Action items are visible in session wizard context panel during future sessions | Already implemented in `ContextPanel`. Needs minor enhancement for overdue styling. |
| HIST-01 | User can view chronological timeline of all sessions in a series | `SessionTimeline` component exists. Needs click-through to session summary. |
| HIST-02 | User can open read-only detail view of completed session (answers, notes, action items) | New `/sessions/[id]/summary` route. Reuses summary-screen patterns. |
| HIST-03 | User can search across session notes and talking points (full-text search) | PostgreSQL tsvector with GIN indexes. Command palette + History page search. |
| HIST-04 | User can filter sessions by date range and status | History page with URL-based filters. Server-side query with Drizzle where clauses. |
</phase_requirements>

## Standard Stack

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js 16 | 16.1.6 | App Router, Server/Client Components | Project framework |
| Drizzle ORM | 0.38.4 | PostgreSQL queries, schema, migrations | Project ORM |
| TanStack Query | 5.90.21 | Client-side data fetching, mutations, cache | Project state management |
| cmdk | 1.1.1 | Command palette headless component | Already installed, powers shadcn/ui Command |
| Recharts | 3.7.0 | Score sparklines in History page | Already used for sparklines |
| shadcn/ui | 3.8.5 | UI primitives (Command, Dialog, Badge, etc.) | Project UI framework |

### Supporting (Already Available)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @tanstack/react-table | 8.21.3 | Table sorting/filtering for action items list | Action Items page if table layout chosen |
| Zod | 4.3.6 | Validation schemas for search/filter params | New API validation |
| lucide-react | 0.576.0 | Icons | All new UI |
| sonner | 2.0.7 | Toast notifications | Mutation feedback |

### No New Dependencies Needed
The command palette uses `cmdk` (already installed). Full-text search uses PostgreSQL native features (no library). All UI components available via shadcn/ui. No new packages to install.

## Architecture Patterns

### New Route Structure
```
src/app/
  (dashboard)/
    action-items/
      page.tsx                   # Dedicated action items list (ACTN-04)
    history/
      page.tsx                   # Global history page (HIST-01, HIST-04)
    sessions/
      [id]/
        summary/
          page.tsx               # Read-only session detail (HIST-02)
  api/
    action-items/
      route.ts                   # GET all open items, PATCH status toggle
      [id]/
        route.ts                 # PATCH individual item (edit fields)
    search/
      route.ts                   # Full-text search API for command palette
    history/
      route.ts                   # GET sessions with filters for history page

src/components/
  action-items/
    action-items-page.tsx        # Client component for Action Items page
    action-item-row.tsx          # Individual item row with toggle
  history/
    history-page.tsx             # Client component with filters
    session-summary.tsx          # Read-only session detail
  search/
    command-palette.tsx          # Global Cmd+K search
```

### Pattern 1: Action Items API (Cross-Series Query)
**What:** New `/api/action-items` endpoint that queries action items across all series the user participates in.
**When to use:** Action Items page, dashboard (future Phase 8).
**Key decision:** The user decided items are always editable. The existing PATCH endpoint under `/api/sessions/[id]/action-items` is tied to a specific session. Need a new standalone `/api/action-items/[id]` endpoint that validates the user is a participant in the item's series.

```typescript
// Query pattern: all open action items visible to the current user
const openItems = await tx
  .select({
    id: actionItems.id,
    title: actionItems.title,
    description: actionItems.description,
    status: actionItems.status,
    dueDate: actionItems.dueDate,
    assigneeId: actionItems.assigneeId,
    sessionId: actionItems.sessionId,
    createdAt: actionItems.createdAt,
    // Join session -> series for grouping
    seriesId: sessions.seriesId,
    sessionNumber: sessions.sessionNumber,
  })
  .from(actionItems)
  .innerJoin(sessions, eq(actionItems.sessionId, sessions.id))
  .innerJoin(meetingSeries, eq(sessions.seriesId, meetingSeries.id))
  .where(
    and(
      eq(actionItems.tenantId, tenantId),
      or(
        eq(actionItems.status, "open"),
        eq(actionItems.status, "in_progress")
      ),
      // Visibility: user is participant in the series
      or(
        eq(meetingSeries.managerId, userId),
        eq(meetingSeries.reportId, userId)
      )
    )
  )
  .orderBy(asc(actionItems.dueDate));
```

### Pattern 2: Session Summary (Read-Only Detail)
**What:** Server Component that fetches all session data (answers, notes, action items, talking points) for a completed session, renders a scrollable read-only view.
**When to use:** When user clicks a session in the timeline or history page.
**Key decisions:**
- Private notes filtered by `authorId` -- reports cannot see manager's private notes
- Action items show live status (query current status, not historical)
- AI summary section rendered as empty placeholder with "Coming soon" text
- In-progress sessions redirect to wizard instead of showing summary

```typescript
// Server Component pattern for session summary
export default async function SessionSummaryPage({ params }) {
  const session = await auth();
  // ... fetch session, series, template, answers, notes, action items
  // Filter private notes: only show if authorId === session.user.id
  // Redirect in_progress sessions to /wizard/[sessionId]
  return <SessionSummary data={data} isManager={isManager} />;
}
```

### Pattern 3: Full-Text Search with PostgreSQL tsvector
**What:** Generated tsvector columns on searchable tables with GIN indexes. A search API aggregates results across tables.
**When to use:** Command palette search and History page search.

**Recommendation:** Use the on-the-fly `to_tsvector` approach with GIN expression indexes (not generated columns). This avoids schema migrations adding tsvector columns to existing tables and works with JSONB fields like `shared_notes`.

```typescript
// Migration: Add GIN indexes for full-text search
// On session shared_notes (JSONB -- needs extraction)
// On talking_point.content
// On session_answer.answer_text
// On action_item.title and description

// Example: search across action items
const searchQuery = sanitizeSearchInput(query);
const results = await tx
  .select({
    id: actionItems.id,
    title: actionItems.title,
    description: actionItems.description,
    rank: sql`ts_rank(
      to_tsvector('english', coalesce(${actionItems.title}, '') || ' ' || coalesce(${actionItems.description}, '')),
      websearch_to_tsquery('english', ${searchQuery})
    )`,
  })
  .from(actionItems)
  .where(
    sql`to_tsvector('english', coalesce(${actionItems.title}, '') || ' ' || coalesce(${actionItems.description}, ''))
    @@ websearch_to_tsquery('english', ${searchQuery})`
  )
  .orderBy(sql`ts_rank(...) DESC`)
  .limit(10);
```

**Why `websearch_to_tsquery`:** Accepts natural language queries ("team morale low") without requiring boolean operators. Available since PostgreSQL 11. More user-friendly than `to_tsquery` which requires explicit `&` and `|` operators.

### Pattern 4: Command Palette with cmdk
**What:** Global Cmd+K search dialog using the existing shadcn/ui Command component.
**When to use:** Available on every page within the dashboard layout.

```typescript
// Mount in dashboard layout (src/app/(dashboard)/layout.tsx)
// Listen for Cmd+K / Ctrl+K globally
"use client";
import { useEffect, useState } from "react";
import { CommandDialog, CommandInput, CommandList, CommandGroup, CommandItem, CommandEmpty } from "@/components/ui/command";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  // Debounce search input, fetch from /api/search

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search sessions, action items, people..." value={query} onValueChange={setQuery} />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {/* Groups: Sessions, Action Items, Templates, People */}
      </CommandList>
    </CommandDialog>
  );
}
```

### Anti-Patterns to Avoid
- **DO NOT copy action items between sessions:** The user explicitly decided against explicit carry-over. Query by series + status instead.
- **DO NOT use the `carriedToSessionId` column:** The user decided this column is not used for linking. Items are queried live.
- **DO NOT implement 4-state status UI:** The user chose Open/Done toggle. DB keeps the enum for future flexibility, but UI shows only two states.
- **DO NOT add external search services (Elasticsearch, Typesense):** PostgreSQL tsvector is sufficient for this scale and avoids infrastructure complexity.
- **DO NOT replay the wizard for session history:** The user chose a single scrollable summary page, not a wizard re-render.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Command palette | Custom dialog with search | `cmdk` via shadcn/ui `Command` component | Already installed, handles keyboard navigation, accessibility, fuzzy matching |
| Full-text search | Application-level string matching | PostgreSQL `tsvector` + `GIN` indexes | Native PostgreSQL feature, handles stemming, ranking, multi-language support |
| Search query sanitization | Custom regex cleaning | `websearch_to_tsquery()` | PostgreSQL function handles natural language queries safely |
| Sparkline charts | Custom SVG/Canvas | Recharts `LineChart` via existing `ScoreSparkline` | Already proven in the codebase |
| Date range filtering | Custom date picker | shadcn/ui date picker or native date inputs | Consistent with existing UI patterns |
| Overdue calculation | Client-side date comparison | SQL `WHERE due_date < CURRENT_DATE` | Server-authoritative, no timezone issues |

## Common Pitfalls

### Pitfall 1: JSONB Full-Text Search on shared_notes
**What goes wrong:** The `shared_notes` column is JSONB `Record<string, string>` (keyed by category). You cannot directly `to_tsvector` a JSONB column.
**Why it happens:** JSONB needs to be extracted/concatenated before tsvector conversion.
**How to avoid:** Use a helper that extracts all values from the JSONB object:
```sql
-- Extract all text values from JSONB for search
to_tsvector('english',
  coalesce(
    (SELECT string_agg(value::text, ' ')
     FROM jsonb_each_text(session.shared_notes)),
    ''
  )
)
```
**Warning signs:** Empty search results for terms that exist in shared notes.

### Pitfall 2: Private Notes Visibility in Session Summary
**What goes wrong:** Private notes shown to the wrong party in the read-only summary.
**Why it happens:** Forgetting to filter by `authorId` when fetching private notes for display. RLS filters by tenant but not by author in read context for admins.
**How to avoid:** Always include `WHERE author_id = currentUserId` when fetching private notes for display. The RLS policy handles tenant isolation, but the application must handle author filtering.
**Warning signs:** A report seeing the manager's private notes on a session summary.

### Pitfall 3: Action Item Edit Authorization
**What goes wrong:** Standalone action item PATCH endpoint doesn't verify the user is a series participant.
**Why it happens:** The existing PATCH under `/api/sessions/[id]/action-items` verifies session participation. A new standalone `/api/action-items/[id]` endpoint needs its own authorization chain: action item -> session -> series -> verify participant.
**How to avoid:** Build the authorization chain: fetch the action item, join to its session, join to the series, verify the current user is manager or report (or admin).
**Warning signs:** 403 errors or unauthorized edits.

### Pitfall 4: Search Injection / Empty Queries
**What goes wrong:** Raw user input passed to `to_tsquery` causes PostgreSQL syntax errors.
**Why it happens:** `to_tsquery` expects boolean operators. User types "how are you?" which is invalid.
**How to avoid:** Use `websearch_to_tsquery('english', $input)` which accepts natural language. Or use `plainto_tsquery` for AND semantics. Always handle empty/whitespace-only queries by returning empty results.
**Warning signs:** 500 errors on search with special characters.

### Pitfall 5: N+1 Queries on Action Items Page
**What goes wrong:** Fetching action items, then separately fetching assignee names, then series info for each item.
**Why it happens:** Following the existing action items API pattern which does per-user lookups.
**How to avoid:** Use JOINs in the query: action_item JOIN session JOIN meeting_series JOIN user (assignee) JOIN user (report for group header).
**Warning signs:** Slow page loads when there are many action items.

### Pitfall 6: Score Sparkline Data for History Page
**What goes wrong:** Fetching full session data for sparklines when only scores are needed.
**Why it happens:** Reusing the full session query for the sparkline component.
**How to avoid:** For the History page, fetch a lightweight array of `[session_number, session_score]` per series. The existing `ScoreSparkline` component only needs `number[]`.
**Warning signs:** Slow History page loads with many sessions.

## Code Examples

### Example 1: Action Items Cross-Series Query with Grouping
```typescript
// Source: Based on existing patterns in src/app/api/sessions/[id]/action-items/route.ts
import { actionItems, sessions, meetingSeries, users } from "@/lib/db/schema";
import { eq, and, or, asc, sql } from "drizzle-orm";

// In withTenantContext callback:
const items = await tx
  .select({
    id: actionItems.id,
    title: actionItems.title,
    description: actionItems.description,
    status: actionItems.status,
    dueDate: actionItems.dueDate,
    category: actionItems.category,
    createdAt: actionItems.createdAt,
    assigneeFirstName: users.firstName,
    assigneeLastName: users.lastName,
    seriesId: meetingSeries.id,
    sessionNumber: sessions.sessionNumber,
    reportId: meetingSeries.reportId,
  })
  .from(actionItems)
  .innerJoin(sessions, eq(actionItems.sessionId, sessions.id))
  .innerJoin(meetingSeries, eq(sessions.seriesId, meetingSeries.id))
  .innerJoin(users, eq(actionItems.assigneeId, users.id))
  .where(
    and(
      eq(actionItems.tenantId, tenantId),
      or(eq(actionItems.status, "open"), eq(actionItems.status, "in_progress")),
      or(eq(meetingSeries.managerId, userId), eq(meetingSeries.reportId, userId))
    )
  )
  .orderBy(asc(actionItems.dueDate));
```

### Example 2: Session Summary Data Fetch (Server Component)
```typescript
// Source: Based on existing pattern in src/app/(dashboard)/sessions/[id]/page.tsx
// Fetch all data needed for read-only session summary
const [answers, talkingPointRows, privateNoteRows, actionItemRows] = await Promise.all([
  tx.select({
    id: sessionAnswers.id,
    questionId: sessionAnswers.questionId,
    answerText: sessionAnswers.answerText,
    answerNumeric: sessionAnswers.answerNumeric,
    answerJson: sessionAnswers.answerJson,
  }).from(sessionAnswers).where(eq(sessionAnswers.sessionId, sessionId)),

  tx.select().from(talkingPoints).where(eq(talkingPoints.sessionId, sessionId))
    .orderBy(asc(talkingPoints.sortOrder)),

  // Only fetch private notes for the current user
  tx.select().from(privateNotes).where(
    and(eq(privateNotes.sessionId, sessionId), eq(privateNotes.authorId, currentUserId))
  ),

  // Live action item status -- current status, not historical
  tx.select({
    id: actionItems.id,
    title: actionItems.title,
    status: actionItems.status,
    dueDate: actionItems.dueDate,
    assigneeId: actionItems.assigneeId,
  }).from(actionItems).where(eq(actionItems.sessionId, sessionId)),
]);
```

### Example 3: Full-Text Search API
```typescript
// Source: Drizzle ORM PostgreSQL full-text search guide
// https://orm.drizzle.team/docs/guides/postgresql-full-text-search
import { sql } from "drizzle-orm";

async function searchSessions(tx, tenantId, userId, query, limit = 10) {
  // Search across talking points and free-text answers
  const talkingPointResults = await tx
    .select({
      id: talkingPoints.id,
      content: talkingPoints.content,
      sessionId: talkingPoints.sessionId,
      type: sql<string>`'talking_point'`,
      rank: sql<number>`ts_rank(
        to_tsvector('english', ${talkingPoints.content}),
        websearch_to_tsquery('english', ${query})
      )`,
    })
    .from(talkingPoints)
    .innerJoin(sessions, eq(talkingPoints.sessionId, sessions.id))
    .innerJoin(meetingSeries, eq(sessions.seriesId, meetingSeries.id))
    .where(
      and(
        eq(sessions.tenantId, tenantId),
        sql`to_tsvector('english', ${talkingPoints.content})
            @@ websearch_to_tsquery('english', ${query})`,
        or(eq(meetingSeries.managerId, userId), eq(meetingSeries.reportId, userId))
      )
    )
    .orderBy(sql`ts_rank(...) DESC`)
    .limit(limit);

  return talkingPointResults;
}
```

### Example 4: GIN Index Migration
```sql
-- Migration for full-text search GIN indexes
-- On action_item title + description
CREATE INDEX action_item_search_idx ON action_item
  USING gin(to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '')));

-- On talking_point content
CREATE INDEX talking_point_search_idx ON talking_point
  USING gin(to_tsvector('english', content));

-- On session_answer answer_text (only for free_text type answers)
CREATE INDEX session_answer_text_search_idx ON session_answer
  USING gin(to_tsvector('english', coalesce(answer_text, '')));
```

### Example 5: Sidebar Navigation Update
```typescript
// Source: Existing pattern in src/components/layout/sidebar.tsx
const mainNavItems: NavItem[] = [
  { label: "Overview", href: "/overview", icon: LayoutDashboard },
  { label: "People", href: "/people", icon: Users, matchAlso: ["/teams"] },
  { label: "Templates", href: "/templates", icon: FileText },
  { label: "Sessions", href: "/sessions", icon: CalendarDays },
  // New nav items for Phase 6:
  { label: "Action Items", href: "/action-items", icon: ListChecks },
  { label: "History", href: "/history", icon: History },
];
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `to_tsquery` with manual operators | `websearch_to_tsquery` for natural language | PostgreSQL 11 (2018) | Users type natural queries, no boolean syntax needed |
| `getTableColumns(table)` in Drizzle | `getColumns(table)` | Drizzle ORM 1.0 | Use the new API name (this project is on 0.38.4, uses `getTableColumns`) |
| Generated tsvector columns | Expression GIN indexes | Always available | Expression indexes avoid adding columns to existing tables |

**Important version note:** This project uses Drizzle ORM 0.38.4 which uses `getTableColumns` (not `getColumns` which is 1.0+). Use `getTableColumns` in code.

## Discretion Recommendations

### Full-Text Search: PostgreSQL tsvector with Expression GIN Indexes
**Recommendation:** Use `websearch_to_tsquery` with expression GIN indexes (not generated columns). This avoids schema changes adding tsvector columns to existing tables. The GIN indexes on `to_tsvector('english', ...)` expressions give the same performance benefit.
**Confidence:** HIGH -- verified with Drizzle ORM docs and PostgreSQL documentation.

### Command Palette: cmdk via shadcn/ui Command
**Recommendation:** Use the existing `src/components/ui/command.tsx` (shadcn/ui Command built on cmdk). Already installed and styled. Build a `CommandPalette` wrapper component that handles Cmd+K binding, debounced search via `/api/search`, and result rendering grouped by type.
**Confidence:** HIGH -- library already installed and configured.

### Action Items Page Layout: Table with Card-like Rows
**Recommendation:** Use a table-like layout with card-styled rows grouped under series headers. Each group header shows the report name + series info. Within each group, items are sorted by: overdue first, then by due date ascending, then by creation date. Use the existing table pattern from the people directory but with grouped sections. Not a full `@tanstack/react-table` -- too heavy for a grouped list with simple toggle actions.
**Confidence:** MEDIUM -- layout choice is subjective, but matches existing app patterns.

### Session Summary Page Layout
**Recommendation:** Reuse the structure from the existing `SummaryScreen` component (categories, answers, notes, action items) but as a read-only Server Component rendered page. Add a header with session metadata (date, duration, score, session number) and an AI summary placeholder section. Single scrollable page at `max-w-3xl` width, consistent with existing wizard summary.
**Confidence:** HIGH -- directly extends existing component patterns.

### History Page Pagination: Cursor-Based with Load More
**Recommendation:** Use cursor-based pagination (keyed on `scheduled_at` + `id`) with a "Load more" button. Initial load shows 20 sessions. URL params store active filters (`?status=completed&from=2026-01-01&to=2026-03-01&series=uuid`). This avoids offset-based pagination issues and works well with date range filters.
**Confidence:** MEDIUM -- approach is sound, exact UX depends on data volume.

### Empty States
**Recommendation:** Consistent empty states across all new pages:
- Action Items: illustration + "No open action items. Create them during your next session."
- History: illustration + "No sessions yet. Start your first session from the Sessions page."
- Search (no results): "No results found for [query]. Try different keywords."
- Session Summary (no notes): "No notes" italic text (matches existing pattern).
**Confidence:** HIGH -- follows existing empty state patterns in the codebase.

### Mobile Command Palette
**Recommendation:** Full-width overlay on mobile (same as desktop dialog but wider). Reduce max-height. Keep same keyboard-free interaction (tap to search, tap results). Add a search icon in the mobile header for discovery.
**Confidence:** MEDIUM -- mobile command palettes are less common but functional.

## Open Questions

1. **shared_notes JSONB Search Performance**
   - What we know: `shared_notes` is JSONB `Record<string, string>`. PostgreSQL can extract values with `jsonb_each_text()` but GIN index on a subquery extraction is complex.
   - What's unclear: Whether a functional GIN index can efficiently index extracted JSONB text values, or if a denormalized text column is needed.
   - Recommendation: Start with on-the-fly extraction in search queries. If performance is poor at scale, add a generated `shared_notes_text` column that concatenates all values. For v1 data volumes, on-the-fly extraction is fine.

2. **Search Result Snippets (ts_headline)**
   - What we know: PostgreSQL `ts_headline()` function generates highlighted snippets from search results.
   - What's unclear: Whether to implement snippets in v1 or just show the first N characters of matching content.
   - Recommendation: Use `ts_headline()` for search results -- it's built-in and provides meaningful context. Pattern: `ts_headline('english', content, websearch_to_tsquery('english', $query), 'MaxWords=20, MinWords=10, MaxFragments=1')`.

## Sources

### Primary (HIGH confidence)
- Drizzle ORM PostgreSQL full-text search guide: https://orm.drizzle.team/docs/guides/postgresql-full-text-search
- Drizzle ORM generated columns guide: https://orm.drizzle.team/docs/guides/full-text-search-with-generated-columns
- PostgreSQL text search documentation: https://www.postgresql.org/docs/current/textsearch-controls.html
- Existing codebase: `src/lib/db/schema/action-items.ts`, `src/app/api/sessions/[id]/action-items/route.ts`, `src/components/session/context-panel.tsx`, `src/components/session/summary-screen.tsx`, `src/components/ui/command.tsx`

### Secondary (MEDIUM confidence)
- shadcn/ui Command component: https://www.shadcn.io/ui/command
- cmdk library: https://github.com/dip/cmdk

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, all already installed
- Architecture: HIGH -- extends well-established patterns in the codebase
- Full-text search: HIGH -- verified with official Drizzle and PostgreSQL docs
- Command palette: HIGH -- library already installed and shadcn component exists
- Pitfalls: HIGH -- identified from actual codebase inspection (JSONB notes, private note visibility, auth chains)

**Research date:** 2026-03-04
**Valid until:** 2026-04-04 (stable domain, no fast-moving dependencies)
