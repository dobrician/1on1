# Phase 10: Integration & Polish - Research

**Researched:** 2026-03-05
**Domain:** Dark mode, design overhaul (shadcn dashboard reference), wizard restructure, E2E verification, responsive polish
**Confidence:** HIGH

## Summary

Phase 10 transforms the application from functional to polished. The codebase already has dark mode infrastructure (next-themes, ThemeProvider, CSS variables with oklch light/dark variants, `@custom-variant dark` for Tailwind 4) -- the work is auditing and fixing hardcoded colors, restructuring the dashboard layout from left sidebar to top nav (matching shadcn dashboard reference), restructuring the wizard to use a left step sidebar with floating context widgets, adding org-level color themes, refactoring chart palettes to monochrome/theme-derived, writing Playwright E2E tests for the critical user journey, and general responsive/UI polish.

The project uses shadcn/ui's CSS variable-based theming with oklch colors. The existing `globals.css` defines complete light and dark variable sets for all shadcn tokens including chart-1 through chart-5 and sidebar variants. The current Neutral base color is zero-chroma achromatic -- ideal for the grayscale aesthetic requested. Org-level themes will swap CSS variable sets at runtime, stored in tenant settings JSONB.

**Primary recommendation:** Execute in this order: (1) dark mode audit + fixes, (2) org color theme infrastructure, (3) dashboard nav restructure to top nav, (4) wizard layout restructure, (5) chart palette refactor to monochrome, (6) responsive polish pass, (7) E2E Playwright tests covering critical path, (8) bug fixes from verification.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- Dark mode infrastructure already exists (next-themes, ThemeProvider, ThemeToggle, CSS variables)
- Toggle simplified to two-way (light/dark), system preference as default before user touches it
- Toggle in header only (localStorage persistence via next-themes, no server-side storage)
- Toggle also added to wizard top bar (accessible during sessions)
- No org-level theme forcing -- personal preference only
- Main navigation moves from left sidebar to top horizontal nav bar
- Key items in top bar (primary nav), remaining items in dropdown/grouped menu
- Main sidebar becomes icon-only collapsible mode (like VS Code/Linear) -- available as fallback
- Org-level shadcn color theme setting: admin picks a color theme (Zinc, Slate, Stone, Neutral, Blue, Green, etc.)
- Charts derive palette from active org theme -- primary color with opacity variations
- Dashboard should emulate the clean, professional look of the shadcn dashboard example
- Category navigation becomes a left vertical sidebar of steps (like multi-step form patterns)
- Slide transitions between category screens + per-category completion status indicators
- Context panel replaced by floating collapsible card widgets on the right of the page (not a fixed sidebar)
- On mobile: context widgets stack below the form; bottom sheet pattern for context access
- Automated Playwright tests covering critical path: register org -> invite user -> create template -> create series -> run session -> view AI summary -> check dashboard -> receive email
- Edge cases: empty states across all screens, RBAC boundary enforcement, auth edge cases
- Docker blue-green deployment verification included
- Emails: don't force colors -- layout and typography only, let email clients handle dark mode
- Subtle transitions only: fade-in on page load, smooth hover states, skeleton shimmer -- Apple-like restraint
- No favicon/OG meta, no keyboard shortcut additions, no custom error pages

### Claude's Discretion
- Dark mode audit approach and fix priorities
- Chart color implementation (CSS vars vs useTheme)
- Tiptap dark mode styling approach
- Top nav item grouping (primary vs dropdown)
- Polish priority ordering based on visual audit
- Responsive breakpoints and collapse behavior
- Animation/transition library choice (CSS vs framer-motion)
- Wizard step sidebar responsive behavior on small screens

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INFR-05 | Dark mode support via Tailwind CSS dark: variants | Dark mode infrastructure exists; audit for hardcoded colors in analytics components (hsl values found in 6 chart files), Tiptap editor, and custom styles. CSS variable system already supports dark: via `@custom-variant dark (&:is(.dark *))` |

