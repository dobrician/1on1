# Phase 5: Meeting Series & Session Wizard - Research

**Researched:** 2026-03-04
**Domain:** Multi-step wizard UI, rich text editing, real-time auto-save, per-category data architecture
**Confidence:** HIGH

## Summary

Phase 5 is the most complex UI phase so far -- it introduces a full-page immersive wizard, a rich text editor (tiptap), per-category data grouping, auto-save with debounce, score sparklines, and a context sidebar. The database schema is fully deployed (meeting_series, session, session_answer, private_note, talking_point, action_item tables all exist with seed data), but there is a critical data model gap: the CONTEXT.md specifies per-category notes, talking points, and action items, while the existing schema stores these per-session without category association.

The main new dependency is tiptap for rich text editing -- not yet installed. Recharts is in the tech stack plan but also not yet installed; it will be needed for score trend sparklines. A custom useDebounce hook is needed for the 500ms auto-save pattern. The wizard requires a separate layout route that hides the dashboard sidebar for an immersive experience.

**Primary recommendation:** Solve the per-category data model gap first (schema migration), then build outward: series CRUD, wizard shell with navigation, input widgets, context panel, notes/action items, and finally auto-save + completion flow.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- One category/topic per screen -- all questions for a category displayed together on a single scrollable screen
- Each category screen includes: questions with input widgets, a rich-text notes area, and an action items capture section
- First screen of each session shows a recap of the last meeting (structured data for Phase 5; AI-polished summary when Phase 7 lands)
- Final screen shows a full recap of all answers, notes, and action items grouped by category, with a "Complete Session" button
- Manager reviews the summary and confirms completion; can go back to edit before confirming
- Full-page immersive experience -- app sidebar hidden, no navigation chrome
- Minimal top bar: exit button, session info (report name, date), save status indicator
- Category navigation at bottom (dots or tabs for each category + summary)
- Prev/Next buttons for category-to-category navigation
- Context panel always-visible sidebar showing context relevant to the current category step
- As user navigates between categories, sidebar updates to show previous session's notes and answers for THAT category
- General context (open action items from previous sessions, overall score trends) shown on the opening recap screen
- Per-question history: a small button/icon on each question opens a dialog showing previous answers for that specific question across the last 3-6 sessions
- Card grid layout on the Sessions page, sorted by upcoming meeting date (soonest first)
- Creating a new series: dedicated page with a form (/series/new)
- Clicking a series card opens the series detail page (/series/[id]) showing settings at top + session history timeline below
- "Start Session" button on both the series card and series detail page
- Single "Sessions" nav item in the sidebar (leads to series card grid)
- Rich text editor with tiptap -- simple editor with markdown support (bold, italic, lists, links)
- Notes are per-category -- each category screen has its own notes area
- Shared notes visible to both manager and report
- Private notes (encrypted, author-only) accessible via toggle tab next to shared notes within each category
- Action items captured per-category during the session
- Action items include: title, assignee, optional due date
- Talking points added during the session only (no pre-session entry)
- Talking points live within each category screen alongside notes and action items
- Session lifecycle: Start -> in_progress -> wizard -> summary -> Complete
- Auto-save all answers, notes, action items with 500ms debounce
- Session score computed as average of all numeric answers
- Series states: Active, Paused, Archived

### Claude's Discretion
- Navigation component design (dots vs tabs for categories)
- Progress indicator styling
- Mobile responsive behavior (context panel collapse strategy)
- Paused/archived series display (sorted to bottom vs hidden behind filter)
- Tiptap editor toolbar configuration (which formatting options to include)
- Empty states for new series with no session history
- Keyboard shortcuts within the wizard

