# Phase 3: User & Team Management - Research

**Researched:** 2026-03-03
**Domain:** User management, team management, RBAC, invite flows, audit logging
**Confidence:** HIGH

## Summary

Phase 3 builds the organizational backbone of the application: user invitations, people directory, team management, RBAC enforcement, and audit logging. The existing codebase provides a solid foundation -- the user table already has all needed fields (`managerId`, `jobTitle`, `avatarUrl`, `isActive`, `invitedAt`, `inviteAcceptedAt`), the team/teamMembers schema exists with RLS policies, and the auth system has JWT sessions containing `tenantId`, `userId`, and `role`. The email infrastructure (nodemailer + React Email) is proven and can be extended for invite emails.

The main gaps to fill are: (1) no audit_log table in the schema yet (only documented in security.md), (2) no invite token system (only user fields for tracking invite status), (3) no TanStack Table or React Hook Form in dependencies yet, (4) several shadcn components needed (dialog, dropdown-menu, tabs, avatar, table, sheet, textarea, toast/sonner, command, popover, checkbox), (5) the proxy.ts needs updating to allow unauthenticated access to the invite acceptance route, and (6) no API routes exist for users or teams.

**Primary recommendation:** Build invite flow first (schema + API + email + acceptance page), then people directory with RBAC enforcement, then team management, then audit logging as a cross-cutting concern wired into all mutation endpoints.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Multi-email invite form: admin types multiple email addresses (comma-separated or one per line), all get the same role
- Admin provides: email addresses + role (admin/manager/member). Manager assignment happens later in the people directory, not at invite time
- Invite links expire after 7 days. Admin can resend from people directory (generates new token)
- Pending invites appear in the people list with a "Pending" badge
- 2-step mini onboarding flow when invitee clicks the magic link: (1) Set password, (2) Fill basic profile (first name, last name, job title)
- After completing both steps, invitee lands in the app
- People directory: table layout with columns: name, email, role, team(s), manager, status
- Sortable columns, search bar at top
- Filters: role (All/Admin/Manager/Member), team, status (Active/Pending/Deactivated)
- No org chart view -- manager shown as a column in the table
- Inline actions: role change dropdown and "Assign manager" directly in the table row
- Kebab menu for: deactivate, resend invite, etc.
- Clicking a row opens a profile detail sheet/page
- Teams live as a tab under People section (People | Teams)
- Team list displayed as card grid: team name, lead avatar, member count, short description
- Click a card to open team detail page
- Team detail shows: member list (with remove button), team lead badge, editable team name/description
- Add members via search + select dialog (searchable user list, multi-select, confirm)
- Admin or manager can create teams, assign leads, add/remove members
- Audit log: admin-only access, dedicated page under Settings > Audit Log
- Table view: timestamp, actor, action, target, details
- Each row shows action summary; expandable to show before/after diff values
- Searchable and filterable by action type and date range
- Events logged: invite sent, invite accepted, role changed, manager assigned, user deactivated, user reactivated, profile updated, team created, team deleted, member added to team, member removed from team, team lead changed, org settings changed

### Claude's Discretion
- Exact table component styling and pagination approach
- Profile detail page/sheet layout
- Invite email template design
- Audit log diff format details
- Error and empty state handling across all pages

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| USER-01 | Admin can invite users to the organization via email | Invite token schema + multi-email API + invite email template |
| USER-02 | Invited user receives email with magic link to set password and join | Invite email template (React Email) + invite acceptance page + password set flow |
| USER-03 | User can edit their profile (first name, last name, job title, avatar) | Profile API route + profile edit form (React Hook Form + Zod) |
| USER-04 | Admin can assign roles: admin, manager, or member | Inline role dropdown in people table + PATCH API route |
| USER-05 | Each user can have a manager_id establishing reporting lines | Manager assignment in people table + PATCH API route |
| USER-06 | Admin can deactivate a user (soft delete preserving historical data) | Deactivate API route + isActive toggle + kebab menu action |
| TEAM-01 | Admin or manager can create teams with name, description, and team lead | Team creation dialog + POST API route |
| TEAM-02 | Admin or manager can add/remove members to teams | Member search/select dialog + team member API routes |
| TEAM-03 | Teams support lead and member roles | teamMemberRoleEnum already exists (lead/member) |
| TEAM-04 | A user can belong to multiple teams | Junction table teamMembers already supports this |
| SEC-03 | RBAC enforced at API route level | Auth guard helper + role checks in every API route |
| SEC-04 | Resource-level authorization checks beyond role | Verify user relationships (manager/report) on specific resources |
| SEC-06 | Audit log records significant events | New audit_log schema + helper function + wired into all mutations |
</phase_requirements>