</phase_requirements>

## Standard Stack

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next-themes | 0.4.6 | Theme toggling (light/dark) | Already configured, localStorage persistence, SSR-safe |
| tailwindcss | 4.x | CSS framework with dark: variant | Already using `@custom-variant dark` for Tailwind 4 |
| shadcn/ui | 3.8.5 (CLI) | Component library with CSS var theming | All 40+ components already support dark mode via CSS vars |
| recharts | 3.7.0 | Charts/data visualization | Already installed, needs color refactor |
| @playwright/test | 1.58.2 | E2E testing | Already in devDependencies with config |

### Supporting (May Need)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| CSS transitions | native | Subtle animations (fade, slide) | Preferred over framer-motion for Apple-like restraint |
| framer-motion | - | Complex animations | Only if CSS transitions insufficient for wizard slide transitions |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| framer-motion | CSS transitions + `tw-animate-css` | CSS is lighter, already have tw-animate-css. Use CSS for simple fade/hover. Only add framer-motion if wizard slide transitions need complex orchestration |
| Custom theme system | tweakcn or shadcn-custom-theme | Unnecessary complexity -- CSS variable swap is straightforward for 5-6 preset themes |

**Installation:**
```bash
# No new dependencies needed for core work
# If framer-motion is needed (discretion):
bun add framer-motion
```

## Architecture Patterns

### Dashboard Layout Restructure

Current layout (`src/app/(dashboard)/layout.tsx`):
```
┌────────────────────────────────┐
│ Sidebar (220px) │ Header      │
│                 │ Main content│
│                 │             │
└────────────────────────────────┘
```

Target layout (shadcn dashboard reference):
```
┌────────────────────────────────┐
│ Top Nav Bar (logo + nav + user)│
├────────────────────────────────┤
│ Main content                   │
│                                │
└────────────────────────────────┘
```

**Implementation approach:**
1. Create `top-nav.tsx` component replacing `sidebar.tsx` as primary navigation
2. Restructure `(dashboard)/layout.tsx`: remove Sidebar, add TopNav above main
3. Keep sidebar component available as icon-only collapsible (fallback, not default)
4. TopNav structure: Logo left, primary nav links center/left, SearchTrigger + ThemeToggle + UserMenu right
5. Group nav: primary (Overview, Sessions, Action Items, History, Analytics) + Settings dropdown (People, Templates, Company, Audit Log)

### Wizard Layout Restructure

Current wizard layout:
```
┌──────────────────────────────────────────┐
│ WizardTopBar                             │
├──────────────────────┬───────────────────┤
│ CategoryStep (form)  │ ContextPanel      │
│                      │ (320px sidebar)   │
├──────────────────────┴───────────────────┤
│ WizardNavigation (bottom bar w/ tabs)    │
└──────────────────────────────────────────┘
```

Target wizard layout:
```
┌──────────────────────────────────────────────────────┐
│ WizardTopBar (+ ThemeToggle)                         │
├────────┬─────────────────────────────────────────────┤
│ Steps  │ CategoryStep (form)    [Floating Context    │
│ Sidebar│                         Widgets]            │
│ (left) │                                             │
│        │ ┌──────────┐                                │
│ Recap  │ │ Prev/Next│  <- repositioned buttons       │
│ Cat 1  │ └──────────┘                                │
│ Cat 2  │                                             │
│ Cat 3  │                                             │
│ Summary│                                             │
└────────┴─────────────────────────────────────────────┘
```

**Key changes:**
1. `WizardNavigation` bottom bar removed; step navigation moves to left vertical sidebar
2. Category tabs become vertical list with completion indicators (checkmarks, answered counts)
3. Prev/Next buttons move inline with form content (below questions or sticky bottom of content area)
4. `ContextPanel` transforms from fixed 320px sidebar to floating collapsible card widgets
5. Context widgets position: right side of content area, flowing with page scroll
6. Mobile: step sidebar collapses to top horizontal scrollable strip; context widgets stack below form with bottom sheet access