### Deferred Ideas (OUT OF SCOPE)
- AI-driven template generation
- Role-based template assignment
- Simplified Phase 6 (action items scope reduction)
- AI meeting minutes (Phase 7)
- Auto-email on completion (Phase 9)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| MEET-01 | Manager can create a 1:1 series by selecting themselves and a report | Series CRUD API + creation form; user search/select component; existing user query pattern |
| MEET-02 | Series has configurable cadence: weekly, biweekly, monthly, or custom interval | cadenceEnum already in schema; form with radio group + custom days input |
| MEET-03 | Series can have a default questionnaire template | defaultTemplateId FK already in schema; template select dropdown using existing templates API |
| MEET-04 | Series can have a preferred day and time | preferredDayEnum + preferredTime (TIME) already in schema |
| MEET-05 | Next session date is auto-computed based on cadence | computeNextSessionDate utility function; triggered on series creation and session completion |
| MEET-06 | Series lifecycle supports Active, Paused, and Archived states | seriesStatusEnum already in schema; status management API endpoints |
| SESS-01 | Manager can start a session for a scheduled meeting in a series | Creates session record, sets status to in_progress, opens wizard |
| SESS-02 | Session wizard presents questions in category groups with progress indicator | Category grouping logic from template questions; wizard shell with step navigation |
| SESS-03 | Context panel shows notes from last 3 sessions (collapsible) | API to fetch previous sessions for series; sidebar component with session data |
| SESS-04 | Context panel shows open action items from past sessions | Query action_items where status='open' for the series |
| SESS-05 | Context panel shows score trend sparklines (last 6 sessions) | Recharts mini LineChart; query session scores for series |
| SESS-06 | Appropriate input widget per question type | 6 widget components reusing Phase 4 question type knowledge; maps answerType to widget |
| SESS-07 | Both parties can add talking points | talkingPoints table already exists; inline form per category |
| SESS-08 | Shared notes with rich text editor | tiptap integration; stored in session.shared_notes (JSONB migration needed for per-category) |
| SESS-09 | Private notes encrypted at rest (AES-256-GCM) | encryptNote/decryptNote already implemented; private_note table exists |
| SESS-10 | User can create action items inline | action_item table exists; inline form with title, assignee, due date |
| SESS-11 | All answers and notes auto-save with 500ms debounce | useDebounce hook + mutation endpoints for each entity type |
| SESS-12 | Navigation supports next/previous and direct jump | Wizard step state management; URL-based or state-based navigation |
| SESS-13 | Summary screen shows recap of all answers, notes, action items | Read-only summary component grouping data by category |
| SESS-14 | Session score computed as average of numeric answers | Scoring utility from docs/questionnaires.md; normalization formula |
| SESS-15 | Manager confirms session completion from summary | Complete session API endpoint; status transition + next_session_at computation |
</phase_requirements>

## Standard Stack

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.1.6 | App Router, layouts, API routes | Project framework |
| React | 19.2.3 | UI rendering | Project framework |
| Drizzle ORM | 0.38.4 | Database queries | Project ORM |
| @tanstack/react-query | 5.90.21 | Server state management, mutations | Project pattern |
| react-hook-form | 7.71.2 | Form handling | Project pattern |
| zod | 4.3.6 | Validation schemas | Project pattern |
| shadcn/ui | 3.8.5 | UI components | Project pattern |
| lucide-react | 0.576.0 | Icons | Project pattern |
| sonner | 2.0.7 | Toast notifications | Project pattern |

### New Dependencies (Must Install)
| Library | Version | Purpose | Why Needed |
|---------|---------|---------|------------|
| @tiptap/react | latest | Rich text editor React bindings | CONTEXT.md locks tiptap for notes |
| @tiptap/pm | latest | ProseMirror dependencies | Required peer dep for tiptap |
| @tiptap/starter-kit | latest | Bold, italic, lists, headings, etc. | Base formatting extensions |
| @tiptap/extension-link | latest | Clickable links in notes | CONTEXT.md specifies link support |
| recharts | latest | Score trend sparklines | Project tech stack; needed for SESS-05 |

### Custom Utilities (Must Create)
| Utility | Location | Purpose |
|---------|----------|---------|
| useDebounce hook | `src/lib/hooks/use-debounce.ts` | 500ms auto-save debounce |
| computeNextSessionDate | `src/lib/utils/scheduling.ts` | Next session date calculation from cadence |
| computeSessionScore | `src/lib/utils/scoring.ts` | Normalize + average numeric answers |
| canManageSeries | `src/lib/auth/rbac.ts` | RBAC check for series management |

**Installation:**
```bash
bun add @tiptap/react @tiptap/pm @tiptap/starter-kit @tiptap/extension-link recharts
```

## Architecture Patterns