## Standard Stack

### Core (already in project)
| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| Next.js | 16.1.6 | Framework (App Router) | Installed |
| Drizzle ORM | 0.38.4 | Database queries and schema | Installed |
| Zod | 3.24.2 | Input validation (shared client/server) | Installed |
| Auth.js (next-auth) | 5.0.0-beta.30 | Authentication, JWT sessions | Installed |
| React Email | 1.0.8 / 2.0.4 | Email templates | Installed |
| nodemailer | 8.0.1 | SMTP email sending | Installed |
| shadcn/ui | 3.8.5 (CLI) | UI component scaffolding | Installed (CLI) |
| lucide-react | 0.576.0 | Icons | Installed |
| bcryptjs | 3.0.3 | Password hashing | Installed |

### To Install
| Library | Version | Purpose | Why Needed |
|---------|---------|---------|------------|
| @tanstack/react-table | ^8.20 | Data table with sorting, filtering, pagination | People directory table (shadcn data-table pattern) |
| @tanstack/react-query | ^5.62 | Server state management, mutations | Client-side data fetching for interactive tables |
| react-hook-form | ^7.54 | Form handling | Invite form, profile edit, team creation (per project tech stack) |
| @hookform/resolvers | ^3.9 | Zod resolver for React Hook Form | Bridge between RHF and Zod schemas |

### shadcn Components to Add
| Component | Purpose | Install Command |
|-----------|---------|-----------------|
| table | Base table primitives for data table | `bunx shadcn@latest add table` |
| dialog | Invite dialog, add members dialog, create team dialog | `bunx shadcn@latest add dialog` |
| dropdown-menu | Kebab menu actions, role change dropdown | `bunx shadcn@latest add dropdown-menu` |
| tabs | People / Teams tab navigation | `bunx shadcn@latest add tabs` |
| avatar | User avatars throughout | `bunx shadcn@latest add avatar` |
| sonner | Toast notifications for actions | `bunx shadcn@latest add sonner` |
| sheet | Profile detail side panel | `bunx shadcn@latest add sheet` |
| textarea | Profile bio, team description | `bunx shadcn@latest add textarea` |
| checkbox | Multi-select in member picker | `bunx shadcn@latest add checkbox` |
| command | Searchable user picker (combobox pattern) | `bunx shadcn@latest add command` |
| popover | Popover for combobox/pickers | `bunx shadcn@latest add popover` |
| tooltip | Action button tooltips | `bunx shadcn@latest add tooltip` |
| skeleton | Loading states for table and cards | `bunx shadcn@latest add skeleton` |
| form | React Hook Form integration wrapper | `bunx shadcn@latest add form` |
| pagination | Table pagination controls | `bunx shadcn@latest add pagination` |

**Bulk install:**
```bash
bunx shadcn@latest add table dialog dropdown-menu tabs avatar sonner sheet textarea checkbox command popover tooltip skeleton form pagination
```

**NPM packages install:**
```bash
bun add @tanstack/react-table @tanstack/react-query react-hook-form @hookform/resolvers
```

## Architecture Patterns

