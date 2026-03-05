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

## Cross-Milestone Trends

### Process Evolution

| Milestone | Commits | Phases | Key Change |
|-----------|---------|--------|------------|
| v1.0 | 224 | 10 | First milestone — established all patterns |

### Cumulative Quality

| Milestone | E2E Tests | LOC | Source Files |
|-----------|-----------|-----|-------------|
| v1.0 | 4 suites | 41,464 | 290 |

### Top Lessons (Verified Across Milestones)

1. Phase-based planning with parallel execution paths maximizes throughput
2. UAT gap closure as explicit follow-up plans catches real integration issues
3. Autonomous execution (yolo mode) works when plans are well-structured
