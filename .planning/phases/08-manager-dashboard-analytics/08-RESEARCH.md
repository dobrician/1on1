# Phase 8: Manager Dashboard & Analytics - Research

**Researched:** 2026-03-04
**Domain:** Dashboard UI, Data Visualization (Recharts), Analytics Snapshot Computation (Inngest)
**Confidence:** HIGH

## Summary

Phase 8 transforms the current stub overview page into a full manager dashboard and adds analytics pages with charts. The project already has Recharts 3.7 installed (only sparklines used so far), Inngest for background jobs, and a fully designed `analytics_snapshot` schema ready to use. The session schema needs one new column (`analyticsIngestedAt`) and two new Inngest functions (snapshot computation on session completion, cron safety net).

The dashboard is a Server Component rebuild of `src/app/(dashboard)/overview/page.tsx`, pulling upcoming sessions, overdue action items, quick stats, and recent sessions via Drizzle queries. Nudge cards already exist and need refactoring to integrate into upcoming session cards. Analytics pages are new routes at `/analytics/*` using Recharts for line charts, bar charts, and a custom dot-matrix heatmap. CSV export uses server-side generation via API routes returning `text/csv`.

**Primary recommendation:** Build the Inngest snapshot pipeline first (Plan 08-02), then the dashboard (Plan 08-01) which can use live queries, then individual analytics (Plan 08-03), team analytics (Plan 08-04), and finally velocity/adherence/export (Plan 08-05).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Dashboard leads with upcoming sessions (next 7 days) as primary section
- AI nudges integrated within each upcoming session card, not separate section
- AI nudges use full session history as context (not limited to last 3)
- Overdue action items grouped by report with days overdue count
- Recent completed sessions configurable: compact list or cards with AI summary snippet
- Quick stats: total reports, sessions this month, average session score
- "Start session" quick action button on today's scheduled sessions
- Analytics pages: /analytics, /analytics/individual/[id], /analytics/team/[id] with deep-linkable URLs
- Period selector: fixed presets (30d, 3mo, 6mo, 1yr) + custom date range picker
- Reports (members) can see their own individual analytics but NOT team analytics
- Managers see direct reports; admins see organization-wide
- Session comparison: delta table with +/- score change per category
- Team heatmap: dot matrix style (dots with size + color encoding), not traditional grid
- Insufficient data: show partial chart + "More data after 3+ sessions" message
- Score trend: line chart, category breakdown: bar chart
- CSV: both full export and per-view export
- Snapshot computation on session completion via Inngest
- Ingestion flag on sessions (atomic: ingest + mark in same transaction)
- Cron safety net: periodic scan for un-ingested completed sessions

### Claude's Discretion
- Dashboard section ordering (after upcoming sessions at top)
- AI nudge placement within session cards (inline preview vs expand-on-click)
- Color palette for all charts
- Chart types for action item velocity and meeting adherence
- Live query fallback strategy when snapshots are missing
- Analytics overview page content
- Responsive behavior for charts on smaller screens
- Empty states for analytics pages with no data yet

### Deferred Ideas (OUT OF SCOPE)
- AI growth narratives (v2 AI-V2-03)
- AI anomaly detection (v2 AI-V2-04)
- Manager scoring/ranking (explicitly excluded)
- PDF export with branding (v2 MISC-04)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DASH-01 | Dashboard shows upcoming sessions (next 7 days) | Server Component query on sessions + series with nudges; reuse SeriesCard pattern |
| DASH-02 | Overdue action items grouped by report | Drizzle query on action_items with status=open, dueDate < now, joined with users |
| DASH-03 | Quick stats: total reports, sessions this month, avg score | Aggregate queries via withTenantContext, can be parallel Promise.all |
| DASH-04 | Last 5 completed sessions with scores | Query sessions with status=completed, ordered by completedAt DESC, limit 5 |
| DASH-05 | "Start session" quick action for today's sessions | Reuse SeriesCard start mutation pattern; filter scheduledAt for today |
| ANLT-01 | Line chart: individual scores over time | Recharts LineChart with ResponsiveContainer; data from analytics_snapshot or live query |
| ANLT-02 | Bar chart: per-category averages | Recharts BarChart; aggregate session_answers by category |
| ANLT-03 | Session-over-session comparison | Delta table component; diff between two session scores per category |
| ANLT-04 | Team analytics with aggregated scores | Team-level analytics_snapshot rows; anonymization toggle |
| ANLT-05 | Heatmap: team x category matrix | Custom SVG dot-matrix component (Recharts ScatterChart or custom) |
| ANLT-06 | Action item velocity chart | Recharts AreaChart or BarChart; avg days from creation to completion |
| ANLT-07 | Meeting adherence chart | Recharts stacked BarChart; completed/missed/cancelled per month |
| ANLT-08 | Analytics powered by pre-computed snapshots | Inngest function triggered by session/completed; cron safety net |
| ANLT-09 | CSV export | API route generating CSV with proper Content-Type and Content-Disposition headers |
</phase_requirements>