### New File Structure
```
src/
├── app/
│   ├── (auth)/
│   │   └── invite/[token]/         # NEW: Invite acceptance page (public)
│   │       └── page.tsx            # 2-step onboarding: password + profile
│   │
│   ├── (dashboard)/
│   │   ├── people/                 # NEW: People directory
│   │   │   ├── page.tsx            # Server Component: fetch users, render table
│   │   │   └── [id]/
│   │   │       └── page.tsx        # User profile detail page
│   │   │
│   │   ├── teams/                  # NEW: Team management (tab under people)
│   │   │   ├── page.tsx            # Server Component: fetch teams, render cards
│   │   │   └── [id]/
│   │   │       └── page.tsx        # Team detail page
│   │   │
│   │   └── settings/
│   │       └── audit-log/          # NEW: Audit log page (admin only)
│   │           └── page.tsx
│   │
│   └── api/
│       ├── users/                  # NEW: User management API
│       │   ├── route.ts            # GET (list), POST (invite)
│       │   └── [id]/
│       │       └── route.ts        # GET, PATCH (role, manager, profile), DELETE (deactivate)
│       │
│       ├── teams/                  # NEW: Team management API
│       │   ├── route.ts            # GET (list), POST (create)
│       │   └── [id]/
│       │       ├── route.ts        # GET, PATCH, DELETE
│       │       └── members/
│       │           └── route.ts    # POST (add), DELETE (remove)
│       │
│       ├── invites/                # NEW: Invite management API
│       │   ├── route.ts            # POST (send invites)
│       │   ├── accept/
│       │   │   └── route.ts        # POST (accept invite -- public)
│       │   └── resend/
│       │       └── route.ts        # POST (resend invite)
│       │
│       └── audit-log/              # NEW: Audit log API
│           └── route.ts            # GET (list, admin only)
│
├── components/
│   └── people/                     # NEW: People/team components
│       ├── people-table.tsx        # Client: TanStack Table with sorting/filtering
│       ├── people-table-columns.tsx # Column definitions
│       ├── invite-dialog.tsx       # Client: multi-email invite form
│       ├── profile-sheet.tsx       # Client: side panel profile view/edit
│       ├── role-select.tsx         # Client: inline role change dropdown
│       ├── manager-select.tsx      # Client: combobox for manager assignment
│       ├── team-card.tsx           # Server/Client: team card in grid
│       ├── team-create-dialog.tsx  # Client: create team form
│       ├── member-picker.tsx       # Client: searchable user multi-select
│       ├── user-actions-menu.tsx   # Client: kebab menu for user actions
│       └── people-tabs.tsx         # Client: People | Teams tab wrapper
│
├── lib/
│   ├── db/
│   │   └── schema/
│   │       └── audit-log.ts        # NEW: Audit log Drizzle schema
│   │
│   ├── validations/
│   │   ├── user.ts                 # NEW: User invite, profile, role schemas
│   │   └── team.ts                 # NEW: Team create, edit, member schemas
│   │
│   ├── email/
│   │   └── templates/
│   │       └── invite.tsx          # NEW: Invite email template
│   │
│   ├── auth/
│   │   └── rbac.ts                 # NEW: RBAC helper utilities
│   │
│   └── audit/
│       └── log.ts                  # NEW: Audit logging helper
│
└── providers/
    └── query-provider.tsx          # NEW: TanStack Query provider
```

### Pattern 1: API Route with RBAC
**What:** Every mutation API route follows auth check -> role guard -> Zod validation -> withTenantContext -> audit log pattern.
**When to use:** All user/team/invite API routes.
**Example:**
```typescript
// src/app/api/users/[id]/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { withTenantContext } from "@/lib/db/tenant-context";
import { requireRole } from "@/lib/auth/rbac";
import { logAuditEvent } from "@/lib/audit/log";
import { updateUserSchema } from "@/lib/validations/user";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Role check: admin for role/manager changes, self for profile edits
  const { id } = await params;
  const isSelf = id === session.user.id;
  if (!isSelf) {
    const roleError = requireRole(session.user.role, "admin");
    if (roleError) return roleError;
  }

  const body = await request.json();
  const data = updateUserSchema.parse(body);

  const updated = await withTenantContext(
    session.user.tenantId,
    session.user.id,
    async (tx) => {
      // ... update user
      // ... audit log
      return result;
    }
  );

  return NextResponse.json(updated);
}
```

