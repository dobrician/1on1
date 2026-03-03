# Sprint 01 — Bootstrap & Infrastructure

**Duration**: 2 weeks
**Dependencies**: None

**Status**: Not Started

## Goals

Set up the project foundation: Next.js 15, TypeScript strict mode, Tailwind CSS 4, shadcn/ui, Drizzle ORM connection, Auth.js stub, and development tooling.

## Deliverables

- [ ] **Next.js 15 project** initialized with App Router and TypeScript strict mode
- [ ] **Tailwind CSS 4** configured with design tokens (colors, spacing, typography)
- [ ] **shadcn/ui** installed with base components: Button, Card, Dialog, Form, Input, Label, Select, Textarea, Toast, Dropdown Menu, Sheet, Tabs, Badge, Avatar
- [ ] **Drizzle ORM** configured with PostgreSQL connection (Neon or local Docker)
- [ ] **Auth.js v5** stub configuration (providers configured but not wired to full flows)
- [ ] **TanStack Query** provider configured at app root
- [ ] **React Hook Form** + Zod integration confirmed working
- [ ] **ESLint + Prettier** configured with Next.js recommended rules
- [ ] **Environment configuration**: `.env.example` with all required variables
- [ ] **Docker Compose** for local PostgreSQL development
- [ ] **App shell**: root layout with placeholder sidebar and header

## Acceptance Criteria

- [ ] `npm run dev` starts the app without errors at `localhost:3000`
- [ ] TypeScript strict mode enabled in `tsconfig.json` (`strict: true`)
- [ ] Tailwind CSS classes render correctly (verified with a test page)
- [ ] At least 5 shadcn/ui components render correctly
- [ ] Drizzle can connect to PostgreSQL and run a basic query
- [ ] Auth.js session provider wraps the app (session check works even if no auth flows yet)
- [ ] TanStack Query devtools accessible in development
- [ ] `npm run lint` passes with zero errors
- [ ] `.env.example` documents all required environment variables
- [ ] Docker Compose starts PostgreSQL and app can connect to it
- [ ] Root layout renders sidebar placeholder + header placeholder

## Key Files

```
package.json
tsconfig.json
next.config.ts
tailwind.config.ts
drizzle.config.ts
docker-compose.yml
.env.example
src/app/layout.tsx
src/app/(dashboard)/layout.tsx
src/components/ui/                    # shadcn/ui components
src/components/layout/sidebar.tsx     # placeholder
src/components/layout/header.tsx      # placeholder
src/lib/db/index.ts                   # DB connection
src/lib/auth/config.ts                # Auth.js stub
src/app/providers.tsx                 # TanStack Query + session providers
middleware.ts                         # Auth redirect stub
```
