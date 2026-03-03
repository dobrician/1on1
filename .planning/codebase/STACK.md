# Technology Stack

**Analysis Date:** 2026-03-03

## Languages

**Primary:**
- TypeScript (strict mode) - End-to-end type safety across frontend and backend code
- JavaScript - Configuration files and scripts

**Secondary:**
- SQL - Database queries via Drizzle ORM (PostgreSQL)

## Runtime

**Environment:**
- Node.js (LTS) - Server runtime for Next.js

**Package Manager:**
- npm - JavaScript package management
- Lockfile: `package-lock.json` (expected when project is scaffolded)

## Frameworks

**Core:**
- Next.js 15 (App Router) - React framework with Server Components, API routes, file-based routing
- React 19 - UI component library

**UI & Styling:**
- shadcn/ui - Accessible, copy-paste component library (Radix UI based)
- Tailwind CSS 4 - Utility-first CSS framework with design tokens
- Radix UI - Headless component primitives for shadcn/ui

**Forms & Validation:**
- React Hook Form - Performant form state management
- Zod - Schema validation library (shared between client and server)

**State Management:**
- TanStack Query (React Query) - Server state caching, background refetching, optimistic updates
- React Context API - Local component state

**Charts & Visualization:**
- Recharts - React charting library (line charts, bar charts, radar charts, heatmaps)

**Authentication:**
- Auth.js v5 (NextAuth) - Session management, OAuth (Google, Microsoft), magic links, credential auth

**Database & ORM:**
- Drizzle ORM - Type-safe SQL query builder and schema management
- PostgreSQL 16 - Relational database with JSONB, Row-Level Security (RLS), window functions

**Email:**
- Resend - Transactional email delivery service
- React Email - React-based email template library

**Background Jobs:**
- Inngest - Event-driven serverless functions for async operations (reminders, analytics, action items)

**File Storage:**
- Cloudflare R2 or AWS S3 - Object storage for profile pictures, PDF exports, attachments

**Build & Development:**
- TypeScript Compiler (tsc) - Type checking
- ESLint - Code linting
- Prettier - Code formatting (expected from conventions)

## Key Dependencies

**Critical:**
- next - Web framework with API routes and Server Components
- react - UI library and hooks
- react-dom - React DOM rendering
- drizzle-orm - Type-safe database queries
- zod - Runtime schema validation
- @hookform/resolvers - Zod integration with React Hook Form
- @tanstack/react-query - Server state management

**Infrastructure:**
- @auth/nextjs - Auth.js integration for Next.js
- resend - Email API client
- inngest - Background job orchestration
- postgres - PostgreSQL client (used by Drizzle)

**UI Components & Styling:**
- @radix-ui/* - Headless component primitives
- class-variance-authority - Utility for managing component class variants
- clsx - Conditional CSS class joining
- lucide-react - Icon library
- recharts - Charting library

## Configuration

**Environment:**
- `.env.local` - Local development environment variables (git-ignored)
- `.env.example` - Template for required environment variables
- Environment variables include:
  - `DATABASE_URL` - PostgreSQL connection string
  - `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTH_MICROSOFT_ID`, `AUTH_MICROSOFT_SECRET` - Auth configuration
  - `RESEND_API_KEY` - Email service credentials
  - `R2_ACCOUNT_ID`, `R2_ACCESS_KEY`, `R2_SECRET_KEY`, `R2_BUCKET` - File storage configuration
  - `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY` - Background jobs configuration
  - `NEXT_PUBLIC_APP_URL` - Public application URL

**Build:**
- `tsconfig.json` - TypeScript compiler configuration (strict mode)
- `next.config.ts` - Next.js configuration
- `tailwind.config.ts` - Tailwind CSS configuration with design tokens
- `drizzle.config.ts` - Drizzle ORM configuration
- `.eslintrc.*` - ESLint configuration (expected)
- `.prettierrc` - Prettier formatting configuration (expected)

## Platform Requirements

**Development:**
- Node.js LTS
- Docker & Docker Compose - Local PostgreSQL database
- Git - Version control

**Production:**
- Vercel - Serverless hosting for Next.js (edge functions + serverless functions)
- Neon or Supabase - Managed PostgreSQL 16 hosting with branching support
- Inngest - Serverless background job execution
- Resend - Email delivery service
- Cloudflare R2 or AWS S3 - File storage
- Auth.js compatible identity providers (Google, Microsoft OAuth; Okta/Azure AD for SAML)

---

*Stack analysis: 2026-03-03*
