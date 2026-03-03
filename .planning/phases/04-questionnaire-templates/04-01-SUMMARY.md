---
phase: 04-questionnaire-templates
plan: 01
subsystem: api, database, ui
tags: [drizzle, zod, next-api-routes, rbac, react-hook-form, tanstack-query, templates]

# Dependency graph
requires:
  - phase: 03-user-team-management
    provides: "Dashboard layout, sidebar, RBAC helpers, audit log, withTenantContext pattern"
provides:
  - "Template CRUD API (GET/POST/PATCH/DELETE) with auth, RBAC, tenant isolation"
  - "Question CRUD API (POST/PATCH/DELETE) with answer_config validation"
  - "Zod validation schemas for templates and questions (shared client/server)"
  - "canManageTemplates RBAC helper"
  - "is_archived column on questionnaire_template table"
  - "Template list page at /templates with card grid UI"
  - "Create Template dialog with form validation"
  - "Sidebar Templates navigation item"
affects: [04-questionnaire-templates, 05-meeting-sessions]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Template CRUD API pattern (same as teams)", "Soft-delete via is_archived column", "Server Component page + Client Component grid with TanStack Query"]

key-files:
  created:
    - src/lib/validations/template.ts
    - src/app/api/templates/route.ts
    - src/app/api/templates/[id]/route.ts
    - src/app/api/templates/[id]/questions/route.ts
    - src/app/api/templates/[id]/questions/[questionId]/route.ts
    - src/app/(dashboard)/templates/page.tsx
    - src/components/templates/template-list.tsx
    - src/lib/db/migrations/0006_living_winter_soldier.sql
  modified:
    - src/lib/db/schema/templates.ts
    - src/lib/auth/rbac.ts
    - src/components/layout/sidebar.tsx

key-decisions:
  - "Soft-delete pattern for templates: is_archived=true, never actual deletion"
  - "Answer config validation: multiple_choice enforces min 2 options at API level"
  - "Template list uses LEFT JOIN with question count aggregation, filtering archived questions"

patterns-established:
  - "Template API follows exact teams API pattern: auth + RBAC + withTenantContext + audit log"
  - "Soft-delete (archive) via is_archived column on both templates and questions"

requirements-completed: [TMPL-01, TMPL-02, TMPL-03, TMPL-04]

# Metrics
duration: 5min
completed: 2026-03-03
---

# Phase 4 Plan 1: Template CRUD Foundation Summary

**Template CRUD API with 7 route handlers, Zod validation for all 6 answer types, schema migration for is_archived, and responsive card grid list page at /templates**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-03T19:40:39Z
- **Completed:** 2026-03-03T19:46:12Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments
- Full template CRUD API surface with auth, RBAC, tenant isolation, and audit logging
- Zod validation schemas shared between client and server for template and question operations
- Template list page with responsive card grid showing name, category, question count, version, and status badges
- Create Template dialog with React Hook Form + Zod resolver
- Sidebar navigation updated with Templates item for all roles

## Task Commits

Each task was committed atomically:

1. **Task 1: Schema migration, Zod validations, RBAC helper, and all API routes** - `0b151d4` (feat)
2. **Task 2: Template list page with card grid and sidebar navigation** - `8bffba8` (feat)

## Files Created/Modified
- `src/lib/db/schema/templates.ts` - Added isArchived column to questionnaireTemplates table
- `src/lib/db/migrations/0006_living_winter_soldier.sql` - Migration SQL for is_archived column
- `src/lib/validations/template.ts` - Zod schemas for all template and question CRUD operations
- `src/lib/auth/rbac.ts` - Added canManageTemplates helper
- `src/app/api/templates/route.ts` - GET list + POST create template
- `src/app/api/templates/[id]/route.ts` - GET single + PATCH update + DELETE archive template
- `src/app/api/templates/[id]/questions/route.ts` - POST add question
- `src/app/api/templates/[id]/questions/[questionId]/route.ts` - PATCH update + DELETE archive question
- `src/app/(dashboard)/templates/page.tsx` - Template list page (Server Component)
- `src/components/templates/template-list.tsx` - Template card grid with create dialog (Client Component)
- `src/components/layout/sidebar.tsx` - Added Templates nav item

## Decisions Made
- Soft-delete pattern for templates: archive via is_archived=true, never actual row deletion (preserves session history)
- Answer config validation at API level: multiple_choice enforces min 2 non-empty string options
- Template list uses LEFT JOIN with COUNT for question counts, filtering out archived questions
- DELETE endpoint on templates is a soft-delete (archive), unsetting is_default if needed

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Pre-existing lint errors in theme-toggle.tsx, people-table.tsx, and auth/actions.ts (out of scope, not from this plan's changes)
- psql not available on host; used docker exec to apply migrations to both databases

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Template CRUD foundation is complete, ready for Plan 02 (template editor page)
- All API routes and validation schemas in place for template editor to use
- Conditional logic fields included in questionSchema for Plan 03

---
*Phase: 04-questionnaire-templates*
*Completed: 2026-03-03*