### Org Color Theme System

**Theme storage:** `tenant.settings` JSONB field -- add `colorTheme` key:
```typescript
settings: {
  timezone: string;
  defaultCadence: string;
  defaultDurationMinutes: number;
  preferredLanguage: string;
  colorTheme: "neutral" | "zinc" | "slate" | "stone" | "blue" | "green" | "rose" | "orange";
}
```

**Runtime theme application:**
1. Server Component reads tenant settings, passes `colorTheme` to client
2. Client-side `ThemeColorProvider` applies CSS variable overrides on `<html>` element
3. Each theme is a set of CSS variable overrides (primary, secondary, accent, chart colors)
4. Theme presets defined in a `theme-presets.ts` constants file
5. Charts read from CSS variables via `getComputedStyle` or direct `var(--chart-1)` references

**Theme preset structure (example for "blue"):**
```css
[data-theme="blue"] {
  --primary: oklch(0.546 0.245 262.881);
  --primary-foreground: oklch(0.985 0 0);
  --chart-1: oklch(0.546 0.245 262.881);
  --chart-2: oklch(0.546 0.2 262.881);
  --chart-3: oklch(0.546 0.15 262.881);
  --chart-4: oklch(0.546 0.1 262.881);
  --chart-5: oklch(0.546 0.05 262.881);
}
```

### Monochrome Chart Palette Pattern

**Current problem:** Chart components use hardcoded HSL colors:
- `category-breakdown.tsx`: 5 hardcoded HSL colors
- `adherence-chart.tsx`: 3 hardcoded HSL colors (green/amber/red)
- `velocity-chart.tsx`: hardcoded green HSL
- `team-heatmap.tsx` + `team-overview.tsx`: hardcoded conditional HSL colors
- `score-sparkline.tsx`: uses `hsl(var(--primary))` (partially correct but wrong format for oklch)

**Target:** Monochrome palette derived from org theme's primary color with opacity/lightness variations:
```typescript
// Use CSS variables directly
const chartColors = {
  primary: "var(--chart-1)",
  secondary: "var(--chart-2)",
  tertiary: "var(--chart-3)",
  quaternary: "var(--chart-4)",
  quinary: "var(--chart-5)",
};
```

For semantic colors (adherence: completed/cancelled/missed), use muted-foreground variants or keep minimal semantic colors that work in both themes.

### E2E Test Architecture

**Existing infrastructure:**
- Playwright configured at `playwright.config.ts` with `testDir: "./e2e"`
- Auth setup at `e2e/auth.setup.ts` (admin login, stored state)
- 5 existing test files: auth.setup, audit-log, invite, people, rbac, teams
- WebServer runs on port 4301 for tests
- Chromium only, depends on auth setup project

**Critical path test structure:**
```
e2e/
  auth.setup.ts          (existing)
  critical-path.spec.ts  (NEW - full user journey)
  dark-mode.spec.ts      (NEW - dark mode toggle verification)
  docker.spec.ts         (NEW - blue-green deployment check)
```

**Critical path test flow:**
1. Register new org (or use seeded admin)
2. Invite user via admin
3. Create questionnaire template
4. Create meeting series
5. Start and run session (answer questions)
6. Complete session, verify AI summary appears
7. Navigate to dashboard, verify stats
8. Check email delivery (verify API was called or check notification table)