### Route Structure
```
src/app/
  (dashboard)/
    sessions/              # Series card grid (the "Sessions" nav item)
      page.tsx             # Server Component: card grid of all series
      new/
        page.tsx           # Create new series form
      [id]/                # Series detail page
        page.tsx           # Server Component: series settings + session history
  (session-wizard)/        # Separate route group with NO sidebar
    layout.tsx             # Full-page layout: no sidebar, minimal top bar
    wizard/[sessionId]/
      page.tsx             # Session wizard (the core experience)
  api/
    series/
      route.ts             # GET (list), POST (create)
      [id]/
        route.ts           # GET (detail), PATCH (update), DELETE (archive)
        start/
          route.ts         # POST: creates session + returns session ID
    sessions/
      [id]/
        route.ts           # GET (full session data), PATCH (update status)
        answers/
          route.ts         # PUT: upsert answer (auto-save)
        notes/
          route.ts         # PUT: upsert shared notes for category
          private/
            route.ts       # PUT: upsert private note for category
        talking-points/
          route.ts         # POST (create), PATCH (toggle discussed)
        action-items/
          route.ts         # POST (create), PATCH (update)
        complete/
          route.ts         # POST: compute score, mark complete, compute next_session_at
```

### Component Structure
```
src/components/
  series/
    series-card.tsx          # Card for series grid
    series-list.tsx          # Grid of series cards
    series-form.tsx          # Create/edit series form
    series-detail.tsx        # Settings + session history
    session-timeline.tsx     # Session history list on series detail
  session/
    wizard-shell.tsx         # Full-page wizard layout controller
    wizard-top-bar.tsx       # Exit, session info, save status
    wizard-navigation.tsx    # Bottom dots/tabs + prev/next
    category-step.tsx        # Single category screen (questions + notes + actions)
    recap-screen.tsx         # First screen: last meeting recap
    summary-screen.tsx       # Final screen: full recap + complete button
    question-widget.tsx      # Dispatcher: renders correct widget per answerType
    widgets/
      text-widget.tsx        # Free text textarea
      rating-1-5-widget.tsx  # Star/circle rating
      rating-1-10-widget.tsx # Horizontal slider or numbered buttons
      yes-no-widget.tsx      # Two large buttons
      multiple-choice-widget.tsx  # Radio/checkbox group
      mood-widget.tsx        # Emoji picker (5 emojis)
    notes-editor.tsx         # Tiptap rich text + private toggle
    action-item-inline.tsx   # Inline action item capture form
    talking-point-list.tsx   # Checkable talking points list
    context-panel.tsx        # Right sidebar with history context
    question-history-dialog.tsx  # Per-question history popup
    score-sparkline.tsx      # Recharts mini line chart
    save-status.tsx          # "Saving..." / "Saved" indicator
```

### Critical Pattern: Wizard Layout (Separate Route Group)

The wizard needs a full-page immersive layout WITHOUT the sidebar. Use a separate Next.js route group `(session-wizard)` with its own `layout.tsx` that does NOT include the `<Sidebar />` component.

```typescript
// src/app/(session-wizard)/layout.tsx
export default async function WizardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <SessionProvider session={session}>
      <QueryProvider>
        <div className="flex min-h-screen flex-col">
          {children}
        </div>
        <Toaster />
      </QueryProvider>
    </SessionProvider>
  );
}
```

### Critical Pattern: Category Grouping

Questions are grouped by their `category` field from `template_question`. The wizard creates one "step" per unique category, ordered by the first question's `sortOrder` in that category.

```typescript
// Group template questions by category, preserving sort order
function groupQuestionsByCategory(questions: TemplateQuestion[]) {
  const groups = new Map<string, TemplateQuestion[]>();

  // Questions are already sorted by sortOrder from the API
  for (const q of questions) {
    if (!groups.has(q.category)) {
      groups.set(q.category, []);
    }
    groups.get(q.category)!.push(q);
  }

  // Return as array of [category, questions] pairs
  // Order determined by first question's appearance in sortOrder
  return Array.from(groups.entries());
}
```

### Critical Pattern: Auto-Save with Debounce

Each entity type (answers, notes, talking points, action items) auto-saves independently via debounced mutations.

```typescript
// src/lib/hooks/use-debounce.ts
import { useState, useEffect } from "react";

export function useDebounce<T>(value: T, delay = 500): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timeout);
  }, [value, delay]);
  return debouncedValue;
}
```

Usage pattern in a widget:
```typescript
const [localValue, setLocalValue] = useState(initialAnswer);
const debouncedValue = useDebounce(localValue, 500);

useEffect(() => {
  if (debouncedValue !== initialAnswer) {
    saveAnswer.mutate({ questionId, value: debouncedValue });
  }
}, [debouncedValue]);
```

