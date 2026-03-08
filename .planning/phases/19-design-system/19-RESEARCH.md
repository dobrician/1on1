# Phase 19: Design System - Research

**Researched:** 2026-03-08
**Domain:** shadcn/ui, Tailwind CSS 4, CVA variants, React component architecture
**Confidence:** HIGH

---

## Summary

Phase 19 makes four surgical design-system corrections to the existing codebase. None of them require new dependencies — all tools (shadcn Badge, Button, CVA, Tailwind, Lucide) are already present. The work divides cleanly into: (1) a global CSS token change for primary button color, (2) a badge variant audit across three components, (3) removing `uppercase tracking-wider` from five wizard section labels, and (4) building and wiring a single reusable `EmptyState` component to replace six inconsistent inline patterns.

The codebase already has a partially baked `EmptyState` pattern in `series-list.tsx` (icon + heading + description + CTA button) that is the canonical shape to extract. The global color system uses CSS custom properties in `globals.css` — both light and dark modes define `--primary` as monochrome (near-black/near-white respectively), while seven named color themes (`zinc`, `slate`, `stone`, `blue`, `green`, `yellow`, `orange`) override `--primary` via `data-color-theme` attribute. The auth pages use `Button` variant `default` which resolves to `bg-primary` — so the color is already token-driven and consistent, unless the audit found a specific hardcoded override (the requirement text says "choose monochrome or orange"). The key DES-01 work is confirming no hardcoded color classes bypass the token, not inventing a new color.

**Primary recommendation:** Extract the `series-list.tsx` dashed-border empty-state shape into `src/components/ui/empty-state.tsx`, audit and fix the four badge usages where `in_progress = "outline"` should become `"default"`, remove `uppercase` from the `SectionLabel` helper in `category-step.tsx` plus four sibling components, and verify auth+app buttons all resolve through `--primary`.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DES-01 | All primary CTA buttons use a single consistent color across auth and app pages | Confirmed: auth and app already use `Button variant="default"` → `bg-primary`. Fix is auditing for any className overrides that bypass the token. |
| DES-02 | "In progress" badge is visually heavier (filled) than "completed" (outlined) | Found: `session-timeline.tsx` line 29 sets `in_progress: "outline"` and `completed: "secondary"` — semantic weights are inverted. Flip to `in_progress: "default"` and `completed: "outline"`. |
| DES-03 | Wizard section headers use sentence-case — remove ALL-CAPS | Found: `SectionLabel` helper in `category-step.tsx:58` applies `uppercase tracking-wide`. Also in `summary-screen.tsx` (×3), `session-summary-view.tsx` (×4), `context-panel.tsx` (×1 grouping label), `floating-context-widgets.tsx` (×1 grouping label). The `SectionLabel` fix removes the root cause; siblings need individual line edits. |
| DES-04 | Reusable `EmptyState` component — icon, heading, description, optional CTA | Pattern already exists in `series-list.tsx:54-67`. Extract to `src/components/ui/empty-state.tsx` with typed props. Wire to: `session-timeline.tsx`, `recent-sessions.tsx`, `upcoming-sessions.tsx`, `template-list.tsx`, `action-items-page.tsx`, `teams-grid.tsx`, `audit-log-client.tsx`, `analytics/page.tsx`. |
</phase_requirements>

---

## Standard Stack

### Core (already installed — no new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| shadcn/ui Badge | current | Status badge primitives | Already used; `variant` prop drives visual weight |
| shadcn/ui Button | current | CTA buttons | Already used; `variant="default"` resolves to `bg-primary` |
| class-variance-authority (CVA) | current | Variant type safety | Badge and Button already use CVA |
| Tailwind CSS 4 | current | Utility classes | `uppercase`, `tracking-wide` classes to remove |
| Lucide React | current | Icon library | Used for existing empty-state icons |
| next-intl | current | i18n strings in components | EmptyState descriptions need translated strings |

**Installation:** No new packages needed.

---

## Architecture Patterns

### DES-01: Button Color Consistency

The design system uses CSS custom properties in `globals.css`. The `--primary` token is:
- Light mode: `oklch(0.205 0 0)` (near-black)
- Dark mode: `oklch(0.922 0 0)` (near-white)
- Per-tenant theme overrides: seven `[data-color-theme="*"]` blocks

Auth pages (`login/page.tsx`, `register/page.tsx`, `forgot-password/page.tsx`, etc.) and app pages all use `<Button>` with no variant specified (defaults to `"default"`), which maps to `bg-primary text-primary-foreground`. They are already token-consistent.

**The fix:** Audit all `<Button>` usages in auth pages for any raw `className="bg-blue-500"` or similar overrides that bypass the token. The UX audit's finding of inconsistency is likely that auth pages use a hardcoded color. Search pattern: `className.*bg-` on Button elements in `(auth)/` routes.

