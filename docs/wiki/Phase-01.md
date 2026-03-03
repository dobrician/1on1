# Phase 1: Foundation & Infrastructure

**Status**: Complete (2026-03-03)
**Depends on**: None (first phase)

## Goal

A running application skeleton with correct multi-tenancy, encryption, and deployment infrastructure that all future phases build on.

## Success Criteria

1. Next.js application starts locally via Docker Compose on port 4300 and is accessible on the local network
2. Application deploys successfully to Vercel with serverless functions
3. PostgreSQL database has all schema tables with RLS policies enforced via a dedicated app role (not neondb_owner)
4. Private note encryption round-trips correctly (encrypt, store, decrypt) with key versioning
5. Every database query runs inside a `withTenantContext()` wrapper that sets tenant_id via SET LOCAL

## What Was Built

### Plan 01-01: Project Scaffolding
- Next.js 15 with Bun, TypeScript strict mode, standalone output
- Tailwind CSS v4 with shadcn/ui (Neutral theme, CSS-first config)
- Drizzle ORM with Neon serverless driver
- Docker Compose with PostgreSQL 16 (blue-green databases: `oneonone_stable`, `oneonone_dev`)
- Multi-stage Dockerfile (Bun build, Node.js 22 runtime)
- Dedicated `app_user` role without BYPASSRLS

### Plan 01-02: Database Schema & RLS
- All 14 database tables defined in Drizzle ORM matching `docs/data-model.md`
- 16 pgEnum types for domain enumerations
- Row-Level Security on all tables with tenant isolation policies
- Private note RESTRICTIVE tenant + author-only RLS (AND logic via FORCE ROW LEVEL SECURITY)
- `withTenantContext()` wrapper using `set_config` with SET LOCAL transactions
- Junction table RLS via subquery JOIN to parent table

### Plan 01-03: Encryption & Seed Data
- AES-256-GCM encryption with HKDF per-tenant key derivation and key versioning
- 11 Vitest tests covering round-trips, key isolation, unicode, tampering detection
- Idempotent seed data: Acme Corp (7 users, 2 teams, 2 templates, 3 series, 3 sessions) and Beta Inc (3 users, 1 template, 1 series)
- RLS tenant isolation verified with seeded data

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| Bun as package manager | User preference; `npx` used for initial scaffold then converted |
| Neon serverless driver for app, `pg` for seed | Neon requires WebSocket (production); local PostgreSQL uses TCP |
| Migrations applied via `psql` not `drizzle-kit migrate` | Neon driver cannot connect to local PostgreSQL |
| Private note RLS uses RESTRICTIVE + permissive | AND logic between tenant isolation and author access control |
| Deterministic UUIDs in seed data | Enables idempotent re-runs via `onConflictDoUpdate` |
| shadcn/ui Neutral base color | Aligns with minimalistic Apple-level design philosophy |

## Key Files

```
package.json, next.config.ts, tsconfig.json
docker-compose.yml, Dockerfile, scripts/init-db.sh
drizzle.config.ts
src/lib/db/index.ts
src/lib/db/schema/*.ts (14 schema files + index.ts + enums.ts)
src/lib/db/tenant-context.ts
src/lib/db/seed.ts
src/lib/db/migrations/0000_complex_scalphunter.sql
src/lib/db/migrations/0001_rls_policies.sql
src/lib/encryption/keys.ts
src/lib/encryption/private-notes.ts
src/lib/encryption/__tests__/encryption.test.ts
vitest.config.ts
```

## Requirements Satisfied

INFR-01, INFR-02, INFR-03 (partial — Vercel needs user setup), INFR-04, ORG-02, ORG-03, SEC-01, SEC-02, SEC-05

## Verification

18/18 automated checks passed. 3 items need human verification (dev server render, Docker stable instance, Vercel deployment). Full report: `.planning/phases/01-foundation-infrastructure/01-VERIFICATION.md`