### Critical Pattern: Tiptap in Next.js (SSR Safety)

```typescript
"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";

interface NotesEditorProps {
  content: string;
  onChange: (html: string) => void;
}

export function NotesEditor({ content, onChange }: NotesEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
    ],
    content,
    immediatelyRender: false, // CRITICAL: prevents SSR hydration mismatch
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  return <EditorContent editor={editor} />;
}
```

### Critical Pattern: Per-Category Data Storage (Schema Migration Required)

**Problem:** CONTEXT.md specifies per-category notes, talking points, and action items, but the existing schema does not support this.

**Current schema constraints:**
- `session.shared_notes` is TEXT (single field for entire session)
- `private_note` has UNIQUE(session_id, author_id) -- one per user per session
- `talking_point` has no category field
- `action_item` has no category field

**Recommended solution:**

1. **shared_notes**: Change from TEXT to JSONB. Store as `{ "wellbeing": "<html>...", "performance": "<html>...", ... }`. This preserves the single-column approach but supports per-category data. The migration is backward-compatible (existing TEXT values become legacy, new wizard always writes JSONB).

2. **private_note**: Change UNIQUE constraint from `(session_id, author_id)` to `(session_id, author_id, category)`. Add a `category` VARCHAR column. Each category gets its own encrypted note record.

3. **talking_point**: Add optional `category` VARCHAR column. When created within a category screen, store the category. When displayed on the recap screen, show all talking points.

4. **action_item**: Add optional `category` VARCHAR column. Same approach.

**Migration plan:**
```sql
-- shared_notes: TEXT -> JSONB (allow null, wizard writes JSONB, read handles both)
ALTER TABLE session ALTER COLUMN shared_notes TYPE JSONB USING
  CASE WHEN shared_notes IS NOT NULL
    THEN jsonb_build_object('general', shared_notes)
    ELSE NULL
  END;

-- private_note: add category, update unique constraint
ALTER TABLE private_note ADD COLUMN category VARCHAR(50);
DROP INDEX private_note_session_author_idx;
CREATE UNIQUE INDEX private_note_session_author_category_idx
  ON private_note (session_id, author_id, category);

-- talking_point: add category
ALTER TABLE talking_point ADD COLUMN category VARCHAR(50);

-- action_item: add category
ALTER TABLE action_item ADD COLUMN category VARCHAR(50);
```

### Anti-Patterns to Avoid
- **Overloading a single mutation endpoint:** Do NOT try to save all wizard data (answers + notes + action items + talking points) through a single endpoint. Each entity type gets its own auto-save endpoint. This prevents data loss from partial failures and simplifies retry logic.
- **URL-based wizard step state:** Do NOT put the current step in the URL. The wizard is a single page with internal state. URL changes would cause full-page re-renders and lose unsaved data. Use React state.
- **Loading all historical sessions eagerly:** The context panel shows data from last 3-6 sessions. Fetch this data once when the wizard loads, not on every step change. Cache it in the wizard shell component.
- **Encrypting notes client-side:** Private note encryption happens server-side only (in the API route). The client sends plaintext; the server encrypts before storing. This keeps the encryption key out of the browser.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Rich text editing | Custom contentEditable wrapper | tiptap (@tiptap/react + starter-kit) | Content sanitization, cursor management, paste handling, mobile support -- thousands of edge cases |
| Debounce timing | Manual setTimeout tracking | useDebounce hook (simple but proven pattern) | Memory leak avoidance on unmount, proper cleanup |
| Note encryption | Custom crypto implementation | Existing encryptNote/decryptNote from src/lib/encryption/ | Already built and tested in Phase 1 |
| Sparkline charts | Custom SVG path generation | Recharts LineChart with hidden axes | Responsive, accessible, consistent with future analytics |
| Date/cadence math | Manual day-of-week arithmetic | Built-in Date + simple utility | Keep simple -- getDay(), setDate(), preferred day alignment |
| Form validation | Manual state checks | zod + react-hook-form | Existing project pattern, shared client/server schemas |

**Key insight:** The wizard is primarily a composition of existing patterns (API routes, mutations, TanStack Query, Zod validation) with two genuinely new concerns: tiptap rich text and the multi-step wizard shell. Everything else follows established project conventions.

## Common Pitfalls