**Decision from requirements:** "choose monochrome (recommended) or orange and apply globally" — the existing default is already monochrome. If the audit revealed orange hardcoding, the fix is removing it. Do not add a new color; use the existing `--primary` token.

### DES-02: Badge Variant Semantics

Current mapping in `session-timeline.tsx`:

```typescript
// BEFORE (semantically wrong — in_progress is less prominent than completed)
const statusVariant = {
  completed: "secondary",   // filled but muted
  in_progress: "outline",   // least prominent
  scheduled: "outline",
  cancelled: "destructive",
  missed: "destructive",
};
```

Corrected mapping:

```typescript
// AFTER (in_progress is most prominent, completed fades out)
const statusVariant = {
  completed: "outline",     // outlined = low weight = done, past
  in_progress: "default",   // filled primary = active, needs attention
  scheduled: "outline",
  cancelled: "destructive",
  missed: "destructive",
};
```

Also check `series-card.tsx` `statusVariant` (maps series status `active/paused/archived`) — these map meeting series lifecycle, not session progress. `active: "secondary"` is acceptable as secondary state indicator. The requirement specifically targets "in progress" vs "completed" session badges.

### DES-03: Section Header Casing

Three components need `uppercase` class removed:

**`category-step.tsx` — `SectionLabel` helper (root cause):**
```typescript
// BEFORE
<div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">

// AFTER — remove "uppercase" and "tracking-wide" (tracking-wide serves uppercase only)
<div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
```

**`summary-screen.tsx` — three inline `<p>` tags (lines 307, 325, 359):**
```typescript
// BEFORE
<p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">

// AFTER
<p className="mb-1 text-xs font-medium text-muted-foreground">
```

**`session-summary-view.tsx` — four inline `<p>` tags (lines 380, 401, 435, 481):**
Same change: remove `uppercase tracking-wider`.

**`context-panel.tsx` and `floating-context-widgets.tsx` — grouping labels (not section headers):**
These use `text-[10px] font-medium text-muted-foreground uppercase tracking-wide` for session-group labels ("From session 3") — these are metadata labels, not section headers. The requirement says "wizard section headers" specifically. Keep these unchanged to avoid scope creep. Confirm with the success criteria: "Notes", "Talking Points", "Action Items" — these three come from `category-step.tsx` SectionLabel, not from context-panel.

### DES-04: EmptyState Component

**Pattern to extract (from `series-list.tsx`):**
```tsx
// Existing best-in-class pattern in the codebase
<div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
  <CalendarDays className="mb-4 h-12 w-12 text-muted-foreground/50" />
  <h3 className="mb-1 text-lg font-medium">{t("series.empty")}</h3>
  <p className="mb-4 text-sm text-muted-foreground">{t("series.emptyDesc")}</p>
  <Button asChild>
    <Link href="/sessions/new"><Plus className="mr-2 h-4 w-4" />{t("series.create")}</Link>
  </Button>
</div>
```

**Proposed `EmptyState` component API:**
```tsx
// src/components/ui/empty-state.tsx
interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>;
  heading: string;
  description?: string;
  action?: React.ReactNode;   // accepts <Button asChild><Link>...</Link></Button>
  className?: string;
}
```

**Sites to convert:**

| File | Current Pattern | Upgrade |
|------|----------------|---------|
| `series-list.tsx:54` | Full pattern (icon+h3+p+Button) | Replace with `<EmptyState>` |
| `recent-sessions.tsx:26` | Dashed border + icon + p + p | Replace with `<EmptyState>` |
| `upcoming-series-cards.tsx:25` | Dashed border + p + p | Replace with `<EmptyState>` |
| `upcoming-sessions.tsx:161` | Dashed border + p + p | Replace with `<EmptyState>` |
| `template-list.tsx:163` | Dashed border + h3 + p (no icon) | Replace with `<EmptyState>` |
| `action-items-page.tsx:272` | Dashed border + h2 + p (no icon) | Replace with `<EmptyState>` |
| `teams-grid.tsx:61` | Dashed border + h3 + p (no icon) | Replace with `<EmptyState>` |
| `audit-log-client.tsx:225` | Dashed border + p only | Replace with `<EmptyState>` |
| `analytics/page.tsx:196` | Card wrapper + icon + p | Replace with `<EmptyState>` |
| `session-timeline.tsx:49` | Bare `<p>` (no border/icon) | Upgrade to `<EmptyState>` |

### Recommended Project Structure Addition

