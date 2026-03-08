# Phase 18: Critical Bugs - Research

**Researched:** 2026-03-08
**Domain:** Bug fixes — Tiptap rich text rendering, AI editor mobile layout, i18n namespace loading, development artifact removal
**Confidence:** HIGH

## Summary

Phase 18 fixes four specific, already-identified bugs in the codebase. Unlike exploratory phases, the root cause of every bug has been pinpointed by reading the source. No external research is needed — all bugs are internal code defects with known locations and straightforward fixes.

The bugs span four different subsystems: (1) the Tiptap-based notes renderer in the recap screen, (2) the AI template editor's side-by-side panel layout, (3) the next-intl message namespace loader missing `spec.json`, and (4) a leftover development placeholder div in the recap screen. Each fix is small and self-contained.

**Primary recommendation:** Fix bugs in isolation, one per plan. Verify each fix does not break adjacent functionality.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| BUG-01 | Wizard recap notes display formatted rich text instead of `[object Object]` | Root cause identified: `content` values in `sharedNotes` JSONB may be Tiptap JSON objects (not HTML strings). Fix: detect type at render time and call `generateHTML()` before `dangerouslySetInnerHTML`. |
| BUG-02 | AI template editor usable on screens narrower than 1024px | Root cause identified: `ai-editor-shell.tsx` has no responsive breakpoints — panels always render side-by-side with fixed pixel widths. Fix: stack vertically on mobile or add tab-based toggle. |
| BUG-03 | Templates schema page displays translated UI text | Root cause identified: `spec.json` exists in `messages/en/` and `messages/ro/` but is NOT imported in `src/i18n/request.ts`. One-line fix. |
| BUG-04 | Recap screen contains no dashed-border sparkline placeholder | Root cause identified: line 138-140 in `recap-screen.tsx` — a hardcoded `<div className="rounded-md border border-dashed ...">Score trend sparkline (Plan 03)</div>`. Delete it. |
</phase_requirements>

---

## Bug-by-Bug Root Cause Analysis

### BUG-01: `[object Object]` in Wizard Recap Notes

**Location:** `src/components/session/recap-screen.tsx` lines 104-125

**Root cause:** The `sharedNotes` column in the DB is `jsonb("shared_notes").$type<Record<string, string> | null>()`. The current `notes-editor.tsx` saves HTML strings via `editor.getHTML()`. However, the column was likely seeded or written at some earlier point with Tiptap JSON document objects as values. When a JSON object is used as the `__html` value in `dangerouslySetInnerHTML={{ __html: content }}`, JavaScript coerces the object to string, producing `[object Object]`.

**The current render code (broken for JSON values):**
```tsx
<div
  className="prose prose-sm max-w-none dark:prose-invert"
  dangerouslySetInnerHTML={{ __html: content }}
/>
```
Where `content` is typed `string` but may actually be a Tiptap JSON object at runtime.

**Fix:** Before rendering, detect whether `content` is an object (Tiptap JSON) or a string (HTML). If it is an object, call `generateHTML(content, extensions)` from `@tiptap/core` to convert it to HTML. If it is already a string, use it directly.

**Tiptap version in use:** `@tiptap/core`, `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-link` — all at `^3.20.0`. `generateHTML` is exported from `@tiptap/core`.

**Extensions needed for `generateHTML`:** Must match the extensions used by `NotesEditor` — `StarterKit` and `Link.configure({ openOnClick: false })`.

**Important:** `generateHTML` runs on the server or client. The recap screen is a Client Component (`"use client"`), so it can import from `@tiptap/core` safely.

**Pattern (from `@tiptap/core` API):**
```typescript
import { generateHTML } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";

function toHtml(content: string | object): string {
  if (typeof content === "string") return content;
  // content is a Tiptap JSON document
  return generateHTML(content as Parameters<typeof generateHTML>[0], [
    StarterKit,
    Link.configure({ openOnClick: false }),
  ]);
}
```

**Safety note:** CLAUDE.md flags `dangerouslySetInnerHTML` as a known XSS risk across 9 sites. This phase does NOT add DOMPurify (that is a separate security concern tracked in CONCERNS.md). The fix scope is limited to `[object Object]` rendering — only add `generateHTML()` conversion.

---

### BUG-02: AI Template Editor Not Usable on Mobile

**Location:** `src/components/templates/ai-editor/ai-editor-shell.tsx`