### Pitfall 1: Tiptap SSR Hydration Mismatch
**What goes wrong:** Editor renders server-side HTML that differs from client-side initial state, causing React hydration errors.
**Why it happens:** Tiptap uses the DOM to render, which is not available during SSR.
**How to avoid:** Always set `immediatelyRender: false` in the useEditor config. This defers rendering to client-side only.
**Warning signs:** Console errors about "hydration mismatch" or "text content does not match."

### Pitfall 2: Auto-Save Race Conditions
**What goes wrong:** User types rapidly, multiple debounced saves fire, later value overwrites newer value due to network ordering.
**Why it happens:** Network latency varies; earlier request may arrive after later request.
**How to avoid:** Use optimistic updates with TanStack Query. Each save carries a timestamp or version; the server ignores stale saves. Alternatively, serialize saves per field using `useMutation` with `onSettled` chaining.
**Warning signs:** User sees a value "revert" after saving.

### Pitfall 3: Lost Data on Browser Close
**What goes wrong:** User closes browser tab while debounce timer is pending; data not yet saved.
**Why it happens:** 500ms debounce means there is always a window of unsaved data.
**How to avoid:** Add `beforeunload` event listener that triggers an immediate save (bypassing debounce) when the user tries to leave. Also add `visibilitychange` handler for tab switches.
**Warning signs:** User reports "I typed something and it disappeared."

### Pitfall 4: Private Note Key Derivation Performance
**What goes wrong:** Each private note encrypt/decrypt calls deriveTenantKey, which calls HKDF. On a page with 9 categories, this is 9 decrypt operations.
**Why it happens:** HKDF is intentionally slow for security.
**How to avoid:** Cache the derived key for the duration of the request. In the API route handler, derive once and pass to all encrypt/decrypt calls within that request.
**Warning signs:** Slow wizard load times, especially the summary screen.

### Pitfall 5: Category Ordering Inconsistency
**What goes wrong:** Categories appear in different order in wizard vs summary vs context panel.
**Why it happens:** Using `Object.keys()` or `Map` iteration without explicit ordering.
**How to avoid:** Define a canonical category order constant (matching the enum order in schema/enums.ts). Use it everywhere categories are displayed.
**Warning signs:** "The summary doesn't match the order I filled things in."

### Pitfall 6: Conditional Questions in Category Grouping
**What goes wrong:** A conditional question depends on a question in a DIFFERENT category. The condition cannot be evaluated because the dependent answer is on a different screen.
**Why it happens:** Template editor allows cross-category conditional references.
**How to avoid:** When the wizard loads, evaluate ALL conditions based on current answers (not just current category). Re-evaluate on every answer change across all categories. Track all answers in wizard-level state, not per-category state.
**Warning signs:** Conditional question never appears or always appears regardless of the parent answer.

### Pitfall 7: Score Computation with Mixed Question Types
**What goes wrong:** Session score is wrong because different answer types have different scales (1-5, 1-10, 0-1 for yes/no).
**Why it happens:** Averaging raw values without normalization.
**How to avoid:** Follow the normalization formula from docs/questionnaires.md: normalize all numeric answers to 1-5 scale before averaging.
**Warning signs:** A session with all "5/5" ratings plus one "10/10" rating shows score > 5.

## Code Examples

### Series Card Component Pattern
```typescript
// Following the existing card grid pattern from the teams page
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

interface SeriesCardProps {
  series: {
    id: string;
    report: { firstName: string; lastName: string; avatarUrl: string | null };
    cadence: string;
    nextSessionAt: string | null;
    status: string;
    latestSession?: { status: string; sessionNumber: number };
  };
}

export function SeriesCard({ series }: SeriesCardProps) {
  const hasInProgress = series.latestSession?.status === "in_progress";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-3">
        <Avatar>
          <AvatarImage src={series.report.avatarUrl ?? undefined} />
          <AvatarFallback>
            {series.report.firstName[0]}{series.report.lastName[0]}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <CardTitle className="text-base">
            {series.report.firstName} {series.report.lastName}
          </CardTitle>
          <p className="text-sm text-muted-foreground capitalize">{series.cadence}</p>
        </div>
        <Badge variant={series.status === "active" ? "default" : "secondary"}>
          {series.status}
        </Badge>
      </CardHeader>
      <CardContent>
        {/* Next session date, Start/Resume button */}
        <Button variant={hasInProgress ? "outline" : "default"}>
          {hasInProgress ? "Resume" : "Start Session"}
        </Button>
      </CardContent>
    </Card>
  );
}
```