```
src/
└── components/
    └── ui/
        └── empty-state.tsx   # NEW — shared empty state component
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Custom badge component | Hand-coded `<span>` with manual colors | `Badge` from `src/components/ui/badge.tsx` | CVA variants already defined; consistency |
| Custom color tokens | New CSS variables or Tailwind config | Existing `--primary` CSS token in `globals.css` | Token is already propagated to Button and all themed surfaces |
| Custom empty-state with animation | React Spring / Framer Motion | Plain Tailwind + Lucide icon | Phase is about visual consistency, not micro-animation |
| Icon library addition | Installing heroicons/phosphor-icons | Lucide React (already installed) | All existing icons are Lucide; don't split icon libraries |

---

## Common Pitfalls

### Pitfall 1: Breaking Theme Color Overrides When Fixing DES-01
**What goes wrong:** Adding `className="bg-primary"` directly to auth buttons (already the default) while the issue is actually a hardcoded non-token class that overrides it.
**Why it happens:** Misreading "inconsistency" as "missing token" when it's actually a "bypassed token."
**How to avoid:** Search specifically for non-`bg-primary` color classes on `<Button>` elements in auth routes. Fix by removing overrides, not adding new ones.
**Warning signs:** If `grep -rn "className.*bg-" src/app/\(auth\)` finds explicit color utilities on Button elements.

### Pitfall 2: Over-Removing `uppercase` from Non-Section-Header Labels
**What goes wrong:** Removing `uppercase` from session-group labels ("From session 3") in `context-panel.tsx` and `floating-context-widgets.tsx` along with the actual section headers.
**Why it happens:** The same `uppercase tracking-wide` pattern is used for both; a global search-and-replace catches both.
**How to avoid:** The requirement targets "Notes", "Talking Points", "Action Items" — the three labels from `SectionLabel` in `category-step.tsx`. Treat `context-panel.tsx` micro-labels as separate (they label session-group rows, not wizard sections).

### Pitfall 3: Making EmptyState Accept Raw Strings Instead of ReactNode for CTA
**What goes wrong:** `action?: string` (link href only) limits composability — phase 22 (ERR-01) needs to wire a "Back to Sessions" Button as CTA.
**Why it happens:** Premature simplification.
**How to avoid:** Accept `action?: React.ReactNode` so callers can pass `<Button asChild><Link>...</Link></Button>` freely. Phase 22 depends on this component.

### Pitfall 4: DES-02 Missing Badge Usages Outside session-timeline.tsx
**What goes wrong:** Fixing `session-timeline.tsx` but missing other files that render session status badges with the same wrong weighting.
**Why it happens:** Status badges are duplicated across timeline, history, and summary views.
**How to avoid:** After fixing `session-timeline.tsx`, grep for `in_progress.*outline\|outline.*in_progress` and `completed.*secondary` across all components.

---

## Code Examples

### EmptyState Component

```tsx
// src/components/ui/empty-state.tsx
import * as React from "react"
import { cn } from "@/lib/utils"

interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>
  heading: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({
  icon: Icon,
  heading,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center",
        className
      )}
    >
      {Icon && (
        <Icon className="mb-4 h-10 w-10 text-muted-foreground/50" />
      )}
      <h3 className="mb-1 text-lg font-medium">{heading}</h3>
      {description && (
        <p className="mb-4 text-sm text-muted-foreground">{description}</p>
      )}
      {action && <div>{action}</div>}
    </div>
  )
}
```

### Badge Fix (session-timeline.tsx)

```typescript
// BEFORE
const statusVariant: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  completed: "secondary",
  in_progress: "outline",
  scheduled: "outline",
  cancelled: "destructive",
  missed: "destructive",
}

// AFTER — in_progress gets "default" (filled primary), completed gets "outline" (low weight)
const statusVariant: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  completed: "outline",
  in_progress: "default",
  scheduled: "outline",
  cancelled: "destructive",
  missed: "destructive",
}
```

### SectionLabel Fix (category-step.tsx)

```tsx
// BEFORE
function SectionLabel({ icon: Icon, label }) {
  return (
    <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
      <Icon className="size-3.5" />
      {label}
    </div>
  )
}