**Root cause:** The main content area is:
```tsx
<div className="flex flex-1 overflow-hidden">
  {/* Left: Template Preview — takes remaining space */}
  <div className="flex-1 overflow-y-auto p-6">...</div>

  {/* Drag handle — mouse-only, invisible on touch */}
  <div className="w-1 shrink-0 cursor-col-resize ..." onMouseDown={handleDragStart} />

  {/* Right: Chat — fixed pixel width (default 360px) */}
  <div className="shrink-0 flex flex-col overflow-hidden" style={{ width: chatWidth }}>...</div>
</div>
```

On a 375px wide mobile screen, a 360px chat panel leaves only 15px for the template preview — completely unusable. The drag handle is mouse-only (no touch support).

**Recommended approach: Tab-based toggle on mobile**

The simplest, most maintainable fix is to render two tabs ("Preview" and "Chat") on screens below 1024px, and keep the side-by-side layout on desktop. This avoids complex gesture handling and works for all mobile screen sizes.

Implementation:
- Add a `useIsMobile` hook or use a Tailwind breakpoint detection approach
- At `< lg` (1024px): render a tab switcher (shadcn `Tabs`) between Preview and Chat panels
- At `>= lg`: render the existing side-by-side layout with drag resizing

**Alternative approach: Stacked vertical layout**

On `< lg`, switch from `flex-row` to `flex-col` with each panel given ~50% height. Simpler but less space-efficient since both panels are always visible.

The requirements say "stack panels vertically on <1024px or tab-based toggle" — either is acceptable. Tab-based toggle is recommended as it gives full viewport to whichever panel is active.

**shadcn Tabs** is already used throughout the project (including in `notes-editor.tsx`). No new dependency needed.

**Header on mobile:** The header at `px-6` with both back button and two action buttons (Reset, Save) may also overflow on narrow screens. Should be verified and adjusted to `px-3` or `px-4` on mobile.

---

### BUG-03: Templates Schema Page Showing Raw `spec.*` Keys

**Location:** `src/i18n/request.ts`

**Root cause:** `messages/en/spec.json` and `messages/ro/spec.json` both exist and are fully translated. However, `src/i18n/request.ts` does NOT import `spec.json`:

```typescript
// request.ts — current imports (spec.json missing)
const messages = {
  ...(await import(`../../messages/${locale}/common.json`)).default,
  ...(await import(`../../messages/${locale}/auth.json`)).default,
  // ... 14 other namespaces ...
  // spec.json is NOT here
};
```

The schema page's custom `t()` function prefixes every key with `spec.`:
```typescript
const t = (key: string) => (tSpec as any)(`spec.${key}`);
```

Because the `spec` namespace is never loaded, `tSpec("spec.pageTitle")` has no matching key and returns the raw key string `spec.pageTitle` instead of the translation.

**Fix:** Add one import line to `request.ts`:
```typescript
...(await import(`../../messages/${locale}/spec.json`)).default,
```

**Both locale files exist and are complete.** No translation work is needed — this is purely a loader omission.

---

### BUG-04: Sparkline Placeholder Div in Recap Screen

**Location:** `src/components/session/recap-screen.tsx` lines 138-140

**Root cause:** A development placeholder was left in the component:
```tsx
<div className="rounded-md border border-dashed p-3 text-center text-xs text-muted-foreground">
  Score trend sparkline (Plan 03)
</div>
```

Per the out-of-scope list in REQUIREMENTS.md: "Implement real sparkline if team agrees; placeholder removal (BUG-04) is sufficient for v1.3."

**Fix:** Delete the three lines. No replacement needed for v1.3.

---

## Standard Stack

### Core (already in project)
| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| `@tiptap/core` | ^3.20.0 | `generateHTML()` for BUG-01 | Already installed |
| `@tiptap/starter-kit` | ^3.20.0 | Extension set for `generateHTML` | Already installed |
| `@tiptap/extension-link` | ^3.20.0 | Link extension for `generateHTML` | Already installed |
| shadcn `Tabs` | — | Tab toggle for BUG-02 mobile layout | Already in project |
| next-intl | — | i18n message loader for BUG-03 | Already in project |

**No new dependencies required for any of the 4 bugs.**

---

## Architecture Patterns

### Pattern 1: Tiptap Content Type Guard

When rendering Tiptap content from the DB, always guard for both formats (JSON object and HTML string):

```typescript
// Source: codebase pattern — notes-editor.tsx uses getHTML(), but DB may have older JSON
function tiptapToHtml(content: string | object | null | undefined): string {
  if (!content) return "";
  if (typeof content === "string") return content;
  // Tiptap JSON document object
  try {
    return generateHTML(content as Parameters<typeof generateHTML>[0], [
      StarterKit,
      Link.configure({ openOnClick: false }),
    ]);
  } catch {
    return ""; // malformed JSON document
  }
}
```