## Standard Stack

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Recharts | 3.7.0 | All chart visualizations | Already in project, React-native composable API |
| Inngest | 3.52.6 | Snapshot computation background jobs | Already used for AI pipeline, durable execution |
| Drizzle ORM | 0.38.4 | Database queries for dashboard and analytics | Project ORM, supports complex aggregations |
| TanStack Query | 5.90.21 | Client-side data fetching for interactive filters | Already used throughout for mutations and queries |
| shadcn/ui | (radix-ui 1.4.3) | UI components (Card, Badge, Avatar, Select, Tabs, Table) | 26+ components already installed |

### Supporting (Already Installed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | 0.576.0 | Icons for dashboard sections | All UI icons |
| date-fns | N/A | Date formatting/manipulation | NOT installed -- use native Intl.DateTimeFormat and Date math (project pattern) |
| sonner | 2.0.7 | Toast notifications | CSV export success/error feedback |

### No New Dependencies Needed
The entire phase can be built with existing installed libraries. No new packages required.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/(dashboard)/
│   ├── overview/
│   │   └── page.tsx                    # Rebuilt dashboard (Server Component)
│   └── analytics/
│       ├── page.tsx                    # Analytics overview
│       ├── individual/
│       │   └── [id]/
│       │       └── page.tsx            # Individual analytics
│       └── team/
│           └── [id]/
│               └── page.tsx            # Team analytics
├── app/api/
│   └── analytics/
│       ├── snapshots/
│       │   └── route.ts               # Snapshot data API (for client-side filtering)
│       ├── individual/
│       │   └── [id]/
│       │       └── route.ts            # Individual analytics data
│       ├── team/
│       │   └── [id]/
│       │       └── route.ts            # Team analytics data
│       └── export/
│           └── route.ts               # CSV export endpoint
├── components/
│   ├── dashboard/
│   │   ├── upcoming-sessions.tsx       # Upcoming sessions with integrated nudges
│   │   ├── overdue-items.tsx           # Overdue action items grouped by report
│   │   ├── quick-stats.tsx             # Stats cards
│   │   └── recent-sessions.tsx         # Last 5 completed sessions
│   └── analytics/
│       ├── score-trend-chart.tsx        # Line chart (ANLT-01)
│       ├── category-breakdown.tsx       # Bar chart (ANLT-02)
│       ├── session-comparison.tsx       # Delta table (ANLT-03)
│       ├── team-heatmap.tsx             # Dot matrix (ANLT-05)
│       ├── velocity-chart.tsx           # Action item velocity (ANLT-06)
│       ├── adherence-chart.tsx          # Meeting adherence (ANLT-07)
│       ├── period-selector.tsx          # Shared period filter
│       └── csv-export-button.tsx        # Export trigger
├── inngest/functions/
│   └── analytics-snapshot.ts           # Snapshot computation + cron sweep
└── lib/
    └── analytics/
        ├── queries.ts                  # Drizzle queries for analytics data
        ├── compute.ts                  # Snapshot computation logic
        └── csv.ts                      # CSV generation utilities