### Pattern 2: Invite Token System
**What:** Dedicated invite_tokens table (not reusing Auth.js verificationTokens) with 7-day expiry, tenant-scoped.
**When to use:** Inviting new users to the organization.
**Example:**
```typescript
// Invite token schema (src/lib/db/schema/auth.ts -- add to existing file)
export const inviteTokens = pgTable("invite_token", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  email: varchar("email", { length: 255 }).notNull(),
  role: userRoleEnum("role").notNull().default("member"),
  token: varchar("token", { length: 255 }).notNull().unique(),
  invitedBy: uuid("invited_by").notNull().references(() => users.id),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
```

### Pattern 3: Audit Log Helper
**What:** Centralized audit logging function called from API routes after mutations.
**When to use:** Every significant mutation (invites, role changes, deactivations, team changes, settings).
**Example:**
```typescript
// src/lib/audit/log.ts
import { TransactionClient } from "@/lib/db/tenant-context";
import { auditLog } from "@/lib/db/schema/audit-log";

export async function logAuditEvent(
  tx: TransactionClient,
  event: {
    tenantId: string;
    actorId: string;
    action: string;
    resourceType: string;
    resourceId?: string;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
  }
) {
  await tx.insert(auditLog).values({
    tenantId: event.tenantId,
    actorId: event.actorId,
    action: event.action,
    resourceType: event.resourceType,
    resourceId: event.resourceId,
    metadata: event.metadata ?? {},
    ipAddress: event.ipAddress,
  });
}
```

### Pattern 4: People Table with TanStack Table
**What:** Client Component using TanStack Table for sorting, filtering, pagination with server-fetched initial data.
**When to use:** People directory table.
**Example:**
```typescript
// Column definition pattern
const columns: ColumnDef<UserRow>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
    ),
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Avatar className="h-8 w-8">
          <AvatarImage src={row.original.avatarUrl} />
          <AvatarFallback>{initials(row.original)}</AvatarFallback>
        </Avatar>
        <span>{row.original.firstName} {row.original.lastName}</span>
      </div>
    ),
  },
  // ... role column with inline Select
  // ... manager column with Combobox
  // ... status Badge column
  // ... actions DropdownMenu column
];
```