// AFTER — sentence-case; tracking-wide removed (only useful with uppercase)
function SectionLabel({ icon: Icon, label }) {
  return (
    <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
      <Icon className="size-3.5" />
      {label}
    </div>
  )
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Inline empty-state markup per component | Shared `EmptyState` component | Phase 19 | One source of truth; phase 22 (ERR-01) reuses it |
| `uppercase tracking-wide` section labels | Sentence-case, no tracking | Phase 19 | Matches Apple-level minimalism design principle |
| `in_progress: "outline"` (least visible) | `in_progress: "default"` (most visible) | Phase 19 | Semantic weight matches actual urgency |

---

## Open Questions

1. **What exactly is inconsistent about auth button colors? (DES-01)**
   - What we know: Requirements say "choose monochrome (recommended) or orange." Current `--primary` is already monochrome. Auth pages use `Button` with default variant.
   - What's unclear: Were the screenshots showing a blue/orange override that was subsequently removed, or is there still a hardcoded class?
   - Recommendation: In Plan 01, grep auth route files for non-primary color utilities on Button elements. If none found, DES-01 is a verification task, not a code change.

2. **Should summary-screen.tsx and session-summary-view.tsx uppercase labels also be removed?**
   - What we know: The success criteria says "Wizard section headers use sentence-case: Notes, Talking Points, Action Items." Summary screen is not the wizard step view — it's the post-wizard recap.
   - What's unclear: Whether the audit screenshot showed uppercase in the summary too.
   - Recommendation: Remove `uppercase` from both summary screens as well — they display the same labels ("Notes", "Talking Points", "Action Items") and consistency is the goal.

3. **Does DES-04 apply to the `session-timeline.tsx` bare `<p>` empty state?**
   - What we know: `session-timeline.tsx:49` renders `<p className="py-8 text-center text-sm text-muted-foreground">{t("noSessions")}</p>` with no icon or border.
   - What's unclear: Whether this "blank whitespace" case is in scope.
   - Recommendation: Include it — upgrade to `EmptyState` for consistency even without a CTA.

---

## Validation Architecture

> `workflow.nyquist_validation` key is absent from `.planning/config.json` — treated as enabled.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (node environment) |
| Config file | `vitest.config.ts` |
| Quick run command | `bun run test` |
| Full suite command | `bun run test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DES-01 | Auth and app buttons use same primary color token | manual-only | Visual inspection + grep for className overrides | N/A |
| DES-02 | `in_progress` badge renders as `variant="default"` | unit | `bun run test -- --grep "badge"` | ❌ Wave 0 |
| DES-03 | SectionLabel has no `uppercase` class | unit | `bun run test -- --grep "section-label"` | ❌ Wave 0 |
| DES-04 | EmptyState renders icon, heading, description, CTA | unit | `bun run test -- --grep "empty-state"` | ❌ Wave 0 |

**Note on DES-01:** The button color consistency check is a grep/visual audit — Vitest cannot render JSX with real Tailwind CSS resolution. Mark as manual verification in the success criteria check.

**Note on DES-02, DES-03, DES-04:** These are pure UI component changes with no business logic. Unit tests verify the component contract (correct props rendered, correct variant applied), not visual output. Tests are lightweight and fast.

### Sampling Rate

- **Per task commit:** `bun run test`
- **Per wave merge:** `bun run test && bun run typecheck && bun run lint`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/components/ui/__tests__/empty-state.test.tsx` — covers DES-04 (renders icon, heading, description, action slot)
- [ ] `src/components/session/__tests__/section-label.test.tsx` — covers DES-03 (no uppercase class on SectionLabel)
- [ ] `src/components/series/__tests__/session-timeline-badge.test.tsx` — covers DES-02 (in_progress → "default" variant, completed → "outline" variant)

---

## Sources

### Primary (HIGH confidence)

- Direct codebase read — `src/components/ui/badge.tsx` — badge variant definitions
- Direct codebase read — `src/components/ui/button.tsx` — button variant definitions
- Direct codebase read — `src/app/globals.css` — CSS custom property tokens and theme overrides
- Direct codebase read — `src/components/series/session-timeline.tsx` — confirmed `in_progress: "outline"` and `completed: "secondary"` (inverted weights, lines 24-33)
- Direct codebase read — `src/components/session/category-step.tsx` — `SectionLabel` with `uppercase tracking-wide` (line 58)
- Direct codebase read — `src/components/session/summary-screen.tsx` — three `uppercase tracking-wider` occurrences (lines 307, 325, 359)
- Direct codebase read — `src/components/session/session-summary-view.tsx` — four `uppercase tracking-wider` occurrences
- Direct codebase read — `src/components/series/series-list.tsx` — canonical empty-state pattern (lines 52-67)
- Direct codebase read — `src/components/session/context-panel.tsx` — local `EmptyState` (message-only, line 92-96); NOT the full pattern

### Secondary (MEDIUM confidence)

- shadcn/ui Badge documentation: variants `default` (filled primary), `secondary` (filled muted), `outline` (bordered no fill) — standard semantic mapping
- Tailwind CSS 4 `uppercase` utility: applies `text-transform: uppercase` CSS property

### Tertiary (LOW confidence)

- None.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries are already in the codebase, no new dependencies
- Architecture: HIGH — all patterns sourced from direct codebase reads; no inference required
- Pitfalls: HIGH — pitfalls identified from actual code patterns found in the repo
- Validation: HIGH — vitest config confirmed, test paths are deterministic

**Research date:** 2026-03-08
**Valid until:** 2026-04-07 (stable stack — 30 days)