### Answer Upsert API Pattern
```typescript
// PUT /api/sessions/[id]/answers
// Upserts a single answer (auto-save pattern)
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { id: sessionId } = await params;
  const body = await request.json();
  const data = answerUpsertSchema.parse(body);

  const result = await withTenantContext(
    session.user.tenantId,
    session.user.id,
    async (tx) => {
      // Verify user is manager or report on this session's series
      // ... authorization check ...

      const [answer] = await tx
        .insert(sessionAnswers)
        .values({
          sessionId,
          questionId: data.questionId,
          respondentId: session.user.id,
          answerText: data.answerText ?? null,
          answerNumeric: data.answerNumeric ?? null,
          answerJson: data.answerJson ?? null,
          skipped: data.skipped ?? false,
        })
        .onConflictDoUpdate({
          target: [sessionAnswers.sessionId, sessionAnswers.questionId],
          set: {
            answerText: sql`excluded.answer_text`,
            answerNumeric: sql`excluded.answer_numeric`,
            answerJson: sql`excluded.answer_json`,
            skipped: sql`excluded.skipped`,
            answeredAt: sql`now()`,
          },
        })
        .returning();

      return answer;
    }
  );

  return NextResponse.json(result);
}
```

**Note on answer upsert:** The session_answer table does not currently have a UNIQUE constraint on `(session_id, question_id)`. This needs to be added for onConflictDoUpdate to work. Add to the migration.

### Next Session Date Computation
```typescript
// src/lib/utils/scheduling.ts
const CADENCE_DAYS: Record<string, number> = {
  weekly: 7,
  biweekly: 14,
  monthly: 30, // approximation; use actual month arithmetic
};

const DAY_MAP: Record<string, number> = {
  mon: 1, tue: 2, wed: 3, thu: 4, fri: 5,
};

export function computeNextSessionDate(
  lastSessionDate: Date,
  cadence: string,
  cadenceCustomDays: number | null,
  preferredDay: string | null
): Date {
  const intervalDays = cadence === "custom"
    ? (cadenceCustomDays ?? 14)
    : cadence === "monthly"
      ? null // handle monthly specially
      : CADENCE_DAYS[cadence];

  let next: Date;
  if (cadence === "monthly") {
    next = new Date(lastSessionDate);
    next.setMonth(next.getMonth() + 1);
  } else {
    next = new Date(lastSessionDate.getTime() + (intervalDays! * 24 * 60 * 60 * 1000));
  }

  // Align to preferred day if set
  if (preferredDay) {
    const targetDay = DAY_MAP[preferredDay];
    const currentDay = next.getDay();
    // getDay() returns 0=Sun, 1=Mon, etc.
    const diff = targetDay - (currentDay === 0 ? 7 : currentDay);
    if (diff !== 0) {
      // Move forward to the next occurrence of preferred day
      next.setDate(next.getDate() + ((diff + 7) % 7 || 7));
    }
  }

  return next;
}
```

### Session Score Normalization
```typescript
// src/lib/utils/scoring.ts
// From docs/questionnaires.md scoring logic
export function normalizeAnswer(answerType: string, value: number): number {
  switch (answerType) {
    case "rating_1_5":
    case "mood":
      return value; // already 1-5
    case "rating_1_10":
      return ((value - 1) / 9) * 4 + 1; // normalize 1-10 to 1-5
    case "yes_no":
      return value * 4 + 1; // 0 -> 1, 1 -> 5
    default:
      return value;
  }
}

export function computeSessionScore(
  answers: Array<{ answerType: string; answerNumeric: number | null; skipped: boolean }>
): number | null {
  const numericAnswers = answers
    .filter((a) => a.answerNumeric !== null && !a.skipped)
    .map((a) => normalizeAnswer(a.answerType, a.answerNumeric!));

  if (numericAnswers.length === 0) return null;
  return numericAnswers.reduce((sum, v) => sum + v, 0) / numericAnswers.length;
}
```

