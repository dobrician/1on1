# Coding Conventions

**Analysis Date:** 2026-03-03

## Overview

This project follows strict TypeScript conventions with a focus on type safety, readability, and maintainability. Conventions are derived from CLAUDE.md and `docs/architecture.md`. Code is not yet implemented; these conventions apply to all future development.

## Naming Patterns

**Files:**
- Component files: PascalCase (e.g., `SessionWizard.tsx`, `QuestionCard.tsx`)
- API route files: lowercase with hyphens (e.g., `route.ts` in directories matching REST structure)
- Utility/helper files: camelCase (e.g., `formatting.ts`, `scoring.ts`)
- Database schema files: lowercase with hyphens (e.g., `action-items.ts`)
- Validation schema files: camelCase (e.g., `user.ts`, `template.ts`)

**Functions:**
- Regular functions: camelCase (e.g., `encryptNote()`, `withTenantContext()`)
- React components: PascalCase (e.g., `SessionWizard`, `QuestionCard`)
- Handler functions: verb + noun pattern (e.g., `handleSubmit()`, `calculateScore()`)
- Server actions: camelCase with `server` prefix optional (e.g., `getSession()`, `updateUser()`)

**Variables:**
- Constants: UPPER_SNAKE_CASE (e.g., `ALGORITHM`, `SESSION_TIMEOUT`)
- Local variables: camelCase (e.g., `currentUser`, `sessionId`)
- Boolean variables: prefix with `is`, `has`, `can`, or `should` (e.g., `isManager`, `hasPermission()`)
- Database row variables: camelCase matching table names (e.g., `session`, `user`)

**Types:**
- Interfaces: PascalCase, typically without `I` prefix (e.g., `User`, `Session`)
- Type aliases: PascalCase (e.g., `SessionStatus`, `AnswerType`)
- Zod schema variables: PascalCase (e.g., `UserSchema`, `SessionAnswerSchema`)
- Enum values: UPPER_SNAKE_CASE (e.g., `ROLE.ADMIN`, `ANSWER_TYPE.NUMERIC`)

## Code Style

**Formatting:**
- Tool: ESLint + Prettier (configuration to be added during Sprint 01)
- Line length: 80-100 characters (soft limit)
- Indentation: 2 spaces
- Semicolons: required

**Linting:**
- Tool: ESLint (Next.js recommended config)
- Run with: `npm run lint`
- TypeScript strict mode enabled: all files must pass `tsc --noEmit`
- Unused imports: automatically removed by formatter

**Formatting (Prettier):**
- Print width: 100
- Tab width: 2
- Use tabs: false
- Trailing commas: es5
- Quotes: single quotes for code, double quotes for JSX attributes

## Import Organization

**Order:**
1. External packages (react, next, third-party libraries)
2. Relative imports (src/ paths using aliases)
3. Local files (./components, ../utils)

**Path Aliases:**
Standard Next.js aliases in `tsconfig.json`:
- `@/*` → `src/`

Example:
```typescript
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { formatDate } from '@/lib/utils/formatting';
import { useSession } from './auth-context';
```

**Wildcard Imports:**
Avoid `import * as X from Y` unless importing many related items. Prefer explicit named imports for clarity.

## Error Handling

**Patterns:**
- Errors in API routes should return proper HTTP status codes (400, 401, 403, 404, 500)
- Use custom error classes for domain-specific errors (e.g., `ForbiddenError`, `NotFoundError`)
- Server Components should throw errors (let Next.js error boundary catch them)
- Client Components should catch errors and display user-friendly messages via `useQuery` error states

Example error classes (planned for `src/lib/errors/`):
```typescript
export class NotFoundError extends Error {
  constructor(message = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ForbiddenError extends Error {
  constructor(message = 'Access denied') {
    super(message);
    this.name = 'ForbiddenError';
  }
}
```

