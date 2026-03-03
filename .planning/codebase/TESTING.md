# Testing Patterns

**Analysis Date:** 2026-03-03

## Overview

Testing strategy is defined in Sprint 15 (end-to-end testing) and distributed across earlier sprints (acceptance criteria). No tests are implemented yet; this document outlines the planned testing approach.

## Test Framework

**Runner:**
- Vitest (recommended for Next.js + React)
- Config file: `vitest.config.ts`
- Alternative: Jest with `@testing-library/react`

**Assertion Library:**
- Vitest uses `vitest/assert` or `chai` (expect-style assertions)
- Preferred: `@testing-library/jest-dom` for DOM assertions

**Test Utilities:**
- `@testing-library/react` for React component testing
- `@testing-library/user-event` for simulating user interactions
- `vitest` built-in mocking and spying

**Run Commands:**
```bash
npm run test                    # Run all tests once
npm run test:watch             # Watch mode
npm run test:coverage          # Coverage report
npm run test:ui                # Vitest UI (dashboard)
```

## Test File Organization

**Location:**
- Co-located with source files (not separate directory)
- Pattern: `component.tsx` and `component.test.tsx` in the same directory

**Naming:**
- Unit tests: `*.test.ts` or `*.test.tsx`
- Integration tests: `*.integration.test.ts`
- E2E tests: `e2e/` directory separate from source

**Structure:**
```
src/
├── components/
│   ├── session/
│   │   ├── session-wizard.tsx
│   │   └── session-wizard.test.tsx       # Test co-located
│   └── ui/
│       ├── button.tsx
│       └── button.test.tsx
├── lib/
│   ├── utils/
│   │   ├── formatting.ts
│   │   └── formatting.test.ts
│   └── auth/
│       ├── permissions.ts
│       └── permissions.test.ts
├── app/
│   ├── (dashboard)/
│   │   └── sessions/
│   │       └── page.test.tsx              # Test page components
│   └── api/
│       └── sessions/
│           └── route.test.ts              # Test API handlers
└── types/
    └── index.test.ts                      # Type-only tests (optional)
```

## Test Structure

**Suite Organization:**
Each test file uses `describe()` blocks to organize tests:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { encryptNote, decryptNote } from '@/lib/utils/encryption';

describe('Encryption utilities', () => {
  describe('encryptNote', () => {
    it('encrypts plaintext with valid key', () => {
      const plaintext = 'Sensitive note';
      const key = generateTenantKey();

      const encrypted = encryptNote(plaintext, key);

      expect(encrypted).toHaveProperty('ciphertext');
      expect(encrypted).toHaveProperty('iv');
      expect(encrypted).toHaveProperty('authTag');
    });

    it('produces different ciphertext for same plaintext', () => {
      const plaintext = 'Sensitive note';
      const key = generateTenantKey();

      const encrypted1 = encryptNote(plaintext, key);
      const encrypted2 = encryptNote(plaintext, key);

      expect(encrypted1.ciphertext).not.toBe(encrypted2.ciphertext);
      expect(encrypted1.iv).not.toBe(encrypted2.iv);
    });
  });

  describe('decryptNote', () => {
    it('decrypts encrypted note to original plaintext', () => {
      const plaintext = 'Sensitive note';
      const key = generateTenantKey();

      const encrypted = encryptNote(plaintext, key);
      const decrypted = decryptNote(encrypted, key);

      expect(decrypted).toBe(plaintext);
    });
  });
});
```

**Patterns:**
- Test names should describe behavior: "should...", "returns...", "throws..."
- Use `beforeEach()` for setup shared across tests
- Use `afterEach()` for cleanup (closing DB connections, clearing mocks)
- Use `describe()` to group related tests

Example with setup/teardown:
```typescript
describe('Database operations', () => {
  let db: Database;

  beforeEach(async () => {
    db = await initTestDatabase();
  });

  afterEach(async () => {
    await db.cleanup();
  });

  it('creates a user and persists to database', async () => {
    const result = await db.createUser({
      email: 'test@example.com',
      name: 'Test User',
    });

    expect(result.id).toBeDefined();
    expect(result.email).toBe('test@example.com');
  });
});
```

## Mocking

**Framework:**
- Vitest built-in mocking (`.mock()` method)
- `vi` object from `vitest` for spying and stubbing

**Patterns:**

### Mocking Modules
```typescript
import { describe, it, expect, vi } from 'vitest';
import * as emailService from '@/lib/email/send';
import { sendInvite } from '@/lib/services/invites';

vi.mock('@/lib/email/send');

describe('sendInvite', () => {
  it('sends an invite email', async () => {
    const mockSend = vi.spyOn(emailService, 'send').mockResolvedValue({
      id: 'email-123',
    });

    await sendInvite('user@example.com', 'invite-token');

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user@example.com',
      })
    );
  });
});
```

### Mocking Database Queries
```typescript
import { describe, it, expect, vi } from 'vitest';
import { db } from '@/lib/db';
import { getSession } from '@/lib/services/sessions';