### Recharts Sparkline (No Axes)
```typescript
// Minimal sparkline using Recharts
import { LineChart, Line, ResponsiveContainer } from "recharts";

interface SparklineProps {
  data: number[];
  color?: string;
}

export function ScoreSparkline({ data, color = "hsl(var(--primary))" }: SparklineProps) {
  const chartData = data.map((value, index) => ({ index, value }));

  return (
    <ResponsiveContainer width="100%" height={40}>
      <LineChart data={chartData}>
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| tiptap v1 (class-based) | tiptap v2+ (headless, extension-based) | 2022+ | Must use `@tiptap/react`, not old `tiptap` package |
| Quill/Draft.js for rich text | tiptap (ProseMirror-based) | 2023+ | Better TypeScript support, modular extensions, smaller bundle |
| Per-field save buttons | Auto-save with debounce | Standard pattern | No save button in wizard; every change auto-persists |
| Multi-page wizard (separate routes) | Single-page wizard (React state) | Modern SPA pattern | Prevents data loss, enables instant navigation |

**Deprecated/outdated:**
- `tiptap` (v1 package): Use `@tiptap/react` instead
- `react-quill`: Quill has maintenance issues; tiptap is the modern choice
- `draftjs`: Facebook deprecated; do not use

## Open Questions

1. **Answer upsert unique constraint**
   - What we know: `session_answer` table has an index on `(session_id, question_id)` but NOT a UNIQUE constraint. onConflictDoUpdate requires a unique constraint or primary key.
   - What's unclear: Can we add a UNIQUE constraint to existing data without conflicts? The seed data should be clean (one answer per question per session), but need to verify.
   - Recommendation: Add the UNIQUE constraint in the schema migration. Verify seed data has no duplicates first.

2. **Per-category notes storage vs per-session notes**
   - What we know: CONTEXT.md clearly says per-category notes. Existing schema has per-session.
   - What's unclear: Whether the product owner is aware of the schema gap.
   - Recommendation: Migrate `shared_notes` to JSONB keyed by category. This is the cleanest solution that preserves backward compatibility with existing seed data.

3. **Tiptap content format (HTML vs JSON)**
   - What we know: Tiptap can store content as HTML (getHTML()) or JSON (getJSON()). HTML is simpler for display; JSON is better for querying/manipulation.
   - What's unclear: Which format to use for shared_notes storage.
   - Recommendation: Store as HTML string. It's simpler, renders directly, and we don't need to query within note content. The AI summary (Phase 7) can parse HTML easily.

4. **Wizard state management approach**
   - What we know: The wizard manages state for answers across all categories, notes per category, action items per category, and talking points per category.
   - What's unclear: Whether to use a single useReducer at the wizard-shell level or separate state per category step.
   - Recommendation: Use a single wizard-level state (useReducer) that holds all answers, notes, action items, and talking points. Pass down per-category slices to each step. This ensures cross-category conditional logic works and the summary screen has all data.

## Sources

### Primary (HIGH confidence)
- Existing codebase: `src/lib/db/schema/` (all 6 relevant table schemas verified)
- Existing codebase: `src/lib/encryption/private-notes.ts` (encryption pattern verified)
- Existing codebase: `src/app/api/templates/route.ts` (API route pattern verified)
- Existing codebase: `src/components/templates/template-editor.tsx` (component pattern verified)
- [Tiptap React installation guide](https://tiptap.dev/docs/editor/getting-started/install/react)
- [Tiptap Next.js guide](https://tiptap.dev/docs/editor/getting-started/install/nextjs) - `immediatelyRender: false` for SSR
- [Tiptap StarterKit extensions](https://tiptap.dev/docs/editor/extensions/functionality/starterkit) - includes bold, italic, lists, headings, blockquote
- [Tiptap extension-link](https://www.npmjs.com/package/@tiptap/extension-link) - separate package needed
- Project docs: `docs/questionnaires.md` (scoring logic, normalization formula)
- Project docs: `docs/ux-flows.md` (wizard wireframes, layout decisions)
- Project docs: `docs/data-model.md` (table definitions, indexes)

### Secondary (MEDIUM confidence)
- [Recharts LineChart](https://recharts.github.io/en-US/examples/SimpleLineChart/) - sparkline via minimal config
- [useDebounce pattern](https://usehooks.com/usedebounce) - standard React hook pattern

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all libraries verified against existing codebase and official docs
- Architecture: HIGH - route structure follows established Next.js App Router patterns; wizard layout is a standard separate route group
- Data model migration: HIGH - gap clearly identified, solution is straightforward JSONB + column additions
- Pitfalls: HIGH - based on known tiptap SSR issues, auto-save race conditions, and codebase-specific patterns
- Scoring logic: HIGH - formula documented in project's own docs/questionnaires.md

**Research date:** 2026-03-04
**Valid until:** 2026-04-04 (stable domain, no fast-moving dependencies)