**Error responses in API routes:**
```typescript
// Example: src/app/api/sessions/[id]/route.ts
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession(params.id);
    return Response.json(session);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return Response.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof ForbiddenError) {
      return Response.json({ error: error.message }, { status: 403 });
    }
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

## Logging

**Framework:** `console` (structured logging to be added if needed in production)

**Patterns:**
- Use `console.error()` for actual errors that should be debugged
- Use `console.log()` sparingly and only for temporary debugging
- Never log sensitive data (passwords, tokens, PII)
- Server-side logs use structured format: `[timestamp] [level] [context] message`

Example:
```typescript
console.error(`[User.getById] Failed to fetch user ${userId}:`, error);
```

## Comments

**When to Comment:**
- Explain *why* something is done, not *what* it does (code is self-explanatory)
- Complex algorithms or business logic that isn't obvious
- Workarounds or non-standard patterns
- Links to GitHub issues or documentation

**JSDoc/TSDoc:**
Use for exported functions, types, and API route handlers:

```typescript
/**
 * Encrypts a private note using AES-256-GCM.
 *
 * @param plaintext - The raw note content
 * @param tenantKey - The tenant's encryption key (hex-encoded)
 * @returns Encrypted payload with ciphertext, IV, and auth tag
 * @throws Error if encryption fails
 */
export function encryptNote(plaintext: string, tenantKey: string): EncryptedPayload {
  // ...
}
```

**No inline comments:**
Avoid comments like `// increment counter` — the code is clear.

## Function Design

**Size:**
- Aim for functions < 40 lines
- If a function exceeds 60 lines, break it into smaller functions
- Server action functions can be longer if they're simple data fetching

**Parameters:**
- Maximum 3 parameters; use objects for more
- Use destructuring for object parameters:
```typescript
// Good
async function createSession({
  seriesId,
  templateId,
  tenantId,
}: CreateSessionParams) {
  // ...
}

// Avoid
async function createSession(seriesId, templateId, tenantId) {
  // ...
}
```

**Return Values:**
- Always declare return type explicitly
- Server Components return ReactNode (implicit)
- API routes return Response
- Utilities return their declared types

Example:
```typescript
async function getUser(id: string): Promise<User> {
  // ...
}

function formatDate(date: Date): string {
  // ...
}
```

## Module Design

**Exports:**
- Each file exports one primary entity (one component, one utility function, or one class)
- Exception: Zod schemas often export multiple related schemas from the same file
- Use named exports for multiple related items; default export for the primary one

```typescript
// Good
export const UserSchema = z.object({ /* ... */ });
export const UpdateUserSchema = z.object({ /* ... */ });

// For UI components, prefer default export
export default function SessionWizard({ /* ... */ }) {
  // ...
}
```

**Barrel Files:**
- Create `index.ts` files only for:
  - UI component exports (`src/components/ui/index.ts`)
  - Type exports (`src/types/index.ts`)
  - Lib exports (`src/lib/index.ts` if centralizing utilities)
- Do NOT use barrel files for page routes or API handlers

Example (`src/components/ui/index.ts`):
```typescript
export { default as Button } from './button';
export { default as Card } from './card';
export type { ButtonProps } from './button';
```

## React Conventions

**Server vs. Client Components:**
- Default to Server Components (no `"use client"` directive)
- Use `"use client"` only when needed: interactivity (useState, useEffect), event handlers, hooks
- Fetch data in Server Components; pass data as props to Client Components

Example:
```typescript
// Server Component: src/app/(dashboard)/sessions/page.tsx
export default async function SessionsPage() {
  const sessions = await db.query.sessions.findMany({
    where: eq(sessions.tenantId, tenantId),
  });

  return <SessionsList sessions={sessions} />;
}

// Client Component: src/components/sessions/sessions-list.tsx
'use client';

import { useQuery } from '@tanstack/react-query';

export function SessionsList({ sessions }: { sessions: Session[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  return <div>/* ... */</div>;
}
```

**Props:**
- Always type props interfaces explicitly:
```typescript
interface SessionWizardProps {
  sessionId: string;
  onComplete: (answers: SessionAnswers) => void;
}

export default function SessionWizard({ sessionId, onComplete }: SessionWizardProps) {
  // ...
}
```

**Hooks:**
- Custom hooks follow `useNoun` pattern (e.g., `useSession`, `useUser`)
- Place custom hooks in `src/lib/hooks/` or co-locate with components that use them
- Use TanStack Query for server state (`useQuery`, `useMutation`)

## Database Conventions

**Drizzle ORM:**
- Schema files in `src/lib/db/schema/` (split by domain: users.ts, sessions.ts, etc.)
- Use `pgTable()` for PostgreSQL-specific features (enums, JSONB, arrays)
- Always include `tenant_id` for tenant-scoped tables
- Timestamps: use `timestamp('created_at').defaultNow()` for creation time

