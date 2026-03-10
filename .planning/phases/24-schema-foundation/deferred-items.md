# Deferred Items — Phase 24

## Pre-existing Issues (Out of Scope)

### 1. Playwright e2e specs included in Vitest run
Files: `e2e/*.spec.ts`
Issue: 9 Playwright test files are matched by Vitest's glob pattern — they fail because they import `@playwright/test` which is not compatible with Vitest's test runner.
Scope: Pre-existing, not caused by Phase 24 changes.

### 2. Translation parity failure — analytics.json
File: `messages/ro/analytics.json`
Issue: Missing key `analytics.chart.sessionHistory` in Romanian translation file.
Scope: Pre-existing, not caused by Phase 24 changes.

### 3. ESLint errors in existing files
Files:
- `src/components/layout/user-menu.tsx:45` — react-hooks/immutability error (document.cookie assignment)
- `src/lib/templates/__tests__/import-schema.test.ts:197,215` — @typescript-eslint/no-explicit-any errors
Scope: Pre-existing, not caused by Phase 24 changes.