### Pattern 2: Mobile-First Responsive Tab Toggle for Complex Layouts

For split-panel UIs that need mobile support, use a tab-based approach with `useWindowSize` or CSS-based visibility:

```tsx
// Approach A: CSS-only with Tailwind (no JS hook needed)
// Desktop: flex row — Mobile: hidden/shown tabs
<div className="hidden lg:flex flex-1 overflow-hidden">
  {/* side-by-side panels */}
</div>
<div className="flex flex-col flex-1 lg:hidden">
  <Tabs defaultValue="preview">
    <TabsList><TabsTrigger value="preview">Preview</TabsTrigger><TabsTrigger value="chat">Chat</TabsTrigger></TabsList>
    <TabsContent value="preview">...</TabsContent>
    <TabsContent value="chat">...</TabsContent>
  </Tabs>
</div>
```

This approach renders both layouts in DOM but shows only the appropriate one — no JS resize listener needed.

### Pattern 3: next-intl Namespace Loading

All message namespaces must be explicitly imported in `src/i18n/request.ts`. The pattern is:
```typescript
...(await import(`../../messages/${locale}/namespace.json`)).default,
```

The translation-parity test (`src/lib/i18n/__tests__/translation-parity.test.ts`) verifies that `en/` and `ro/` files have identical keys for all files in `messages/en/`. Adding `spec.json` to the loader will make those keys available to `getTranslations()`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tiptap JSON to HTML | Custom serializer | `generateHTML` from `@tiptap/core` | Handles all node types, marks, attributes correctly |
| Mobile breakpoint detection | `window.innerWidth` listener | Tailwind responsive classes (`lg:hidden`, `hidden lg:flex`) | No JS needed, SSR-safe, no hydration mismatch |
| Translation loading | Custom JSON loader | next-intl dynamic import pattern (already in use) | Consistent with all other namespaces |

---

## Common Pitfalls

### Pitfall 1: `generateHTML` Extension Mismatch
**What goes wrong:** Calling `generateHTML` with a different extension set than was used when the JSON was originally saved. Unrecognized nodes are dropped silently.
**Why it happens:** The editor uses `StarterKit` + `Link`. If `generateHTML` is called with only `StarterKit`, link marks will be missing.
**How to avoid:** Use exactly `[StarterKit, Link.configure({ openOnClick: false })]` — same as in `NotesEditor`.

### Pitfall 2: `generateHTML` Import from Wrong Package
**What goes wrong:** In older Tiptap (v2), `generateHTML` was in `@tiptap/html`. In v3, it is in `@tiptap/core`.
**How to avoid:** Import from `@tiptap/core` — that's what v3.20.0 exports.

### Pitfall 3: CSS-Only Responsive Approach Causing Double-Renders
**What goes wrong:** Rendering two versions of the AI editor (one hidden, one visible) doubles the state — chat state, version history, template state would be duplicated.
**How to avoid:** Keep a single shared state in the parent component and pass it to both layouts as props, or use a single component with conditional class names rather than conditional rendering of two separate component trees.

### Pitfall 4: spec.json Namespace Key Clash
**What goes wrong:** If `spec.json` has a top-level key that collides with another namespace (e.g., a `templates` key in `spec.json` would overwrite the `templates` namespace loaded from `templates.json`).
**How to avoid:** Inspect `spec.json` — its root key is `"spec"`, which is unique. No clash exists.

### Pitfall 5: Translation Parity Test Already Covers spec.json
**What goes wrong:** Developer adds `spec.json` to the loader but doesn't realize the parity test already validates it. The test reads all files in `messages/en/` — `spec.json` is already being tested for parity.
**How to avoid:** Run `bun run test` after the fix to confirm both locale files pass.

---

## Code Examples

### BUG-01: Safe Content Renderer (recap-screen.tsx)
```tsx
// Import at top of recap-screen.tsx
import { generateHTML } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";

const TIPTAP_EXTENSIONS = [StarterKit, Link.configure({ openOnClick: false })];

function contentToHtml(content: unknown): string {
  if (!content) return "";
  if (typeof content === "string") return content;
  if (typeof content === "object") {
    try {
      return generateHTML(
        content as Parameters<typeof generateHTML>[0],
        TIPTAP_EXTENSIONS
      );
    } catch {
      return "";
    }
  }
  return "";
}

// Usage in JSX:
<div
  className="prose prose-sm max-w-none dark:prose-invert"
  dangerouslySetInnerHTML={{ __html: contentToHtml(content) }}
/>
```