Example (`src/lib/db/schema/sessions.ts`):
```typescript
import { pgTable, uuid, timestamp, text, serial } from 'drizzle-orm/pg-core';

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  seriesId: uuid('series_id').notNull(),
  startedAt: timestamp('started_at').defaultNow(),
  completedAt: timestamp('completed_at'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});
```

**Queries:**
- All queries must filter by `tenant_id` — tenant isolation is enforced at the application layer
- Use Drizzle's query builder with `db.query` for selects (type-safe)
- Use `db.insert()`, `db.update()`, `db.delete()` for mutations

Example:
```typescript
const userSessions = await db.query.sessions.findMany({
  where: and(
    eq(sessions.tenantId, tenantId),
    eq(sessions.seriesId, seriesId)
  ),
  with: { series: true }, // Include relations
});
```

## Validation Conventions

**Zod Schemas:**
- Shared between client and server in `src/lib/validations/`
- Export schemas as `{Entity}Schema` and `Update{Entity}Schema`
- Use `.refine()` for cross-field validation
- Provide descriptive error messages

Example (`src/lib/validations/session.ts`):
```typescript
import { z } from 'zod';

export const CreateSessionSchema = z.object({
  seriesId: z.string().uuid('Invalid series ID'),
  templateId: z.string().uuid('Invalid template ID'),
  notes: z.string().optional(),
});

export type CreateSessionInput = z.infer<typeof CreateSessionSchema>;
```

**API Route Validation:**
All API route POST/PUT/PATCH handlers must validate input:
```typescript
export async function POST(req: Request) {
  const body = await req.json();
  const validation = CreateSessionSchema.safeParse(body);

  if (!validation.success) {
    return Response.json(
      { error: 'Invalid input', issues: validation.error.flatten() },
      { status: 400 }
    );
  }

  // Use validation.data for type-safe access
  const session = await createSession(validation.data);
  return Response.json(session);
}
```

**Client-side Validation:**
Use React Hook Form with Zod:
```typescript
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreateSessionSchema } from '@/lib/validations/session';

export function SessionForm() {
  const form = useForm({
    resolver: zodResolver(CreateSessionSchema),
  });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* Form fields */}
    </form>
  );
}
```

## Authorization Conventions

**RBAC Checks:**
Implement role checks in utility functions, not scattered throughout code:

```typescript
// src/lib/auth/permissions.ts
export function canManageUsers(user: User): boolean {
  return user.role === 'admin';
}

export function canConductSession(user: User, series: MeetingSeries): boolean {
  return user.role === 'admin' || series.managerId === user.id;
}

// Usage in API routes
export async function POST(req: Request) {
  const user = await getCurrentUser();

  if (!canManageUsers(user)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Proceed with operation
}
```

**Resource-Level Checks:**
Always verify the user has access to the specific resource:
```typescript
// Bad: only role check
if (user.role !== 'manager') throw new ForbiddenError();

// Good: role + resource ownership
const series = await db.query.meetingSeries.findFirst({
  where: eq(meetingSeries.id, seriesId),
});

if (!series) throw new NotFoundError();

const isManager = series.managerId === user.id;
const isReport = series.reportId === user.id;
const isAdmin = user.role === 'admin';

if (!isManager && !isReport && !isAdmin) {
  throw new ForbiddenError();
}
```

## Multi-tenancy Conventions

**Tenant Context:**
All data access must include tenant filtering:
```typescript
const userSessions = await db.query.sessions.findMany({
  where: and(
    eq(sessions.tenantId, currentUser.tenantId),
    eq(sessions.seriesId, seriesId)
  ),
});
```

**Never trust request parameters for tenant_id:**
Always derive from the authenticated session:
```typescript
// Bad: from request
const tenantId = req.query.tenantId;

// Good: from session
const user = await getCurrentUser();
const tenantId = user.tenantId;
```

## Environment & Secrets

**Config Pattern:**
Use environment variables for all configuration:
- Database URLs
- Auth secrets
- API keys
- External service credentials

**No hardcoded secrets:**
All secrets must be in `.env.local` (git-ignored) or managed service secrets in production.

Reference in code:
```typescript
const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) throw new Error('DATABASE_URL not set');
```

---

*Convention analysis: 2026-03-03*
