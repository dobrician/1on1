---
phase: 03-user-team-management
verified: 2026-03-03T17:30:00Z
status: gaps_found
score: 24/25 must-haves verified
re_verification: false
gaps:
  - truth: "Admin can type multiple email addresses and send invites with a selected role"
    status: failed
    reason: "InviteDialog component exists and is fully implemented, but is NEVER imported or rendered anywhere in the application. The People page has no Invite Users button. Admins cannot trigger the invite flow from the UI."
    artifacts:
      - path: "src/components/people/invite-dialog.tsx"
        issue: "Orphaned — exported but zero imports found in the entire src/ directory"
    missing:
      - "Wire InviteDialog into the People page: add an 'Invite people' button that opens the dialog, with onSuccess calling queryClient.invalidateQueries(['users']) to refresh the table"
---

# Phase 3: User & Team Management Verification Report

**Phase Goal:** Admins can build their organization's people structure with invites, roles, teams, and reporting lines
**Verified:** 2026-03-03T17:30:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | RBAC helper returns 403 for insufficient roles and null for authorized requests | VERIFIED | `src/lib/auth/rbac.ts` — `requireRole` uses ROLE_HIERARCHY, returns `NextResponse.json({error:"Forbidden"},{status:403})` or null |
| 2 | Audit log helper inserts events inside a transaction | VERIFIED | `src/lib/audit/log.ts` — `logAuditEvent(tx, event)` calls `tx.insert(auditLog).values(...)` |
| 3 | Invite tokens table exists with tenant_id, email, role, token, expiry | VERIFIED | `src/lib/db/schema/auth.ts` — `inviteTokens` table with all required columns + uniqueIndex on (tenantId, email) |
| 4 | Audit log table exists with tenant_id, actor, action, resource, metadata | VERIFIED | `src/lib/db/schema/audit-log.ts` — complete schema with composite indexes |
| 5 | Sidebar navigation shows links to Overview, People, and Settings | VERIFIED | `src/components/layout/sidebar.tsx` — mainNavItems (Overview, People), settingsNavItems (Company, Audit Log); wired into `src/app/(dashboard)/layout.tsx` |
| 6 | Proxy allows unauthenticated access to /invite/* paths | VERIFIED | `proxy.ts` line 21 — `req.nextUrl.pathname.startsWith("/invite")` included in isAuthPage check |
| 7 | TanStack Query provider wraps dashboard layout | VERIFIED | `src/app/(dashboard)/layout.tsx` — `<QueryProvider>` wraps children inside `<SessionProvider>` |
| 8 | Admin can type multiple email addresses and send invites with a selected role | FAILED | `InviteDialog` component is fully implemented but orphaned — zero imports anywhere in the codebase. No "Invite people" button exists on the People page or anywhere else. |
| 9 | Each invitee receives an email with a link to join the organization | VERIFIED | `src/app/api/invites/route.ts` — renders `InviteEmail` via `@react-email/render` and sends via nodemailer with the invite URL |
| 10 | Clicking the invite link shows a 2-step onboarding form (password, then profile) | VERIFIED | `src/app/(auth)/invite/[token]/page.tsx` + `invite-accept-form.tsx` — Server Component validates token, Client Component renders 2-step wizard with useState(step) |
| 11 | After completing onboarding, the invitee is auto-signed-in and lands in the dashboard | VERIFIED | `invite-accept-form.tsx` line 111 — calls `signIn("credentials", { email, password, callbackUrl: "/overview" })` after successful POST to `/api/invites/accept` |
| 12 | Invite links expire after 7 days and display an error if expired | VERIFIED | `src/app/(auth)/invite/[token]/page.tsx` — checks `invite.expiresAt < new Date()` and renders "Invitation expired" Card |
| 13 | Pending invites appear in the people list with a Pending badge | VERIFIED | `src/app/(dashboard)/people/page.tsx` — merges pending invites into `pendingRows` with `status: "pending"`; `people-table-columns.tsx` renders yellow Badge for pending status |
| 14 | Admin can view all organization users in a sortable, filterable table | VERIFIED | `src/app/(dashboard)/people/page.tsx` + `src/components/people/people-table.tsx` — TanStack Table with sorting, global filter (search), column filters for role/team/status |
| 15 | Admin can change a user's role via inline dropdown in the table | VERIFIED | `src/components/people/role-select.tsx` — `useMutation` PATCHes `/api/users/{userId}` with `{role}`, optimistic update via `queryClient.setQueryData` |
| 16 | Admin can assign a manager to any user via combobox in the table | VERIFIED | `src/components/people/manager-select.tsx` — Command+Popover combobox, `useMutation` PATCHes with `{managerId}`, optimistic update |
| 17 | Admin can deactivate a user from the kebab menu (soft delete) | VERIFIED | `src/components/people/user-actions-menu.tsx` — DELETE `/api/users/{id}`, API sets `isActive: false` |
| 18 | Last admin cannot demote themselves | VERIFIED | `src/app/api/users/[id]/route.ts` — counts active admins, returns 400 "Cannot remove the last admin" |
| 19 | Circular manager assignments are prevented | VERIFIED | `src/app/api/users/[id]/route.ts` — walks up manager chain max 10 levels, returns 400 on circular detection |
| 20 | Admin or manager can create a team with name, description, and team lead | VERIFIED | `src/app/api/teams/route.ts` — `canManageTeams` check, `createTeamSchema` parse, inserts team + teamMember lead row |
| 21 | Teams display as a card grid with name, lead avatar, member count, description | VERIFIED | `src/app/(dashboard)/teams/page.tsx` + `teams-grid.tsx` + `team-card.tsx` — responsive 3-col grid with card components |
| 22 | Team detail page shows member list with remove buttons and editable name/description | VERIFIED | `src/app/(dashboard)/teams/[id]/team-detail-client.tsx` — renders member table with remove, inline edit for name/description |
| 23 | A user can belong to multiple teams simultaneously | VERIFIED | `teamMembers` junction table with `onConflictDoNothing`, no uniqueness on userId alone |
| 24 | Admin can view audit log at Settings > Audit Log | VERIFIED | `src/app/(dashboard)/settings/audit-log/page.tsx` — admin-only redirect guard, renders `AuditLogClient` |
| 25 | Audit log is searchable by action type and filterable by date range | VERIFIED | `src/app/(dashboard)/settings/audit-log/audit-log-client.tsx` — action Select dropdown, two date inputs, `useQuery` rebuilds params on state change |

**Score:** 24/25 truths verified

---

### Required Artifacts

#### Plan 01 — Infrastructure Foundation

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/db/schema/audit-log.ts` | Audit log schema with indexes | VERIFIED | `auditLog` table with composite indexes on (tenantId, action, createdAt) and (tenantId, actorId, createdAt) |
| `src/lib/db/schema/auth.ts` | invite_token table | VERIFIED | `inviteTokens` table with uniqueIndex on (tenantId, email), 7-day expiry pattern |
| `src/lib/auth/rbac.ts` | RBAC helpers | VERIFIED | Exports `requireRole`, `canManageTeams`, `isAdmin` |
| `src/lib/audit/log.ts` | Audit log helper | VERIFIED | Exports `logAuditEvent(tx, event)` — transactional insert |
| `src/lib/validations/user.ts` | User Zod schemas | VERIFIED | Exports `inviteUsersSchema`, `acceptInviteSchema`, `updateProfileSchema`, `updateUserRoleSchema`, `assignManagerSchema` |
| `src/lib/validations/team.ts` | Team Zod schemas | VERIFIED | Exports `createTeamSchema`, `updateTeamSchema`, `addTeamMembersSchema`, `removeTeamMemberSchema` |
| `src/providers/query-provider.tsx` | TanStack Query provider | VERIFIED | Exports `QueryProvider`, staleTime 60s, refetchOnWindowFocus false |
| `src/components/layout/sidebar.tsx` | Sidebar navigation | VERIFIED | Overview, People, Settings section (admin-only) with role-based visibility |

#### Plan 02 — Invite Flow

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/app/api/invites/route.ts` | POST send invites | VERIFIED | Admin-only, sends bulk invites with duplicate/existing checks, audit logging |
| `src/app/api/invites/accept/route.ts` | POST accept invite (public) | VERIFIED | No auth, bcrypt hash, user insert, invite mark accepted, audit log |
| `src/app/api/invites/resend/route.ts` | POST resend invite | VERIFIED | Admin-only, generates new token, sends new email, audit logged |
| `src/lib/email/templates/invite.tsx` | InviteEmail template | VERIFIED | Exports `InviteEmail`, renders org name, inviter name, role, 7-day expiry footer |
| `src/components/people/invite-dialog.tsx` | Multi-email invite dialog | ORPHANED | Component exists and is fully implemented, but never imported anywhere. No entry point in the UI. |
| `src/app/(auth)/invite/[token]/page.tsx` | 2-step onboarding page | VERIFIED | Server Component validates token (invalid/accepted/expired states), renders `InviteAcceptForm` |

#### Plan 03 — People Directory

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/app/api/users/route.ts` | GET list users | VERIFIED | Returns users with team memberships + pending invites merged |
| `src/app/api/users/[id]/route.ts` | GET/PATCH/DELETE single user | VERIFIED | Role change, manager assignment, profile update, deactivation, reactivation — all with RBAC + audit |
| `src/app/(dashboard)/people/page.tsx` | People directory page | VERIFIED | Server Component fetches users + pending invites + teams, passes to PeopleTable |
| `src/components/people/people-table.tsx` | TanStack Table | VERIFIED | Sorting, global search, role/team/status filters, pagination, ProfileSheet on row click |
| `src/components/people/people-table-columns.tsx` | Column definitions | VERIFIED | 7 columns: name, email, role (RoleSelect), teams, manager (ManagerSelect), status, actions (UserActionsMenu) |
| `src/components/people/people-tabs.tsx` | People/Teams tab wrapper | VERIFIED | URL-based tab navigation, highlights active tab via usePathname |

#### Plan 04 — Team Management & Audit Log

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/app/api/teams/route.ts` | GET/POST teams | VERIFIED | GET includes member counts + manager info; POST requires canManageTeams, inserts team + optional lead member |
| `src/app/api/teams/[id]/route.ts` | GET/PATCH/DELETE team | VERIFIED | Full CRUD with RBAC, audit logging |
| `src/app/api/teams/[id]/members/route.ts` | POST/DELETE team members | VERIFIED | onConflictDoNothing for add, canManageTeams guard, audit logged |
| `src/app/api/audit-log/route.ts` | GET audit log (admin only) | VERIFIED | requireRole("admin"), server-side pagination, action/date/search filters, actor join |
| `src/app/(dashboard)/teams/page.tsx` | Teams card grid page | VERIFIED | Server Component + TeamsGrid Client Component with responsive 3-col grid |
| `src/app/(dashboard)/teams/[id]/page.tsx` | Team detail page | VERIFIED | Server Component + TeamDetailClient for interactivity |
| `src/app/(dashboard)/settings/audit-log/page.tsx` | Audit log viewer | VERIFIED | Admin-only redirect, AuditLogClient with expandable rows |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/lib/audit/log.ts` | `src/lib/db/schema/audit-log.ts` | `import auditLog from schema` | WIRED | Line 2: `import { auditLog } from "@/lib/db/schema/audit-log"` |
| `src/app/(dashboard)/layout.tsx` | `src/providers/query-provider.tsx` | `QueryProvider wrapping children` | WIRED | Line 5+21: imports and renders `<QueryProvider>` |
| `src/app/(dashboard)/layout.tsx` | `src/components/layout/sidebar.tsx` | `Sidebar in layout` | WIRED | Line 6+24: imports and renders `<Sidebar />` |
| `src/app/api/invites/route.ts` | `src/lib/email/templates/invite.tsx` | `render + nodemailer send` | WIRED | Line 13+152: imports `InviteEmail`, calls `render(InviteEmail(...))` then `sendMail` |
| `src/app/api/invites/route.ts` | `src/lib/audit/log.ts` | `logAuditEvent for invite_sent` | WIRED | Lines 12+140: imports and calls `logAuditEvent(tx, { action: "invite_sent" })` |
| `src/app/(auth)/invite/[token]/page.tsx` | `src/app/api/invites/accept/route.ts` | `form submit to accept endpoint` | WIRED | `invite-accept-form.tsx` line 91: `fetch("/api/invites/accept", ...)` |
| `src/app/api/invites/accept/route.ts` | `src/lib/db/schema/users.ts` | `insert new user` | WIRED | Lines 5+68: imports `users`, calls `tx.insert(users).values(...)` |
| `src/components/people/people-table.tsx` | `/api/users` | `useQuery fetch for user list` | WIRED | Line 54-61: `useQuery({ queryFn: () => fetch("/api/users")... })` |
| `src/components/people/role-select.tsx` | `/api/users/[id]` | `useMutation PATCH for role change` | WIRED | Line 31: `fetch(\`/api/users/${userId}\`, { method: "PATCH" })` |
| `src/app/api/users/[id]/route.ts` | `src/lib/auth/rbac.ts` | `requireRole + isAdmin checks` | WIRED | Lines 4+127+204+450: `requireRole(session.user.role, "admin")` at multiple points |
| `src/app/api/users/[id]/route.ts` | `src/lib/audit/log.ts` | `logAuditEvent for mutations` | WIRED | Lines 5+180+285+337+408+509: `logAuditEvent(tx, {...})` on every mutation |
| `src/app/api/teams/route.ts` | `src/lib/auth/rbac.ts` | `canManageTeams check` | WIRED | Lines 4+97: `if (!canManageTeams(...))` |
| `src/app/api/teams/[id]/members/route.ts` | `src/lib/db/schema/teams.ts` | `insert/delete teamMembers` | WIRED | Lines 10+79-87: `tx.insert(teamMembers).values(...)` |
| `src/app/api/teams/route.ts` | `src/lib/audit/log.ts` | `logAuditEvent for team mutations` | WIRED | Lines 5+146: `logAuditEvent(tx, { action: "team_created" })` |
| `src/app/(dashboard)/settings/audit-log/page.tsx` | `/api/audit-log` | `fetch audit events` | WIRED | `audit-log-client.tsx` line 144: `fetch(\`/api/audit-log?${queryParams}\`)` |
| `src/components/people/invite-dialog.tsx` | `src/app/(dashboard)/people/page.tsx` | `InviteDialog rendered via Invite button` | NOT WIRED | InviteDialog is never imported. No "Invite people" button exists anywhere. |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| USER-01 | 03-02 | Admin can invite users via email | PARTIAL | API route works; dialog exists but is orphaned (no UI entry point) |
| USER-02 | 03-02 | Invited user receives email with magic link to set password | VERIFIED | `/api/invites` sends InviteEmail via nodemailer; `/invite/[token]` page + 2-step form + auto sign-in all wired |
| USER-03 | 03-03 | User can edit their profile (first name, last name, job title, avatar) | VERIFIED | PATCH `/api/users/[id]` with `updateProfileSchema`; `profile-edit-form.tsx` on `/people/[id]` |
| USER-04 | 03-03 | Admin can assign roles: admin, manager, or member | VERIFIED | PATCH `/api/users/[id]` with `role` field; inline `RoleSelect` in table; last-admin guard enforced |
| USER-05 | 03-03 | Each user can have a manager_id establishing reporting lines | VERIFIED | PATCH `/api/users/[id]` with `managerId`; `ManagerSelect` combobox; circular reference prevention enforced |
| USER-06 | 03-03 | Admin can deactivate a user (soft delete preserving historical data) | VERIFIED | DELETE `/api/users/[id]` sets `isActive: false`; UserActionsMenu Deactivate/Reactivate wired |
| TEAM-01 | 03-04 | Admin or manager can create teams with name, description, and team lead | VERIFIED | POST `/api/teams` with `canManageTeams` check; `TeamCreateDialog` wired in `TeamsGrid` |
| TEAM-02 | 03-04 | Admin or manager can add/remove members to teams | VERIFIED | POST/DELETE `/api/teams/[id]/members`; `MemberPicker` and remove buttons in `TeamDetailClient` |
| TEAM-03 | 03-04 | Teams support lead and member roles | VERIFIED | `teamMemberRoleEnum` with "lead"/"member"; lead assigned on team create, transferable via PATCH |
| TEAM-04 | 03-04 | A user can belong to multiple teams | VERIFIED | Junction table `teamMembers` with `onConflictDoNothing`; no per-user uniqueness constraint |
| SEC-03 | 03-01, 03-03 | RBAC enforced at API route level | VERIFIED | `requireRole` and `isAdmin` guards on every admin-only mutation route; members get read-only table |
| SEC-04 | 03-03 | Resource-level authorization checks beyond role | VERIFIED | Circular manager check, last-admin check, self-deactivation check, self vs. admin profile edit |
| SEC-06 | 03-01, 03-04 | Audit log records significant events | VERIFIED | `logAuditEvent` called for invite_sent, invite_accepted, invite_resent, role_changed, manager_assigned, user_deactivated, user_reactivated, profile_updated, team_created, team_deleted, member_added/removed |

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/components/people/invite-dialog.tsx` | whole file | Orphaned component — exported, fully implemented, but never imported | Blocker | Admin cannot send invites from the UI |

No TODO/FIXME/PLACEHOLDER comments found in Phase 3 files. No empty implementations detected. All API routes return real data from the database.

---

### Human Verification Required

#### 1. Invite Flow End-to-End

**Test:** Log in as admin, navigate to /people, and look for an "Invite people" button.
**Expected:** Button should open a dialog with a multi-email textarea and role selector.
**Why human:** The InviteDialog is orphaned — there is no button to open it. This must fail until the gap is closed.

#### 2. Auto Sign-In After Invite Acceptance

**Test:** Accept an invite through the /invite/[token] page and complete the 2-step onboarding form.
**Expected:** After submitting, user is automatically authenticated and redirected to /overview without a separate login step.
**Why human:** The `signIn("credentials", ...)` call behavior depends on Auth.js session setup; cannot verify the redirect target programmatically.

#### 3. Role-Based Sidebar Visibility

**Test:** Log in as a member (non-admin), check sidebar.
**Expected:** Settings section (Company, Audit Log) should not appear. Only Overview and People visible.
**Why human:** useSession-based conditional rendering requires a browser session.

---

### Gaps Summary

**One gap blocks full goal achievement:** The `InviteDialog` component is fully built but orphaned. The People page (`/people`) has no "Invite people" button. Admins cannot access the invite UI — the entire invite flow is only reachable if you know the API endpoint directly.

This is a wiring gap, not a missing implementation. The fix is minimal: import `InviteDialog` into the people page, add a controlled `open` state, and render an "Invite people" button. The `onSuccess` callback should call `queryClient.invalidateQueries(["users"])` to refresh the table after invites are sent.

All other 24 truths are verified. The infrastructure (RBAC, audit log, schemas, migrations), all API routes (invites, users, teams, audit-log), all UI pages (people, teams, team detail, audit log), and all key links are substantive and properly wired.

**Requirements impact:** USER-01 is partially satisfied — the API backend for invite sending works — but the UI trigger does not exist.

---

_Verified: 2026-03-03T17:30:00Z_
_Verifier: Claude (gsd-verifier)_