### Anti-Patterns to Avoid
- **Hardcoded colors in components:** Replace all `hsl(...)` and `oklch(...)` literals in component code with CSS variable references
- **Fixed sidebar for context:** Don't rebuild a fixed sidebar; floating cards are the target
- **Complex animation library for simple transitions:** CSS transitions cover 90% of needs; don't add framer-motion unless wizard slide transitions prove complex
- **Testing against mocked data only:** E2E tests should hit real API routes and database
- **Org theme via className switching:** Use CSS custom properties (data attributes) for theme, not class-based switching which conflicts with dark mode class

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Theme persistence | Custom localStorage/cookie management | next-themes (already configured) | Handles SSR flash prevention, system detection |
| Color theme presets | Manual oklch calculations | Pre-defined CSS variable sets from shadcn/ui themes page | Already validated color combinations |
| E2E auth management | Custom cookie injection | Playwright `storageState` (already set up) | Handles auth token management correctly |
| Dark mode CSS | Per-component dark overrides | Tailwind `dark:` variant via CSS variables | Single source of truth in globals.css |
| Slide transitions | Custom JS animation loops | CSS `transition` + `transform` properties | GPU-accelerated, no JS overhead |

**Key insight:** The existing CSS variable system means dark mode and org themes are the SAME mechanism -- both swap CSS variables. Dark mode swaps via `.dark` class (next-themes), org theme swaps via `data-theme` attribute. They compose naturally.

## Common Pitfalls

### Pitfall 1: Hardcoded Colors Breaking Dark Mode
**What goes wrong:** Components use literal color values (found: 6 analytics components with hardcoded HSL). These don't respond to dark mode toggle.
**Why it happens:** Developers use semantic colors (green=good, red=bad) instead of CSS variables.
**How to avoid:** Grep for hardcoded colors: `hsl(`, `rgb(`, `#[0-9a-fA-F]`, `oklch(` in component files. Replace with CSS variable references or Tailwind classes.
**Warning signs:** Colors that look fine in light mode but have poor contrast or disappear in dark mode.

### Pitfall 2: Flash of Unstyled Content on Theme Change
**What goes wrong:** Theme change causes visible flash or unstyled frame.
**Why it happens:** next-themes uses class-based switching; if CSS variables are not properly scoped, transition can be visible.
**How to avoid:** `disableTransitionOnChange` is already set in ThemeProvider (good). Ensure all color references go through CSS variables, not computed JS values.
**Warning signs:** Visible color flash when toggling theme.

### Pitfall 3: Wizard Layout Regression on Screen Sizes
**What goes wrong:** Three-column layout (steps sidebar + form + floating widgets) doesn't fit on typical laptops (1366px).
**Why it happens:** Two sidebars + center content requires careful responsive breakpoints.
**How to avoid:** Design mobile-first: single column -> tablet (form + hidden steps) -> desktop (steps + form + widgets). Test at 1366px, 1024px, 768px breakpoints.
**Warning signs:** Horizontal scroll or cramped content on 13" laptop screens.

### Pitfall 4: Recharts Colors Not Responding to CSS Variables
**What goes wrong:** Recharts SVG elements don't inherit CSS variables the same way HTML elements do.
**Why it happens:** Recharts uses inline styles and SVG fill/stroke attributes.
**How to avoid:** Pass `var(--chart-1)` directly to `stroke` and `fill` props -- Recharts supports CSS custom properties in these props. The existing `score-trend-chart.tsx` already does this with `var(--primary)`. Verify it works by checking computed styles.
**Warning signs:** Charts showing wrong colors or no color after theme change.

### Pitfall 5: Tiptap Editor Not Inheriting Dark Mode
**What goes wrong:** Rich text editor has white background and dark text regardless of theme.
**Why it happens:** Tiptap's ProseMirror uses its own CSS that may not inherit parent CSS variables.
**How to avoid:** Style Tiptap via `.ProseMirror` CSS class in globals.css using Tailwind's `@apply` or direct CSS variable references. Ensure `.dark .ProseMirror` overrides exist.
**Warning signs:** Editor stands out as a bright rectangle in dark mode.

### Pitfall 6: E2E Tests Timing Out on AI Operations
**What goes wrong:** Critical path test hangs waiting for AI summary generation.
**Why it happens:** AI pipelines are async and may take 10-30 seconds.
**How to avoid:** Use longer timeouts for AI-dependent assertions or mock the AI API in E2E environment. Alternatively, poll for AI status with retry.
**Warning signs:** Flaky tests that pass locally but fail in CI.

