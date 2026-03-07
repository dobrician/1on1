# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0 — MVP

**Shipped:** 2026-03-05
**Phases:** 10 | **Plans:** 40 | **Commits:** 224

### What Was Built
- Full AI-powered 1:1 meeting platform: wizard, AI pipeline, dashboard, analytics, email notifications
- Multi-tenant SaaS with PostgreSQL RLS, encrypted private notes, RBAC
- 41,464 LOC TypeScript/TSX across 290 source files
- Dark mode, org color themes, responsive design, E2E test suite

### What Worked
- **Phase-based planning with parallel execution**: Phases 6, 7, 9 ran in parallel after Phase 5, maximizing throughput
- **UAT-driven gap closure**: Phases 7 and 8 each got gap-closure plans from UAT feedback, catching real issues
- **Yolo mode**: Fully autonomous execution with no manual checkpoints — 40 plans executed hands-off
- **Direct AI pipeline over Inngest**: Removing Inngest mid-milestone simplified the architecture significantly
- **Design-first per-phase**: Embedding mockups in plan files rather than a separate design phase was faster

### What Was Inefficient
- **Summary file format inconsistency**: Most summaries have "Dependency graph" as title instead of meaningful names — one-liner extraction failed for 37/40 summaries
- **ROADMAP.md checkbox drift**: Phase checkboxes in ROADMAP.md weren't updated as phases completed (3-7 still unchecked despite being done)
- **Requirements checkbox drift**: 3 ORG requirements were unchecked despite features being built in Phase 2
- **Performance metrics incomplete**: STATE.md velocity table only covers 26/40 plans with inconsistent formatting

### Patterns Established
- Manual SQL migrations via Docker exec (drizzle-kit generate is interactive)
- Delete-then-insert for analytics snapshots (NULL-safe unique index handling)
- Server Components for reads, API routes for writes, TanStack Query for client mutations
- useReducer for complex UI state (wizard), Collapsible sections for panels
- navigator.sendBeacon for reliable auto-save on page close
- Optimistic claim pattern for cron jobs (UPDATE...RETURNING to prevent double-sends)
- Non-blocking notification scheduling (.catch() fire-and-forget pattern)

### Key Lessons
1. **Checkbox/status tracking needs automation** — manual checkbox updates in ROADMAP.md and REQUIREMENTS.md drifted. Consider hooks or post-plan automation.
2. **Summary files need enforced structure** — one-liner field should be required, not optional. Milestone archival depends on extractable accomplishments.
3. **AI pipeline simplification paid off** — removing Inngest in favor of direct async functions reduced complexity without losing reliability.
4. **Full-text search is sufficient for v1 AI context** — pgvector was correctly deferred; websearch_to_tsquery handles the current use case.
5. **4-day MVP delivery** demonstrates the efficiency of structured phase planning with autonomous execution.

### Cost Observations
- Model mix: Primarily Opus for planning/execution, Sonnet for AI features (summaries, nudges), Haiku for lightweight AI tasks
- Average plan execution: ~7 minutes
- Total execution time: ~4.6 hours across 40 plans
- Notable: Phase 8 plans averaged 4 min each (dashboard/analytics were fastest)

---

## Milestone: v1.1 — Internationalization

**Shipped:** 2026-03-07
**Phases:** 4 | **Plans:** 13

### What Was Built
- next-intl i18n framework with dual-layer architecture (UI language per-user, content language per-company)
- Complete EN+RO translation (~650-800 keys) across all pages, components, analytics charts, and email templates
- Locale-aware date/number/relative-time formatting; standalone email translator for background jobs
- CI key-parity test enforcing EN/RO symmetry; Romanian plural forms (ICU one/few/other), diacritics

### What Worked
- **Dual-layer architecture clarity**: Keeping UI language (per-user) and content language (per-company) strictly separate avoided late-stage confusion
- **Standalone createEmailTranslator**: use-intl/core works outside Next.js lifecycle — clean solution for background jobs
- **Phase 12 mega-phase design**: Batching all 16 UI translation requirements into one phase was efficient; fewer handoffs
- **Wave 0 TDD for import schema** (v1.2, pattern carried forward): writing failing tests before implementation caught interface mismatches early

### What Was Inefficient
- **TypeScript complexity workaround**: NamespaceKeys union exceeds type complexity at 16+ namespaces — `getTranslations()` without namespace + `as any` cast is a recurring workaround, not a real fix
- **Romanian curly quotes**: U+201D breaks JSON parsing — discovered during plan 02, could have been caught in translation review earlier

### Patterns Established
- `getTranslations()` without namespace + `(t as any)(\`ns.${key}\`)` for large namespace unions (TypeScript complexity limit)
- Server Components own locale-aware formatting; pass translated labels as props to client components to avoid extra hydration boundaries
- `useFormatter()` captured at component level, passed into closures for Recharts callbacks