vi.mock('@/lib/db', () => ({
  db: {
    query: {
      sessions: {
        findFirst: vi.fn(),
      },
    },
  },
}));

describe('getSession', () => {
  it('retrieves session from database', async () => {
    const mockSession = {
      id: 'session-123',
      startedAt: new Date(),
    };

    vi.mocked(db.query.sessions.findFirst).mockResolvedValue(mockSession);

    const result = await getSession('session-123');

    expect(result).toEqual(mockSession);
  });
});
```

### Mocking External APIs
```typescript
import { describe, it, expect, vi } from 'vitest';
import fetch from 'node-fetch';
import { sendReminder } from '@/lib/services/reminders';

vi.mock('node-fetch');

describe('sendReminder', () => {
  it('calls Resend API to send reminder email', async () => {
    const mockFetch = vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'email-123' }),
    });

    await sendReminder('session-123');

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.resend.com/emails',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        }),
      })
    );
  });
});
```

**What to Mock:**
- External APIs (Resend, Inngest, storage services)
- Database operations (in unit tests; use test database in integration tests)
- Environment-dependent services
- Date/time (use `vi.useFakeTimers()` if needed)

**What NOT to Mock:**
- Core utility functions (encryption, formatting, validation)
- React components when testing parent components (use render)
- Business logic helpers
- Internal domain services (test with real logic, mock only external calls)

Example: Test encryption without mocking:
```typescript
import { describe, it, expect } from 'vitest';
import { encryptNote, decryptNote } from '@/lib/utils/encryption';

describe('Encryption roundtrip', () => {
  it('decrypts to original plaintext', () => {
    const plaintext = 'Sensitive note';
    const key = generateTenantKey();

    const encrypted = encryptNote(plaintext, key);
    const decrypted = decryptNote(encrypted, key);

    expect(decrypted).toBe(plaintext); // Real encryption, not mocked
  });
});
```

## Fixtures and Factories

**Test Data:**
Create factory functions to generate realistic test data:

```typescript
// src/lib/testing/factories.ts
import { faker } from '@faker-js/faker';

export function createUserFixture(overrides?: Partial<User>): User {
  return {
    id: faker.datatype.uuid(),
    tenantId: faker.datatype.uuid(),
    email: faker.internet.email(),
    name: faker.person.fullName(),
    role: 'member' as const,
    createdAt: faker.date.past(),
    ...overrides,
  };
}

export function createSessionFixture(
  overrides?: Partial<Session>
): Session {
  return {
    id: faker.datatype.uuid(),
    tenantId: faker.datatype.uuid(),
    seriesId: faker.datatype.uuid(),
    startedAt: faker.date.recent(),
    completedAt: null,
    notes: null,
    createdAt: faker.date.past(),
    ...overrides,
  };
}
```

**Usage in tests:**
```typescript
describe('Session service', () => {
  it('completes a session', async () => {
    const session = createSessionFixture();

    const result = await completeSession(session.id);

    expect(result.completedAt).toBeDefined();
  });
});
```

**Location:**
- `src/lib/testing/factories.ts` — Factory functions for all domain models
- `src/lib/testing/fixtures/` — Static fixture files (JSON test data)
- `src/lib/testing/helpers.ts` — Helper utilities (reset state, generate IDs, etc.)

## Coverage

**Requirements:**
- Target: 80% coverage for critical paths (auth, authorization, encryption, data mutations)
- Target: 60% coverage for UI components (component rendering is tested in E2E)
- View coverage report: `npm run test:coverage`
- Coverage output: `coverage/` directory (git-ignored)

**Coverage File:**
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/**/*.d.ts',
        'src/types/**',
      ],
      lines: 80,
      functions: 80,
      branches: 70,
      statements: 80,
    },
  },
});
```

**Running Coverage:**
```bash
npm run test:coverage       # Generate coverage report
open coverage/index.html    # View HTML report
```

## Test Types

### Unit Tests

**Scope:**
- Test single function/component in isolation
- Mock all external dependencies
- Fast execution (< 1ms per test)

**Example: Utility function**
```typescript
import { describe, it, expect } from 'vitest';
import { formatDate } from '@/lib/utils/formatting';

describe('formatDate', () => {
  it('formats date as YYYY-MM-DD', () => {
    const date = new Date('2026-03-03T12:00:00Z');
    const result = formatDate(date, 'YYYY-MM-DD');
    expect(result).toBe('2026-03-03');
  });

  it('formats date with relative time', () => {
    const past = new Date(Date.now() - 60000); // 1 minute ago
    const result = formatDate(past, 'relative');
    expect(result).toBe('1 minute ago');
  });
});
```