### BUG-03: Add spec.json to i18n loader (request.ts)
```typescript
// Add this line to the messages object in src/i18n/request.ts:
...(await import(`../../messages/${locale}/spec.json`)).default,
```

### BUG-04: Remove sparkline placeholder (recap-screen.tsx)
Remove lines 138-140:
```tsx
// DELETE these 3 lines:
<div className="rounded-md border border-dashed p-3 text-center text-xs text-muted-foreground">
  Score trend sparkline (Plan 03)
</div>
```

---

## State of the Art

| Area | Current Approach | Notes |
|------|-----------------|-------|
| Tiptap HTML storage | `editor.getHTML()` → stored as string | Correct for new sessions; old sessions may have JSON |
| Tiptap JSON rendering | Not used — only HTML path exists | `generateHTML` needed for backward compat |
| next-intl namespace loading | Dynamic import per locale | Standard pattern; `spec.json` simply missing |

---

## Validation Architecture

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
| BUG-01 | `contentToHtml()` converts Tiptap JSON object to HTML string | unit | `bun run test src/lib/session/__tests__/tiptap-render.test.ts` | ❌ Wave 0 |
| BUG-01 | `contentToHtml()` passes through plain HTML string unchanged | unit | `bun run test src/lib/session/__tests__/tiptap-render.test.ts` | ❌ Wave 0 |
| BUG-01 | `contentToHtml()` returns empty string for null/undefined | unit | `bun run test src/lib/session/__tests__/tiptap-render.test.ts` | ❌ Wave 0 |
| BUG-03 | `spec.json` keys are present in loaded messages (parity test covers file) | unit | `bun run test src/lib/i18n/__tests__/translation-parity.test.ts` | ✅ exists |
| BUG-02 | Visual/responsive — mobile layout renders without overflow | manual | n/a (browser viewport test) | manual-only |
| BUG-04 | Sparkline div no longer appears in recap screen markup | unit | `bun run test` (typecheck + lint covers deletion) | manual verify |

### Sampling Rate
- **Per task commit:** `bun run test && bun run typecheck`
- **Per wave merge:** `bun run test && bun run typecheck && bun run lint`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/session/__tests__/tiptap-render.test.ts` — unit tests for `contentToHtml()` helper (BUG-01)

---

## Open Questions

1. **Are there sessions in production with Tiptap JSON notes?**
   - What we know: The DB column is typed `Record<string, string>` but accepts any JSONB. Old code paths may have stored Tiptap JSON.
   - What's unclear: How widespread the issue is.
   - Recommendation: The fix (type guard + `generateHTML`) is safe regardless — it handles both formats. No migration needed.

2. **Should the AI editor drag handle be preserved on desktop after the responsive fix?**
   - What we know: The drag resize only works on mouse (no touch events). The fix adds a tab layout for mobile.
   - What's unclear: Whether to remove or keep the drag handle on desktop.
   - Recommendation: Keep the drag handle for desktop (>=1024px) — it adds value there. The mobile tab layout replaces it on small screens.

---

## Sources

### Primary (HIGH confidence)
- Direct source code inspection — `src/components/session/recap-screen.tsx` (BUG-01, BUG-04)
- Direct source code inspection — `src/components/templates/ai-editor/ai-editor-shell.tsx` (BUG-02)
- Direct source code inspection — `src/i18n/request.ts` vs `messages/en/spec.json` (BUG-03)
- Direct source code inspection — `src/lib/db/schema/sessions.ts` (sharedNotes column type)
- Direct source code inspection — `src/components/session/notes-editor.tsx` (editor.getHTML() save path)
- `node_modules/@tiptap/core` presence confirmed — `generateHTML` available

### Secondary (MEDIUM confidence)
- next-intl dynamic import pattern — observed in 15 existing namespace entries in `request.ts`
- Tailwind responsive breakpoint pattern — `lg:` prefix used throughout the project

---

## Metadata

**Confidence breakdown:**
- Bug root causes: HIGH — all four verified by reading source code
- Fix approaches: HIGH — straightforward, well-understood patterns
- Test coverage plan: MEDIUM — BUG-02 (responsive layout) requires manual browser verification

**Research date:** 2026-03-08
**Valid until:** 2026-04-08 (stable codebase, no external dependencies to track)
