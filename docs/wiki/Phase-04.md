# Phase 4: Questionnaire Templates

**Status**: Complete
**Depends on**: Phase 3

## Goal

Managers and admins can design structured questionnaire templates that capture typed, categorized data across 6 question formats.

## Success Criteria

1. Admin or manager can create a template with all 6 question types (free text, rating 1-5, rating 1-10, yes/no, multiple choice, mood emoji)
2. Questions can be configured as required/optional with help text, tagged with categories, and reordered via drag-and-drop
3. Template edits create new versions while past sessions retain their original answers
4. User can duplicate, archive, and set an organization default template
5. Conditional logic allows showing/hiding questions based on previous answers (eq, neq, lt, gt, lte, gte operators)

## Plans

- **Plan 04-01**: Schema migration, Zod validations, API CRUD, template list page, sidebar — Complete
- **Plan 04-02**: Template editor, versioning, duplication, archival, default setting — Complete
- **Plan 04-03**: Drag-and-drop reordering and conditional logic — Complete

## Key Decisions

- Soft-delete pattern for templates: `is_archived=true`, never actual row deletion (preserves session history)
- Answer config validation at API level: multiple_choice enforces min 2 non-empty string options
- Versioning only triggers when template has sessions AND questions changed — unused templates update in place
- Duplicate uses two-pass approach: insert all questions for new IDs, then remap conditional references
- Questions managed in local React state (not RHF field arrays), saved in batch via single PATCH
- @dnd-kit/modifiers for `restrictToVerticalAxis` (separate package from @dnd-kit/core)
- Operators filtered client-side (dropdown) and server-side (`validateConditionalLogic`) via shared `operatorsForAnswerType`

## Requirements

TMPL-01, TMPL-02, TMPL-03, TMPL-04, TMPL-05, TMPL-06, TMPL-07, TMPL-08, TMPL-09, TMPL-10