### Pattern 5: TanStack Query Provider
**What:** QueryClientProvider wrapping the dashboard layout for client-side data management.
**When to use:** Dashboard layout, enabling all client components to use useQuery/useMutation.
**Example:**
```typescript
// src/providers/query-provider.tsx
"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
        refetchOnWindowFocus: false,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

### Anti-Patterns to Avoid
- **Trusting client-side role checks alone:** RBAC must be enforced server-side in API routes. Client-side hiding is UX only, not security.
- **Deriving tenant_id from request parameters:** Always from session. This is critical for multi-tenancy security.
- **Reusing Auth.js verificationTokens for invites:** Different lifecycle (7 days vs 24 hours), different data (role, tenant). Use a dedicated table.
- **Large client-side data fetching for people table:** Initial data should come from Server Component; client-side only for interactive filtering/sorting. For v1 with small orgs, client-side filtering is fine. Server-side pagination can be added later.
- **Inline mutations without optimistic updates:** Role/manager changes in the table should use optimistic updates via TanStack Query for snappy UX.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Data table with sorting/filtering | Custom table sort/filter logic | TanStack Table + shadcn data-table | Complex state management, accessibility, keyboard navigation |
| Searchable user picker | Custom search + dropdown | shadcn Command (cmdk) + Popover | Keyboard navigation, search debouncing, accessibility |
| Toast notifications | Custom notification system | shadcn Sonner (toast) | Animation, stacking, auto-dismiss, accessibility |
| Form validation | Manual form state + validation | React Hook Form + Zod + shadcn Form | Error handling, dirty tracking, async validation |
| Password hashing | Custom crypto | bcryptjs (already installed) | Proven, timing-safe comparison, configurable cost |
| Secure token generation | Math.random() | crypto.randomBytes(32).toString("hex") | Cryptographically secure, existing pattern in codebase |

**Key insight:** The shadcn data-table is not a pre-built component but a guide pattern. You build it from TanStack Table + shadcn Table primitives. Do not try to install a "data-table" component -- instead follow the pattern of composing column definitions, table instance, and UI primitives.

## Common Pitfalls

### Pitfall 1: Invite Race Conditions
**What goes wrong:** Two admins invite the same email simultaneously, creating duplicate users.
**Why it happens:** No uniqueness check between invite creation and user creation.
**How to avoid:** Use the existing `UNIQUE(tenant_id, email)` constraint on the users table. Also add `UNIQUE(tenant_id, email)` on invite_tokens (only one active invite per email). Handle constraint violations gracefully with "already invited" messaging.
**Warning signs:** Duplicate user rows, constraint violation errors in production.

### Pitfall 2: Proxy.ts Not Updated for Invite Route
**What goes wrong:** Invited users clicking the magic link get redirected to /login because proxy.ts blocks unauthenticated access to /invite/*.
**Why it happens:** The current proxy.ts only allows auth pages (/login, /register, /verify-email, /forgot-password, /reset-password).
**How to avoid:** Add `/invite` to the isAuthPage check in proxy.ts BEFORE building the invite flow.
**Warning signs:** Invite links loop back to login page.

### Pitfall 3: Self-Demotion Lock-Out
**What goes wrong:** Admin changes their own role to "member", locking out the entire organization from admin functions.
**Why it happens:** No guard against the last admin demoting themselves.
**How to avoid:** Before role change, check if the user is the last admin. If so, reject the change with "Cannot remove the last admin" error.
**Warning signs:** Organization has zero admins.

### Pitfall 4: Audit Log Inside vs Outside Transaction
**What goes wrong:** Audit log records an event but the actual mutation fails and rolls back, leaving phantom audit entries.
**Why it happens:** Audit log written in a separate connection/transaction from the mutation.
**How to avoid:** Always write audit log entries INSIDE the same withTenantContext transaction as the mutation. If the mutation fails, the audit entry rolls back too.
**Warning signs:** Audit log shows events that never actually happened.

### Pitfall 5: RLS Policy Missing on audit_log Table
**What goes wrong:** Audit log data leaks across tenants.
**Why it happens:** New table created without RLS policy.
**How to avoid:** Add RLS policy for audit_log in the same migration that creates the table. Follow the exact pattern from 0001_rls_policies.sql.
**Warning signs:** Admin from Tenant A can see Tenant B's audit events.

### Pitfall 6: OAuth Users Cannot Accept Invites
**What goes wrong:** User invited via email clicks invite link, but they want to use Google login. The current auth config blocks OAuth sign-in for users without existing records.
**Why it happens:** Auth config's signIn callback checks for existing user by email -- but the invited user's record is created DURING invite acceptance, not before.
**How to avoid:** During invite acceptance, create the user record first, then allow them to optionally link OAuth afterwards. The invite flow should always create a credentials-based user first. OAuth linking can be a future enhancement.
**Warning signs:** Invited users cannot log in with Google/Microsoft after accepting invite.

### Pitfall 7: Manager Assignment Circular References
**What goes wrong:** User A manages User B, User B manages User A -- circular management chain.
**Why it happens:** No validation preventing circular manager_id references.
**How to avoid:** When assigning a manager, walk up the management chain and verify the target user does not appear in it. For v1 with small orgs, a simple 10-level recursion check is sufficient.
**Warning signs:** Infinite loops when traversing management hierarchy.

## Code Examples

### Audit Log Schema (NEW)
```typescript
// src/lib/db/schema/audit-log.ts
import {
  pgTable,
  uuid,
  varchar,
  jsonb,
  timestamp,
  index,
  inet,
  text,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { users } from "./users";

export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    actorId: uuid("actor_id").references(() => users.id),
    action: varchar("action", { length: 100 }).notNull(),
    resourceType: varchar("resource_type", { length: 50 }).notNull(),
    resourceId: uuid("resource_id"),
    metadata: jsonb("metadata").notNull().default({}),
    ipAddress: varchar("ip_address", { length: 45 }), // IPv6 max length
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("audit_log_tenant_action_idx").on(
      table.tenantId,
      table.action,
      table.createdAt
    ),
    index("audit_log_tenant_actor_idx").on(
      table.tenantId,
      table.actorId,
      table.createdAt
    ),
  ]
);
```

### RBAC Helper
```typescript
// src/lib/auth/rbac.ts
import { NextResponse } from "next/server";