**Example: React component**
```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from '@/components/ui/button';

describe('Button component', () => {
  it('renders with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick handler when clicked', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click</Button>);

    await userEvent.click(screen.getByText('Click'));
    expect(onClick).toHaveBeenCalled();
  });
});
```

**Example: Authorization check**
```typescript
import { describe, it, expect } from 'vitest';
import { canManageUsers, canConductSession } from '@/lib/auth/permissions';

describe('Authorization permissions', () => {
  describe('canManageUsers', () => {
    it('returns true for admin user', () => {
      const admin = createUserFixture({ role: 'admin' });
      expect(canManageUsers(admin)).toBe(true);
    });

    it('returns false for non-admin user', () => {
      const member = createUserFixture({ role: 'member' });
      expect(canManageUsers(member)).toBe(false);
    });
  });

  describe('canConductSession', () => {
    it('returns true for manager of series', () => {
      const manager = createUserFixture({ id: 'mgr-1', role: 'manager' });
      const series = createSeriesFixture({ managerId: 'mgr-1' });

      expect(canConductSession(manager, series)).toBe(true);
    });

    it('returns false for non-manager', () => {
      const user = createUserFixture({ id: 'user-1', role: 'member' });
      const series = createSeriesFixture({ managerId: 'mgr-2' });

      expect(canConductSession(user, series)).toBe(false);
    });
  });
});
```

### Integration Tests

**Scope:**
- Test multiple components/services working together
- Use real database (test database, not production)
- May make real API calls to test services or use mocked external calls
- Moderate execution speed (< 100ms per test)

**Example: Complete user invitation flow**
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { inviteUser, acceptInvite } from '@/lib/services/users';

describe('User invitation flow', () => {
  let testDb: Database;

  beforeEach(async () => {
    testDb = await initTestDatabase();
  });

  afterEach(async () => {
    await testDb.cleanup();
  });

  it('invites a user and allows them to accept invite', async () => {
    const admin = createUserFixture({ role: 'admin' });
    const inviteEmail = 'newuser@example.com';

    // Step 1: Admin invites user
    const invitation = await inviteUser({
      email: inviteEmail,
      role: 'member',
      tenantId: admin.tenantId,
    });

    expect(invitation.token).toBeDefined();
    expect(invitation.expiresAt).toBeAfter(new Date());

    // Step 2: User accepts invite
    const newUser = await acceptInvite({
      token: invitation.token,
      password: 'SecurePassword123',
    });

    expect(newUser.email).toBe(inviteEmail);
    expect(newUser.role).toBe('member');
  });
});
```

**Example: API route integration test**
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { POST } from '@/app/api/sessions/route';

describe('POST /api/sessions', () => {
  it('creates a new session when authorized', async () => {
    const user = createUserFixture({ role: 'manager' });
    const series = createSeriesFixture({ managerId: user.id });

    const request = new Request('http://localhost/api/sessions', {
      method: 'POST',
      body: JSON.stringify({
        seriesId: series.id,
        templateId: 'template-123',
      }),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await generateToken(user)}`,
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.id).toBeDefined();
  });
});
```

### E2E Tests (Planned for Sprint 15)

**Framework:** Playwright (recommended for Next.js)

**Config file:** `playwright.config.ts`

**Test files location:** `e2e/` directory separate from source

**Example E2E test:**
```typescript
// e2e/critical-flows.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Critical user flows', () => {
  test('complete registration → setup wizard → dashboard', async ({
    page,
  }) => {
    // 1. Navigate to registration
    await page.goto('http://localhost:3000/register');
    expect(page).toHaveTitle(/Register/);

    // 2. Fill registration form
    await page.fill('input[name="companyName"]', 'Test Company');
    await page.fill('input[name="email"]', 'admin@example.com');
    await page.fill('input[name="password"]', 'SecurePassword123');
    await page.click('button[type="submit"]');

    // 3. Complete setup wizard
    await expect(page).toHaveTitle(/Setup Wizard/);
    await page.fill('input[name="timezone"]', 'America/New_York');
    await page.click('button:has-text("Next")');

    // 4. Verify dashboard loaded
    await expect(page).toHaveURL(/\/overview/);
    await expect(page.locator('h1')).toContainText('Overview');
  });

  test('invite user → accept → login → participate', async ({
    page,
    context,
  }) => {
    // Admin invites user
    await page.goto('http://localhost:3000/people');
    await page.click('button:has-text("Invite")');
    await page.fill('input[name="email"]', 'newuser@example.com');
    await page.click('button:has-text("Send invite")');

    // Simulate user receiving email and clicking invite link
    // (In real test, extract link from email service mock)
    const newUserPage = await context.newPage();
    await newUserPage.goto('http://localhost:3000/invite/token-123');

    // New user accepts invite
    await newUserPage.fill('input[name="password"]', 'UserPassword123');
    await newUserPage.click('button:has-text("Accept")');

    // New user logs in
    await newUserPage.goto('http://localhost:3000/login');
    await newUserPage.fill('input[name="email"]', 'newuser@example.com');
    await newUserPage.fill('input[name="password"]', 'UserPassword123');
    await newUserPage.click('button:has-text("Sign in")');

    await expect(newUserPage).toHaveURL(/\/overview/);
  });

  test('create session → complete session → view analytics', async ({
    page,
  }) => {
    // Manager creates meeting series
    await page.goto('http://localhost:3000/series');
    await page.click('button:has-text("New Series")');
    // ... setup series

    // Start session
    await page.goto('http://localhost:3000/sessions');
    await page.click('button:has-text("Start")');

    // Complete wizard
    await expect(page.locator('[role="progressbar"]')).toBeVisible();
    // ... answer questions through wizard

    // View analytics
    await page.goto('http://localhost:3000/analytics');
    await expect(page.locator('canvas')).toBeVisible(); // Charts rendered

    // Verify chart shows data from completed session
    const chartData = await page.locator('[data-testid="score-chart"]');
    await expect(chartData).toContainText(/score/i);
  });
});
```

## Accessibility Testing

**Patterns:**
- Use `@testing-library/jest-dom` matchers for accessibility checks
- Test ARIA labels, roles, and keyboard navigation
- Include in unit tests, not separate test suite

Example:
```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SessionWizard } from '@/components/session/session-wizard';