## Code Examples

### Two-State Theme Toggle
```typescript
// Source: Existing ThemeToggle modified for two-state
"use client";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <Button variant="ghost" size="icon" className="h-9 w-9" disabled />;

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-9 w-9"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
```

### Org Theme CSS Variable Overrides
```css
/* Theme presets in globals.css */
[data-color-theme="zinc"] {
  --primary: oklch(0.442 0.017 285.786);
  --primary-foreground: oklch(0.985 0 0);
  --chart-1: oklch(0.442 0.017 285.786);
  --chart-2: oklch(0.552 0.014 285.786);
  --chart-3: oklch(0.662 0.010 285.786);
  --chart-4: oklch(0.772 0.007 285.786);
  --chart-5: oklch(0.882 0.003 285.786);
}

[data-color-theme="blue"] {
  --primary: oklch(0.546 0.245 262.881);
  --primary-foreground: oklch(0.985 0 0);
  --chart-1: oklch(0.546 0.245 262.881);
  --chart-2: oklch(0.596 0.196 262.881);
  --chart-3: oklch(0.646 0.147 262.881);
  --chart-4: oklch(0.696 0.098 262.881);
  --chart-5: oklch(0.746 0.049 262.881);
}

/* Dark mode overrides compose with color themes */
.dark [data-color-theme="blue"] {
  --primary: oklch(0.646 0.245 262.881);
  --primary-foreground: oklch(0.145 0 0);
  /* charts with adjusted lightness for dark backgrounds */
}
```

### Chart Refactor Pattern
```typescript
// Before (hardcoded):
const COLORS = ["hsl(220, 70%, 55%)", "hsl(280, 60%, 55%)"];

// After (CSS variable-based monochrome):
// Use chart CSS variables directly in Recharts
<Bar dataKey="score" fill="var(--chart-1)" />
<Bar dataKey="previous" fill="var(--chart-3)" />

// For semantic colors (good/bad), define semantic CSS vars:
// --color-success, --color-warning, --color-danger in globals.css
```

### Top Nav Component Pattern
```typescript
// Top nav structure following shadcn dashboard reference
<header className="sticky top-0 z-50 flex h-14 items-center gap-4 border-b bg-background px-4">
  <Link href="/overview" className="flex items-center gap-2 font-semibold">
    1on1
  </Link>
  <nav className="flex items-center gap-1">
    {primaryNavItems.map(item => (
      <Link key={item.href} href={item.href}
        className={cn("px-3 py-1.5 text-sm rounded-md transition-colors",
          isActive(item) ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"
        )}>
        {item.label}
      </Link>
    ))}
    <DropdownMenu>
      <DropdownMenuTrigger>Settings</DropdownMenuTrigger>
      <DropdownMenuContent>
        {settingsNavItems.map(/* ... */)}
      </DropdownMenuContent>
    </DropdownMenu>
  </nav>
  <div className="ml-auto flex items-center gap-2">
    <SearchTrigger />
    <ThemeToggle />
    <UserMenu />
  </div>
</header>
```

