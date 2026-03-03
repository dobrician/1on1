# Phase 3: User & Team Management

**Status**: Next
**Depends on**: Phase 2

## Goal

Admins can build their organization's people structure with invites, roles, teams, and reporting lines.

## Success Criteria

1. Admin can invite users via email and invitees receive a magic link to join and set their password
2. Admin can assign roles (admin, manager, member) and each role sees only what it should (RBAC enforced at API level)
3. Users can edit their profile (name, job title, avatar) and admin can set manager-report relationships
4. Admin or manager can create teams, assign leads, and add/remove members (users can belong to multiple teams)
5. Significant events (invites, deactivations, role changes, settings changes) are recorded in the audit log

## Planned Scope

- **Plan 03-01**: User invitation flow and profile management
- **Plan 03-02**: RBAC enforcement and resource-level authorization
- **Plan 03-03**: Team management and reporting lines
- **Plan 03-04**: Audit logging

## Requirements

USER-01, USER-02, USER-03, USER-04, USER-05, USER-06, TEAM-01, TEAM-02, TEAM-03, TEAM-04, SEC-03, SEC-04, SEC-06