describe('SessionWizard accessibility', () => {
  it('has accessible form controls', () => {
    render(<SessionWizard sessionId="session-123" />);

    const form = screen.getByRole('form');
    expect(form).toBeInTheDocument();

    const inputs = screen.getAllByRole('textbox');
    inputs.forEach((input) => {
      expect(input).toHaveAccessibleName();
    });
  });

  it('supports keyboard navigation', async () => {
    const user = userEvent.setup();
    render(<SessionWizard sessionId="session-123" />);

    // Tab through form
    const submitButton = screen.getByRole('button', { name: /submit/i });
    await user.tab();
    await user.tab();

    expect(submitButton).toBeFocused();

    // Enter to submit
    await user.keyboard('{Enter}');
    // Verify submission
  });

  it('announces wizard step changes', () => {
    const { rerender } = render(<SessionWizard sessionId="session-123" />);

    // Step 1 rendered
    expect(screen.getByRole('status')).toHaveTextContent(/step 1 of/i);

    // Move to step 2
    rerender(<SessionWizard sessionId="session-123" step={2} />);

    expect(screen.getByRole('status')).toHaveTextContent(/step 2 of/i);
  });
});
```

## Common Patterns

### Async Testing

**Pattern: Waiting for async operations**
```typescript
import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { SessionList } from '@/components/sessions/session-list';

describe('SessionList async data loading', () => {
  it('loads and displays sessions', async () => {
    render(<SessionList />);

    // Initially shows loading
    expect(screen.getByText(/loading/i)).toBeInTheDocument();

    // Wait for data to load
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    // Verify data displayed
    expect(screen.getByText('Session 1')).toBeInTheDocument();
  });
});
```

### Error Testing

**Pattern: Testing error handling and recovery**
```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { useQuery } from '@tanstack/react-query';
import { SessionDetail } from '@/components/sessions/session-detail';

describe('SessionDetail error handling', () => {
  it('displays error when session fetch fails', async () => {
    vi.mock('@tanstack/react-query', () => ({
      useQuery: vi.fn(() => ({
        isError: true,
        error: new Error('Failed to load session'),
        data: null,
      })),
    }));

    render(<SessionDetail sessionId="invalid" />);

    await waitFor(() => {
      expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
    });
  });

  it('allows retry after error', async () => {
    const user = userEvent.setup();
    render(<SessionDetail sessionId="session-123" />);

    await screen.findByText(/error/i);
    const retryButton = screen.getByRole('button', { name: /retry/i });

    await user.click(retryButton);

    // Mock now succeeds
    await waitFor(() => {
      expect(screen.getByText(/session loaded/i)).toBeInTheDocument();
    });
  });
});
```

### Snapshot Testing (Use Sparingly)

**Pattern: Snapshot testing for stable UI**
```typescript
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { UserCard } from '@/components/people/user-card';

describe('UserCard snapshot', () => {
  it('matches snapshot', () => {
    const { container } = render(
      <UserCard user={createUserFixture()} />
    );

    expect(container).toMatchSnapshot();
  });
});
```

**When to snapshot:**
- Design system components (Button, Card, etc.)
- Email templates
- Static UI blocks

**When NOT to snapshot:**
- Dynamic content (dates, IDs, user names)
- Components that change frequently
- Components being developed (use interaction tests instead)

---

*Testing analysis: 2026-03-03*