### Key Lessons
1. **Content vs. UI language must be separated at the data layer** — conflating them would have required a v2 refactor
2. **Locale-aware formatting needs to be applied everywhere at once** — chart axes and tooltips are easy to miss
3. **Romanian ICU plurals require three forms** (one/few/other) — CLDR spec; "few" and "other" can have identical text per spec

---

## Milestone: v1.2 — AI-Ready Templates

**Shipped:** 2026-03-07
**Phases:** 3 | **Plans:** 16

### What Was Built
- TemplateExport interface + `buildExportPayload()` — TDD-validated, UUID-stripped, portable JSON
- Export API + `/templates/schema` docs page with JSON Schema / Methodology / Score Weights tabs (EN+RO)
- ExportButton component — role-gated (admin/manager), hover-reveal on cards and editor toolbar
- Template import pipeline — Zod validation, preview stats, conflict detection, atomic insert with audit log
- Multi-step ImportDialog — language mismatch warning, rename/copy/cancel conflict, field-specific errors
- Full AI template editor — chat→generate→preview→save, company language, version history, resizable panels
- DIY Prompt Kit tab — copyable schema + methodology + worked example for external AI tools

### What Worked
- **TDD Wave 0 contract-first**: Writing failing test stubs before implementation (phases 15, 16, 17) caught interface mismatches before wiring — zero regression in downstream plans
- **Parallel execution (16 + 17 after 15)**: Both import and AI generator depended only on Phase 15 schema — running in parallel compressed timeline significantly
- **Reusing existing patterns**: Export followed `csv-export-button.tsx` blob download pattern; AI chat extended existing Vercel AI SDK pipeline; import route followed template builder atomic insert
- **Import route uses existing `/api/templates/import`**: Using POST import for both ImportDialog and AI editor save avoids a PATCH batch-save UUID-tracking problem — clean import creates fresh copy
- **Auto-advance**: All verification checkpoints (15-04, 16-05, 17-07) auto-approved via yolo mode + auto_advance

### What Was Inefficient
- **Pre-existing Playwright e2e conflicts**: 8 Playwright spec files picked up by Vitest due to config overlap — causes confusing test output without affecting unit tests; should be resolved for v1.3
- **AI editor layout regressions**: Multiple fixes needed for h-screen + overflow (`(fullscreen)` route group, `fixed inset-0`) — full-page editor patterns aren't covered by dashboard layout conventions

### Patterns Established
- Export transform: build UUID→sortOrder map first, then map sections/questions stripping internal fields
- Hover-reveal action buttons on cards: relative wrapper + `group`/`group-hover` Tailwind classes + absolute button
- AI chat route: no `withTenantContext` (no DB transaction needed for AI-only routes); use session content language directly
- DIY Prompt Kit: assembled server-side with translated headers + English JSON technical content

### Key Lessons
1. **Full-page (fullscreen) layouts need their own route group** — dashboard layout constraints (overflow, height) break full-page editors
2. **TDD Wave 0 is worth the 10-minute upfront cost** — it prevents cross-plan interface drift in multi-plan features
3. **AI generation prompt must include schema + methodology** — unguided AI output doesn't conform to scoring/weight conventions

### Cost Observations
- Sessions: 3 (one per phase approximately)
- Notable: Phase 17 was the heaviest (7 plans, AI UI components) but self-contained within one session

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Commits | Phases | Key Change |
|-----------|---------|--------|------------|
| v1.0 | 224 | 10 | First milestone — established all patterns |
| v1.1 | ~80 | 4 | Mega-phase design (Phase 12 covered 16 requirements); email standalone translator |
| v1.2 | ~70 | 3 | TDD Wave 0 contract-first; parallel Phase 16+17 after Phase 15 |

### Cumulative Quality

| Milestone | Unit Tests | LOC | Source Files |
|-----------|------------|-----|--------------|
| v1.0 | 4 E2E suites | 41,464 | 290 |
| v1.1 | + CI key-parity test | ~+8,000 | ~310 |
| v1.2 | + 7 export unit tests, + import schema tests, + AI contract tests | ~+26,500 inserts | 323 |

### Top Lessons (Verified Across Milestones)

1. Phase-based planning with parallel execution paths maximizes throughput
2. UAT gap closure as explicit follow-up plans catches real integration issues
3. Autonomous execution (yolo mode) works when plans are well-structured
4. TDD Wave 0 (contract-first failing stubs) prevents cross-plan interface drift in multi-plan features
5. Architecture decisions made at phase boundaries (dual-layer i18n, portable JSON schema) pay dividends for downstream phases