const ROLE_HIERARCHY = { admin: 3, manager: 2, member: 1 } as const;
type Role = keyof typeof ROLE_HIERARCHY;

/**
 * Returns a 403 response if the user's role is below the required level.
 * Returns null if authorized.
 */
export function requireRole(
  userRole: string,
  minimumRole: Role
): NextResponse | null {
  const userLevel = ROLE_HIERARCHY[userRole as Role] ?? 0;
  const requiredLevel = ROLE_HIERARCHY[minimumRole];

  if (userLevel < requiredLevel) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

/**
 * Check if user can manage teams (admin or manager).
 */
export function canManageTeams(role: string): boolean {
  return role === "admin" || role === "manager";
}

/**
 * Check if user can perform admin-only actions.
 */
export function isAdmin(role: string): boolean {
  return role === "admin";
}
```

### Invite Validation Schemas
```typescript
// src/lib/validations/user.ts
import { z } from "zod";

export const inviteUsersSchema = z.object({
  emails: z
    .string()
    .min(1, "At least one email is required")
    .transform((val) =>
      val
        .split(/[,\n]/)
        .map((e) => e.trim())
        .filter((e) => e.length > 0)
    )
    .pipe(
      z
        .array(z.string().email("Invalid email address"))
        .min(1, "At least one valid email is required")
        .max(50, "Maximum 50 invites at once")
    ),
  role: z.enum(["admin", "manager", "member"]),
});

export const acceptInviteSchema = z.object({
  token: z.string().min(1),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain uppercase letter")
    .regex(/[a-z]/, "Must contain lowercase letter")
    .regex(/[0-9]/, "Must contain a number"),
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  jobTitle: z.string().max(200).optional(),
});

export const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  jobTitle: z.string().max(200).nullable().optional(),
  avatarUrl: z.string().url().nullable().optional(),
});

export const updateUserRoleSchema = z.object({
  role: z.enum(["admin", "manager", "member"]),
});

export const assignManagerSchema = z.object({
  managerId: z.string().uuid().nullable(),
});
```

### Team Validation Schemas
```typescript
// src/lib/validations/team.ts
import { z } from "zod";

export const createTeamSchema = z.object({
  name: z.string().min(1, "Team name is required").max(200),
  description: z.string().max(1000).optional(),
  managerId: z.string().uuid().optional(),
});

export const updateTeamSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).nullable().optional(),
  managerId: z.string().uuid().nullable().optional(),
});

export const addTeamMembersSchema = z.object({
  userIds: z.array(z.string().uuid()).min(1).max(50),
});

export const removeTeamMemberSchema = z.object({
  userId: z.string().uuid(),
});
```

### Invite Email Template
```typescript
// src/lib/email/templates/invite.tsx (follows existing verification.tsx pattern)
import {
  Html, Head, Body, Container, Section, Text, Button, Hr,
} from "@react-email/components";

interface InviteEmailProps {
  inviteUrl: string;
  organizationName: string;
  inviterName: string;
  role: string;
}