### Wizard Step Sidebar Pattern
```typescript
// Left step sidebar with completion indicators
<aside className="hidden md:flex w-[200px] shrink-0 flex-col border-r bg-muted/10 py-4">
  {stepNames.map((name, index) => {
    const isActive = index === currentStep;
    const isComplete = completionStatus[index]; // answered/total
    return (
      <button
        key={index}
        onClick={() => onStepChange(index)}
        className={cn(
          "flex items-center gap-3 px-4 py-2.5 text-sm transition-colors",
          isActive ? "bg-accent text-accent-foreground font-medium" : "text-muted-foreground hover:bg-accent/50"
        )}
      >
        <span className={cn("flex h-6 w-6 items-center justify-center rounded-full text-xs",
          isComplete ? "bg-primary text-primary-foreground" : "border"
        )}>
          {isComplete ? <Check className="h-3 w-3" /> : index + 1}
        </span>
        <span className="truncate">{name}</span>
      </button>
    );
  })}
</aside>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| HSL color format | OKLCH color format | shadcn/ui 2024+ | Already using oklch in globals.css -- consistent with ecosystem |
| Three-state theme toggle | Two-state (light/dark) + system default | UX convention 2024+ | Simpler UX; system pref detected on first visit, toggle is binary after |
| Fixed sidebar navigation | Top nav + collapsible sidebar | shadcn dashboard 2025 | Modern SaaS standard, more horizontal space for content |
| Bottom tab navigation (wizard) | Left step sidebar | Multi-step form pattern | Better step visibility, completion tracking, scalable to many steps |

**Deprecated/outdated:**
- `hsl(var(--primary))` pattern: The codebase has one instance in `score-sparkline.tsx` but globals.css uses oklch -- use `var(--primary)` directly instead
- Three-state theme toggle: Replaced by two-state with system as default

## Open Questions

1. **Framer Motion vs CSS transitions for wizard slide animations**
   - What we know: CSS transitions handle simple fade/slide. Wizard needs slide transition between category steps.
   - What's unclear: Whether CSS `transition: transform` with `translateX` provides smooth enough step-to-step sliding without layout shift
   - Recommendation: Start with CSS transitions. Add framer-motion only if slide transitions feel janky. The existing `tw-animate-css` package may provide sufficient animation utilities.

2. **Prev/Next button placement in new wizard layout**
   - What we know: Current bottom bar with tabs will be removed. User noted form inputs are too far from Next button on large displays.
   - What's unclear: Optimal button placement with left step sidebar + floating context widgets
   - Recommendation: Place Prev/Next buttons at the bottom of the form content area (not stuck to viewport bottom), centered with the form. This keeps them close to the last form input.

3. **Blue-green Docker deployment verification scope**
   - What we know: Docker compose already works with `app` service on port 4300
   - What's unclear: What "blue-green" means beyond "build image, start, verify loads + DB connects"
   - Recommendation: Test scope = build Docker image, start compose stack, verify HTTP 200 on `/api/health` or login page, verify DB connection. Not a full parallel deployment switch.

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `globals.css`, `theme-provider.tsx`, `theme-toggle.tsx`, `sidebar.tsx`, `wizard-shell.tsx`, `wizard-navigation.tsx`, `context-panel.tsx`, all analytics chart components
- shadcn/ui theming docs: https://ui.shadcn.com/docs/theming -- CSS variable structure, oklch format, base color presets
- shadcn/ui themes page: https://ui.shadcn.com/themes -- available color presets
- shadcn/ui dashboard example: https://ui.shadcn.com/examples/dashboard -- target design reference

### Secondary (MEDIUM confidence)
- next-themes GitHub: https://github.com/pacocoursey/next-themes -- two-state toggle, system preference, localStorage
- Playwright Next.js guide: https://nextjs.org/docs/app/guides/testing/playwright -- webServer config, test organization

### Tertiary (LOW confidence)
- Wizard responsive patterns with dual sidebars -- based on multi-step form UX patterns, needs validation at actual screen sizes

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already installed, no new dependencies needed
- Architecture (dashboard restructure): HIGH -- clear reference (shadcn dashboard), straightforward nav refactor
- Architecture (wizard restructure): MEDIUM -- dual sidebar + floating widgets is complex responsive challenge
- Dark mode: HIGH -- infrastructure exists, audit scope is clear (6 chart files + Tiptap)
- Org themes: HIGH -- CSS variable swap is well-documented shadcn pattern
- E2E tests: HIGH -- Playwright already configured with auth setup
- Pitfalls: HIGH -- identified from actual codebase analysis (hardcoded colors found)

**Research date:** 2026-03-05
**Valid until:** 2026-04-05 (stable -- no fast-moving dependencies)
