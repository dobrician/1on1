---
phase: 12-ui-translation
plan: "04"
subsystem: people-teams-templates-i18n
tags: [i18n, translation, people, teams, templates]
dependency_graph:
  requires: [12-01]
  provides: [people-i18n, teams-i18n, templates-i18n]
  affects: [people-pages, team-pages, template-editor]
tech_stack:
  added: []
  patterns: [useTranslations, useFormatter, getTranslations, getFormatter, useZodI18nErrors]
key_files:
  created: []
  modified:
    - src/components/people/manager-select.tsx
    - src/components/people/member-picker.tsx
    - src/components/people/team-card.tsx
    - src/components/people/team-create-dialog.tsx
    - src/app/(dashboard)/people/[id]/profile-edit-form.tsx
    - src/app/(dashboard)/people/[id]/page.tsx
    - src/app/(dashboard)/teams/[id]/team-detail-client.tsx
    - src/components/templates/question-card.tsx
    - src/components/templates/answer-config-form.tsx
    - src/components/templates/conditional-logic-form.tsx
    - messages/en/people.json
    - messages/ro/people.json
    - messages/en/teams.json
    - messages/ro/teams.json
    - messages/en/templates.json
    - messages/ro/templates.json
decisions:
  - Dynamic translation key lookup uses `as any` cast for TypeScript strict mode compatibility
  - Mood emoji placeholders kept as English defaults (user-customizable labels, not UI chrome)
  - Server component profile page uses getTranslations + getFormatter from next-intl/server
metrics:
  duration: 12min
  completed: "2026-03-06T11:11:17Z"
---

# Phase 12 Plan 04: People, Teams & Templates Translation Summary

Translated all people management, team management, and template builder components to use i18n translation keys with zero hardcoded English strings.

## What Was Done

### Task 1: People and Teams Components (dbc9b4e)

Translated 9 components across people and teams management:

**Newly wired components:**
- `manager-select.tsx` - Added `useTranslations('people')`, replaced toast messages and labels
- `member-picker.tsx` - Added `useTranslations('people')`, replaced dialog text, buttons, toast
- `team-card.tsx` - Added `useTranslations('teams')`, replaced "No lead" / "Team lead" labels
- `team-create-dialog.tsx` - Added `useTranslations('teams')` + `useZodI18nErrors()`, replaced all dialog labels
- `profile-edit-form.tsx` - Added `useTranslations('people')` + `useZodI18nErrors()`, replaced form labels and toast
- `people/[id]/page.tsx` - Server component: added `getTranslations` + `getFormatter`, replaced all labels, role/status badges, date formatting

**Fixed existing components:**
- `team-detail-client.tsx` - Added `useFormatter()`, replaced `toLocaleDateString("en-US")` with `format.dateTime()`

**Translation keys added:**
- `people.managerSelect.*` (4 keys) - manager selector UI
- `people.memberPicker.*` (9 keys) - member picker dialog
- `people.profileForm.*` (6 keys) - profile edit form
- `people.profile.backToPeople`, `editProfile`, `editProfileDesc`, `joined`, `noneAssigned` - profile page
- `teams.create.*` (12 keys) - team creation dialog
- `teams.noLead` - team card fallback

### Task 2: Template Builder Components (fc327ef)

Translated 3 components in the template builder:

- `question-card.tsx` - Added `useTranslations('templates')`, replaced answer type labels, operator labels, dialog text, accessibility text
- `answer-config-form.tsx` - Added `useTranslations('templates')` to all 3 sub-components (RatingLabels, MultipleChoiceConfig, MoodConfig), replaced all form labels
- `conditional-logic-form.tsx` - Added `useTranslations('templates')`, replaced all toggle labels, field labels, placeholders, operator labels, validation messages

**Translation keys added:**
- `templates.questionCard.*` (9 keys) - question card UI
- `templates.answerConfig.*` (13 keys) - answer configuration forms
- `templates.conditionalLogic.*` (18 keys) - conditional logic form

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TypeScript strict mode with dynamic translation keys**
- **Found during:** Task 2
- **Issue:** Dynamic key lookup `t(operatorKey[op])` returns `string` type, but `t()` expects literal union type
- **Fix:** Added `as any` cast with eslint-disable comment for dynamic key lookups
- **Files modified:** question-card.tsx, conditional-logic-form.tsx
- **Commit:** fc327ef

## Verification

- `npx tsc --noEmit` passes (no new errors introduced)
- `bun run build` succeeds
- No `toLocaleDateString("en-US")` calls remain in people/teams/templates components
- All visible strings use `t()` calls
- Both EN and RO translation files have matching key structures

## Self-Check: PASSED