export function InviteEmail({
  inviteUrl,
  organizationName,
  inviterName,
  role,
}: InviteEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={body}>
        <Container style={container}>
          <Section style={section}>
            <Text style={brand}>1on1</Text>
            <Text style={heading}>You have been invited</Text>
            <Text style={paragraph}>
              {inviterName} has invited you to join{" "}
              <strong>{organizationName}</strong> as a {role}.
            </Text>
            <Button style={button} href={inviteUrl}>
              Accept Invitation
            </Button>
            <Hr style={hr} />
            <Text style={footer}>
              This invitation expires in 7 days. If you did not expect
              this invitation, you can safely ignore this email.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
// ... reuse same styles from verification.tsx
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Server-side rendered tables | TanStack Table + client-side interactivity | Standard since 2023 | Sorting/filtering without page reloads |
| Custom form handling | React Hook Form + Zod | Standard since 2023 | Type-safe, performant, shared validation |
| Magic link via Auth.js | Dedicated invite token table | Project decision | Cleaner separation of invite vs auth concerns |
| `require()` style imports | ESM imports throughout | Already established | Consistent with existing codebase |
| Separate middleware.ts | proxy.ts (Next.js 16 convention) | Phase 2 decision | proxy.ts runs first, then middleware |

## Open Questions

1. **Avatar Upload Storage**
   - What we know: USER-03 requires avatar editing, project docs mention R2/S3 for file storage
   - What's unclear: File storage is not set up yet. No R2/S3 configuration exists.
   - Recommendation: For v1, use URL-based avatar (paste URL) or skip avatar upload entirely. Defer file upload infrastructure to a later phase. The `avatarUrl` field on the user table already supports external URLs.

2. **Pagination Strategy: Client vs Server**
   - What we know: People directory needs pagination. For small-to-medium orgs (< 500 users), client-side pagination is fast enough.
   - What's unclear: At what org size does server-side pagination become necessary?
   - Recommendation: Start with client-side pagination (Server Component fetches all users, TanStack Table handles pagination in the browser). This is simpler to build and sufficient for v1. Server-side pagination can be added in a future optimization phase.

3. **Sidebar Navigation**
   - What we know: Dashboard layout has a minimal header. The architecture.md mentions a sidebar.
   - What's unclear: Whether sidebar should be built in this phase or deferred.
   - Recommendation: Add basic sidebar navigation in this phase since People/Teams needs a nav entry. Keep it minimal: Overview, People, Settings. It is needed for usable navigation between sections.

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `src/lib/db/schema/users.ts`, `teams.ts`, `auth.ts`, `enums.ts` -- all schema fields verified
- Codebase analysis: `src/lib/auth/config.ts` -- JWT session structure with tenantId, role, userId verified
- Codebase analysis: `src/lib/db/tenant-context.ts` -- withTenantContext pattern verified
- Codebase analysis: `src/app/api/settings/company/route.ts` -- API route pattern verified
- Codebase analysis: `src/lib/auth/actions.ts` -- server action and registration patterns verified
- Codebase analysis: `src/lib/email/send.ts` and templates -- email infrastructure verified
- Codebase analysis: `proxy.ts` -- route protection verified, needs /invite addition
- Codebase analysis: `docs/security.md` -- audit log schema documented but not implemented
- Codebase analysis: `package.json` -- TanStack Table/Query and React Hook Form NOT installed

### Secondary (MEDIUM confidence)
- [shadcn/ui data table documentation](https://ui.shadcn.com/docs/components/radix/data-table) -- TanStack Table pattern
- [shadcn/ui components list](https://ui.shadcn.com/docs/components) -- available components verified

### Tertiary (LOW confidence)
- None -- all findings verified against codebase or official documentation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - verified against existing package.json and codebase patterns
- Architecture: HIGH - follows established patterns from Phase 2, extended for new features
- Pitfalls: HIGH - derived from actual codebase analysis (proxy.ts, RLS policies, auth config)
- Audit log: HIGH - schema matches security.md spec, just needs Drizzle implementation

**Research date:** 2026-03-03
**Valid until:** 2026-04-03 (stable -- all libraries are established and codebase patterns are locked)