```

### Pattern 1: Server Component Dashboard with Parallel Data Fetching
**What:** Dashboard overview fetches all data server-side via parallel Drizzle queries
**When to use:** Initial page load for dashboard
**Example:**
```typescript
// src/app/(dashboard)/overview/page.tsx
export default async function OverviewPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const { user } = session;

  // Parallel data fetching -- all independent queries
  const [upcoming, overdueItems, stats, recentSessions] = await Promise.all([
    getUpcomingSessions(user.tenantId, user.id, user.role),
    getOverdueActionItems(user.tenantId, user.id, user.role),
    getQuickStats(user.tenantId, user.id, user.role),
    getRecentSessions(user.tenantId, user.id, user.role, 5),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8">
      <UpcomingSessions sessions={upcoming} />
      <OverdueItems items={overdueItems} />
      <QuickStats stats={stats} />
      <RecentSessions sessions={recentSessions} />
    </div>
  );
}
```

### Pattern 2: Client Component Analytics with Period Selector
**What:** Analytics pages use Server Component for initial data, Client Component for interactive filtering
**When to use:** All analytics chart pages where period selection changes displayed data
**Example:**
```typescript
// Server Component loads initial data for default period
// Client Component handles period changes via TanStack Query
"use client";
export function ScoreTrendChart({ initialData, userId }: Props) {
  const [period, setPeriod] = useState<PeriodPreset>("3months");
  const { data } = useQuery({
    queryKey: ["analytics", "score-trend", userId, period],
    queryFn: () => fetchScoreTrend(userId, period),
    initialData: period === "3months" ? initialData : undefined,
  });
  // ... render Recharts LineChart
}
```

### Pattern 3: Inngest Snapshot Computation on Session Completion
**What:** Extend the existing `session/completed` event flow to also compute analytics snapshots
**When to use:** Every time a session is completed
**Example:**
```typescript
// New Inngest function triggered by same "session/completed" event
export const computeAnalyticsSnapshot = inngest.createFunction(
  { id: "compute-analytics-snapshot", retries: 3 },
  { event: "session/completed" },
  async ({ event, step }) => {
    const { sessionId, seriesId, tenantId, managerId, reportId } = event.data;

    await step.run("compute-and-store", async () => {
      await withTenantContext(tenantId, managerId, async (tx) => {
        // Compute metrics for the report user
        // Upsert into analytics_snapshot
        // Mark session as ingested (atomic)
      });
    });
  }
);
```

### Pattern 4: CSV Export via API Route
**What:** Server-side CSV generation returning proper headers for browser download
**When to use:** Both full export and per-view export
**Example:**
```typescript
// src/app/api/analytics/export/route.ts
export async function GET(request: NextRequest) {
  const session = await auth();
  // ... auth + params validation
  const rows = await getExportData(params);
  const csv = generateCSV(rows);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="analytics-${date}.csv"`,
    },
  });
}
```

### Anti-Patterns to Avoid
- **Fetching analytics data in client components on initial load:** Use Server Components for initial data, TanStack Query only for period/filter changes
- **Computing analytics on the fly for charts:** Use pre-computed snapshots from analytics_snapshot table; live queries only as fallback for missing snapshots
- **Separate Inngest events for analytics vs AI:** Both can listen to the same `session/completed` event -- Inngest supports multiple functions on one event
- **Building heatmap with HTML table + colored backgrounds:** Use SVG-based dot matrix for the Apple-like visual requirement

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Chart rendering | Custom SVG charts | Recharts 3.7 (LineChart, BarChart, ScatterChart) | Handles responsive sizing, tooltips, animations, axes automatically |
| Date period calculation | Manual date math | Utility functions with `new Date()` and `setMonth()`/`setDate()` | Project already uses native Date, no date-fns installed |
| CSV generation | String concatenation | Simple utility with proper escaping (quotes, commas, newlines) | Edge cases with special characters in notes/answers |
| Cron scheduling | Custom setInterval | Inngest cron trigger (`{ cron: "0 2 * * 1" }`) | Already established pattern with pre-session nudge cron |
| Score normalization | Per-chart normalization | Shared normalization utility | Already exists in session completion logic (SCORABLE_TYPES pattern) |

**Key insight:** Recharts 3.7 covers line, bar, area, and scatter charts. The dot-matrix heatmap is the only visualization needing custom work -- use Recharts ScatterChart with custom dot rendering or a lightweight custom SVG component.

## Common Pitfalls

### Pitfall 1: Snapshot Duplication on Event Replay
**What goes wrong:** Inngest may replay `session/completed` events, causing duplicate snapshot rows
**Why it happens:** Inngest guarantees at-least-once delivery; the same event can trigger multiple times
**How to avoid:** Use `ON CONFLICT DO UPDATE` (upsert) via Drizzle's `onConflictDoUpdate` on the unique index `analytics_unique_snapshot_idx`. The schema already has this unique index.
**Warning signs:** Duplicate rows in analytics_snapshot, inflated sample_count values

### Pitfall 2: Recharts ResponsiveContainer Requires Parent Height
**What goes wrong:** Charts render with 0 height or collapse
**Why it happens:** `ResponsiveContainer` reads parent dimensions -- if the parent has no explicit height, charts vanish
**How to avoid:** Always wrap charts in a div with explicit height (`h-[300px]` or similar). The existing ScoreSparkline already does this correctly with the `height` prop on the wrapper div.
**Warning signs:** Chart container visible in DOM inspector but has 0px height

### Pitfall 3: Decimal Precision Loss
**What goes wrong:** Session scores display as "3.4000000000000001" or aggregate incorrectly
**Why it happens:** Drizzle returns decimal columns as strings (to preserve precision), but JavaScript floating point math introduces errors when converting
**How to avoid:** Keep decimals as strings from DB through to display; use `parseFloat().toFixed(1)` only at the display layer. The existing `SeriesCard` already does this: `parseFloat(series.latestSession.sessionScore).toFixed(1)`
**Warning signs:** Scores showing excessive decimal places

### Pitfall 4: Missing Tenant Isolation in Analytics Queries
**What goes wrong:** Analytics data leaks between tenants
**Why it happens:** Complex JOIN queries across multiple tables may forget the tenantId filter
**How to avoid:** All analytics queries MUST go through `withTenantContext()`. RLS is the safety net but app-level filtering is the primary guard. Every query function should accept tenantId as the first parameter.
**Warning signs:** Users seeing data from other organizations

### Pitfall 5: N+1 Queries in Dashboard
**What goes wrong:** Dashboard loads slowly because each section makes separate queries that could be combined
**Why it happens:** Fetching nudges per session card individually instead of batch-loading
**How to avoid:** Fetch all nudges for the user's upcoming sessions in one query, then distribute to cards client-side. The existing `NudgeCardsGrid` already groups nudges by report -- similar pattern.
**Warning signs:** Waterfall of DB queries in server logs

### Pitfall 6: Team Heatmap with Insufficient Data Exposing Individuals
**What goes wrong:** When a team has only 1-2 members, "aggregated" scores directly identify individuals
**Why it happens:** No minimum sample size check before displaying team analytics
**How to avoid:** Per docs/analytics.md, team averages require minimum 3 data points. Display "Insufficient data" for categories with fewer than 3 contributors.
**Warning signs:** Team analytics showing individual-level data

## Code Examples

### Recharts Line Chart (Score Trend)
```typescript
// Recharts 3.7 pattern used in project
"use client";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from "recharts";

interface ScoreTrendProps {
  data: Array<{ date: string; score: number; teamAvg?: number }>;
}

export function ScoreTrendChart({ data }: ScoreTrendProps) {
  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="date" className="text-xs" />
          <YAxis domain={[1, 5]} className="text-xs" />
          <Tooltip />
          <Legend />
          <Line
            type="monotone"
            dataKey="score"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={{ r: 4 }}
            name="Score"
          />
          {data[0]?.teamAvg !== undefined && (
            <Line
              type="monotone"
              dataKey="teamAvg"
              stroke="hsl(var(--muted-foreground))"
              strokeWidth={1}
              strokeDasharray="5 5"
              dot={false}
              name="Team Average"
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
```

### Drizzle Aggregation Query (Category Averages)
```typescript
// Query pattern for per-category score aggregation
import { sql, eq, and, gte, lte, isNotNull } from "drizzle-orm";
import { sessionAnswers, templateQuestions, sessions } from "@/lib/db/schema";

async function getCategoryAverages(
  tx: TransactionClient,
  userId: string,
  startDate: Date,
  endDate: Date
) {
  return tx
    .select({
      category: templateQuestions.category,
      avgScore: sql<string>`AVG(
        CASE
          WHEN ${templateQuestions.answerType} = 'rating_1_5' THEN ${sessionAnswers.answerNumeric}
          WHEN ${templateQuestions.answerType} = 'rating_1_10' THEN (${sessionAnswers.answerNumeric} - 1) / 9 * 4 + 1
          WHEN ${templateQuestions.answerType} = 'mood' THEN ${sessionAnswers.answerNumeric}
        END
      )`,
      sampleCount: sql<number>`COUNT(*)`,
    })
    .from(sessionAnswers)
    .innerJoin(templateQuestions, eq(sessionAnswers.questionId, templateQuestions.id))
    .innerJoin(sessions, eq(sessionAnswers.sessionId, sessions.id))
    .where(
      and(
        eq(sessions.status, "completed"),
        eq(sessionAnswers.respondentId, userId),
        isNotNull(sessionAnswers.answerNumeric),
        eq(sessionAnswers.skipped, false),
        gte(sessions.completedAt, startDate),
        lte(sessions.completedAt, endDate)
      )
    )
    .groupBy(templateQuestions.category)
    .having(sql`${templateQuestions.category} IS NOT NULL`);
}
```

### Inngest Snapshot Upsert
```typescript
// Upsert pattern using existing unique index
import { analyticsSnapshots } from "@/lib/db/schema";
import { sql } from "drizzle-orm";

async function upsertSnapshot(
  tx: TransactionClient,
  snapshot: typeof analyticsSnapshots.$inferInsert
) {
  await tx
    .insert(analyticsSnapshots)
    .values(snapshot)
    .onConflictDoUpdate({
      target: [
        analyticsSnapshots.tenantId,
        analyticsSnapshots.userId,
        analyticsSnapshots.teamId,
        analyticsSnapshots.seriesId,
        analyticsSnapshots.periodType,
        analyticsSnapshots.periodStart,
        analyticsSnapshots.metricName,
      ],
      set: {
        metricValue: sql`EXCLUDED.metric_value`,
        sampleCount: sql`EXCLUDED.sample_count`,
        computedAt: sql`now()`,
      },
    });
}
```

### CSV Export Utility
```typescript
// Safe CSV generation with proper escaping
function escapeCsvField(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function generateCSV(headers: string[], rows: unknown[][]): string {
  const headerLine = headers.map(escapeCsvField).join(",");
  const dataLines = rows.map(
    (row) => row.map(escapeCsvField).join(",")
  );
  return [headerLine, ...dataLines].join("\n");
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Recharts 2.x class API | Recharts 3.x functional API | 2024 | Already using 3.7; composable component pattern |
| Custom chart tooltips | Recharts built-in `<Tooltip>` | Stable | Use built-in; only customize for branding |
| Manual cron jobs | Inngest cron triggers | Already in project | Use `{ cron: "..." }` syntax for safety net sweep |
| Client-side CSV generation | Server-side with proper headers | Best practice | Avoids browser memory limits for large exports |

## Recommendations (Claude's Discretion Areas)

### Dashboard Section Ordering
1. Upcoming Sessions (next 7 days) -- locked as first
2. Quick Stats (lightweight, provides context for everything below)
3. Overdue Action Items (requires attention)
4. Recent Sessions (informational)

### AI Nudge Placement
Use inline preview (first nudge visible, "+N more" expandable) within session cards. Keeps the "briefing" feel without overwhelming the card.

### Color Palette for Charts
Use CSS custom properties from the project's design system:
- Primary line: `hsl(var(--primary))` (the app's main accent)
- Comparison/team avg: `hsl(var(--muted-foreground))` with dashed stroke
- Categories: derive from primary using HSL rotation (keep saturation/lightness, rotate hue by 60deg steps)
- Heatmap dots: green-yellow-red gradient mapped to score ranges

### Chart Types for Discretionary Charts
- **Action item velocity (ANLT-06):** Area chart -- visually shows trend of avg completion days over time, filled area emphasizes speed/slowness
- **Meeting adherence (ANLT-07):** Stacked bar chart (per docs/analytics.md pattern) -- completed/cancelled/missed segments per month

### Live Query Fallback Strategy
When snapshots are missing (new user, first sessions before cron runs):
1. Check analytics_snapshot first
2. If empty, fall back to live query on session_answer + sessions
3. Show subtle indicator "Live data -- snapshots update periodically"
4. Never show empty state if raw data exists

### Responsive Behavior
- Charts: 300px height on desktop, 200px on mobile
- Heatmap: horizontal scroll on mobile (team members as rows, categories scroll)
- Dashboard: single column on mobile, two-column grid on desktop for stats

### Empty States
- "No upcoming sessions" -- link to create a meeting series
- "No analytics yet" -- "Complete your first session to see trends here"
- Partial data: always show what exists with a note about minimum data needed

## Schema Changes Required

### Session Table: Add analyticsIngestedAt
```sql
ALTER TABLE session
ADD COLUMN analytics_ingested_at TIMESTAMPTZ;
```

In Drizzle schema (`src/lib/db/schema/sessions.ts`):
```typescript
analyticsIngestedAt: timestamp("analytics_ingested_at", { withTimezone: true }),
```

### Inngest Events: Add analytics-related
```typescript
// Add to src/inngest/client.ts Events type
"analytics/snapshot.compute": {
  data: {
    sessionId: string;
    tenantId: string;
    managerId: string;
    reportId: string;
    seriesId: string;
  };
};
```

Note: The snapshot computation can also listen directly to the existing `session/completed` event. Inngest supports multiple functions listening to the same event -- no conflict with the AI pipeline.

## Open Questions

1. **Unique index with nullable columns**
   - What we know: `analytics_unique_snapshot_idx` includes `userId`, `teamId`, `seriesId` which can all be NULL. PostgreSQL treats NULLs as distinct in unique indexes.
   - What's unclear: This means upsert with `onConflictDoUpdate` on this index won't match rows where any of these are NULL (two NULL values are never equal).
   - Recommendation: For user-level snapshots (teamId=NULL, seriesId=NULL), either use a sentinel value or create separate unique indexes for each combination. Alternatively, use `COALESCE` in the index or handle upsert with manual `INSERT ... ON CONFLICT` raw SQL. This needs to be addressed in Plan 08-02.

2. **Analytics_snapshot metricName values**
   - What we know: The column is varchar(100) with no enum constraint
   - What's unclear: Exact metric name strings to use
   - Recommendation: Define constants: `session_score`, `wellbeing_score`, `engagement_score`, `performance_score`, `career_score`, `feedback_score`, `mood_score`, `action_completion_rate`, `meeting_adherence`. Use these consistently in compute and query code.

## Sources

### Primary (HIGH confidence)
- Project codebase: `src/lib/db/schema/analytics.ts` -- analytics_snapshot table fully designed
- Project codebase: `src/lib/db/schema/sessions.ts` -- session schema (no analyticsIngestedAt yet)
- Project codebase: `src/inngest/` -- established Inngest patterns (post-session, pre-session, cron)
- Project codebase: `src/components/session/score-sparkline.tsx` -- Recharts 3.7 usage pattern
- Project codebase: `src/components/dashboard/nudge-card.tsx` -- existing nudge display
- Project docs: `docs/analytics.md` -- metrics, chart types, aggregation strategy, privacy matrix
- Project: `package.json` -- Recharts 3.7.0, Inngest 3.52.6 confirmed

### Secondary (MEDIUM confidence)
- Recharts 3.x API -- based on project's existing usage and Recharts documentation patterns
- CSV export patterns -- standard HTTP response with Content-Type/Content-Disposition headers

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already installed and used in project
- Architecture: HIGH -- follows established Server Component + Client Component + Inngest patterns
- Pitfalls: HIGH -- based on existing codebase patterns and known PostgreSQL/Recharts behaviors
- Heatmap dot-matrix: MEDIUM -- custom component, no existing pattern in codebase to follow

**Research date:** 2026-03-04
**Valid until:** 2026-04-04 (stable stack, no version changes expected)
