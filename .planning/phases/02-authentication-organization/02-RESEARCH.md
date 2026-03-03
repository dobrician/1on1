# Phase 2: Authentication & Organization - Research

**Researched:** 2026-03-03
**Domain:** Auth.js v5 (NextAuth) with credentials + OAuth, Drizzle adapter, email verification/password reset, organization registration, Next.js 16 route protection
**Confidence:** HIGH

## Summary

Phase 2 adds authentication and organization management to the 1on1 app. The core stack is Auth.js v5 (next-auth@beta) with the Drizzle adapter (`@auth/drizzle-adapter`), supporting three auth methods: email/password credentials, Google OAuth, and Microsoft Entra ID (formerly Azure AD) OAuth. The existing user table must be extended with a `password_hash` column and linked to new Auth.js-required tables (`account`, `session`, `verification_token`).

The project runs Next.js 16.1.6, which means route protection uses `proxy.ts` (not `middleware.ts` -- renamed in Next.js 16). Auth.js v5 exports a single `auth()` function that works in server components, API routes, proxy, and server actions. The session strategy should be JWT (default for Auth.js) since the project already has its own user table with tenant context and role information -- the JWT callbacks will inject `tenantId`, `role`, and `userId` into the session token. Database sessions are unnecessary overhead given the existing RLS + `withTenantContext()` pattern.

Email verification and password reset are custom flows (not Auth.js's built-in email provider) using Resend for transactional email and React Email for templates. Verification tokens are stored in a custom `email_verification_token` table (separate from Auth.js's `verification_token` which is for magic links). Password hashing uses `bcryptjs` (pure JavaScript, works everywhere including Bun runtime and Vercel serverless -- no native compilation issues).

**Primary recommendation:** Use Auth.js v5 with JWT strategy, extend the existing user schema with password_hash, create Auth.js adapter tables (account, session, verification_token), and build custom registration/login/verification/reset pages under the `(auth)` route group. Note: Auth.js is now in maintenance mode (Better Auth team took over in September 2025), but it remains production-ready and is the stack specified in project docs.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AUTH-01 | User can create account with email and password | Credentials provider with bcryptjs hashing; custom signup server action that creates user + tenant in DB, then calls signIn() |
| AUTH-02 | User receives email verification after signup | Custom verification_token table; Resend API sends React Email template with signed token URL; verify endpoint marks emailVerified |
| AUTH-03 | User can reset password via time-limited email link | Custom password_reset_token table; Resend sends reset email; reset page validates token, updates password_hash |
| AUTH-04 | User session persists across browser refresh (HTTP-only cookies) | Auth.js v5 JWT strategy stores session in HTTP-only cookie; auth() reads session on every request; proxy.ts refreshes session |
| AUTH-05 | User can sign in with Google OAuth | Google provider from next-auth/providers/google; AUTH_GOOGLE_ID/SECRET env vars; callback URL /api/auth/callback/google |
| AUTH-06 | User can sign in with Microsoft OAuth | MicrosoftEntraID provider from next-auth/providers/microsoft-entra-id; AUTH_MICROSOFT_ENTRA_ID_ID/SECRET/ISSUER env vars |
| AUTH-07 | User can log out from any page | signOut() from next-auth/react (client) or auth.ts export (server action); clears session cookie |
| ORG-01 | Admin can register a new organization with name, slug, and admin account | Registration page creates tenant + admin user in single transaction; slug auto-generated from name with uniqueness check |
| ORG-04 | Organization admin can configure settings (timezone, default cadence, default duration) | Settings page reads/writes tenant.settings JSONB; Zod schema validates settings structure |
| ORG-05 | Organization type supports both for-profit and non-profit models | Add org_type field to tenant table or settings JSONB; enum or string discriminator |
</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next-auth | 5.x (beta/RC) | Authentication framework | Auth.js v5 -- single auth() function for entire app; official Next.js auth solution; JWT + OAuth + Credentials |
| @auth/drizzle-adapter | 1.11.x | Database adapter for Auth.js | Official Drizzle adapter; handles account linking, session storage, token management |
| bcryptjs | 3.x | Password hashing | Pure JavaScript bcrypt -- no native compilation; works in Bun, Vercel serverless, and Edge; same API as bcrypt |
| resend | 4.x | Transactional email API | Simple REST API for sending emails; React Email integration; used in project stack (docs/architecture.md) |
| @react-email/components | latest | Email template components | React components (Html, Head, Body, Container, Text, Button, etc.) for building email templates with Tailwind support |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| next-auth/providers/google | (bundled) | Google OAuth provider | AUTH-05: Sign in with Google |
| next-auth/providers/microsoft-entra-id | (bundled) | Microsoft Entra ID OAuth | AUTH-06: Sign in with Microsoft |
| next-auth/providers/credentials | (bundled) | Email/password auth | AUTH-01: Custom credential authentication |
| next-auth/react | (bundled) | Client-side auth hooks | SessionProvider, useSession(), signIn(), signOut() for client components |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Auth.js v5 | Better Auth | Better Auth is now recommended for new projects (Auth.js team joined Better Auth Sep 2025); but Auth.js is specified in project docs, still maintained for security, and has massive ecosystem. Switching would invalidate project documentation. |
| bcryptjs | Bun.password | Bun has built-in bcrypt via Bun.password.hash(); but uses $2b$ prefix vs $2a$ prefix compatibility issues, and code wouldn't be portable to Node.js runtime (Vercel serverless uses Node.js, not Bun) |
| bcryptjs | bcrypt (native) | bcrypt is faster (C++ native addon) but requires compilation, breaks in serverless/Edge, and install issues on some platforms |
| JWT strategy | Database sessions | Database sessions allow server-side invalidation; but add DB query on every request, and JWT is sufficient for this app since we already have RLS + tenant context |
| Custom email verification | Auth.js Email provider | Auth.js Email provider handles magic links natively; but we need credentials-based signup with separate verification flow, not passwordless magic links |

**Installation:**
```bash
# Auth.js v5 with Drizzle adapter
bun add next-auth@beta @auth/drizzle-adapter

# Password hashing
bun add bcryptjs
bun add -d @types/bcryptjs

# Email
bun add resend @react-email/components react-email

# Dev: email preview
bun add -d react-email
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   ├── (auth)/                    # Public auth routes (no sidebar)
│   │   ├── login/page.tsx         # Email/password + OAuth sign-in
│   │   ├── register/page.tsx      # Organization registration
│   │   ├── verify-email/page.tsx  # Email verification landing
│   │   ├── forgot-password/page.tsx
│   │   ├── reset-password/page.tsx
│   │   └── layout.tsx             # Centered card layout
│   ├── (dashboard)/               # Protected routes (sidebar layout)
│   │   └── settings/
│   │       └── company/page.tsx   # Organization settings (ORG-04)
│   └── api/
│       └── auth/
│           └── [...nextauth]/route.ts  # Auth.js route handler
├── lib/
│   ├── auth/
│   │   ├── config.ts              # Auth.js configuration (providers, callbacks, adapter)
│   │   └── actions.ts             # Server actions: register, verify, reset password
│   ├── db/
│   │   └── schema/
│   │       ├── auth.ts            # Auth.js tables: account, session, verification_token
│   │       └── users.ts           # Extended user table (+ password_hash)
│   ├── email/
│   │   ├── send.ts                # Resend client wrapper
│   │   └── templates/
│   │       ├── verification.tsx   # Email verification template
│   │       └── password-reset.tsx # Password reset template
│   └── validations/
│       ├── auth.ts                # Zod schemas: login, register, reset
│       └── organization.ts        # Zod schemas: org settings
├── types/
│   └── next-auth.d.ts             # Auth.js type augmentation (tenantId, role)
└── proxy.ts                       # Next.js 16 route protection (was middleware.ts)
```

### Pattern 1: Auth.js Configuration with Custom Schema
**What:** Central auth configuration that connects Auth.js to existing Drizzle schema
**When to use:** Initial setup -- single source of truth for all auth behavior

```typescript
// src/lib/auth/config.ts
import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id"
import Credentials from "next-auth/providers/credentials"
import { DrizzleAdapter } from "@auth/drizzle-adapter"
import { db } from "@/lib/db"
import { users, accounts, sessions, verificationTokens } from "@/lib/db/schema"
import bcrypt from "bcryptjs"
import { signInSchema } from "@/lib/validations/auth"

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",  // Auth errors redirect to login with error param
  },
  providers: [
    Google,
    MicrosoftEntraID,
    Credentials({
      credentials: {
        email: { type: "email" },
        password: { type: "password" },
      },
      authorize: async (credentials) => {
        const { email, password } = await signInSchema.parseAsync(credentials)

        // Look up user by email (must also check tenant context)
        const user = await db.query.users.findFirst({
          where: (u, { eq, and }) => and(
            eq(u.email, email),
            eq(u.isActive, true),
          ),
        })

        if (!user || !user.passwordHash) return null

        const valid = await bcrypt.compare(password, user.passwordHash)
        if (!valid) return null

        return {
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          tenantId: user.tenantId,
          role: user.role,
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.tenantId = user.tenantId
        token.role = user.role
        token.userId = user.id
      }
      return token
    },
    session({ session, token }) {
      session.user.id = token.userId as string
      session.user.tenantId = token.tenantId as string
      session.user.role = token.role as string
      return session
    },
  },
})
```

### Pattern 2: TypeScript Type Augmentation for Custom Session Fields
**What:** Extend Auth.js types to include tenantId and role on session/token
**When to use:** Required for TypeScript strict mode -- without this, accessing session.user.tenantId throws type errors

```typescript
// src/types/next-auth.d.ts
import "next-auth"
import "next-auth/jwt"

declare module "next-auth" {
  interface User {
    tenantId: string
    role: string
  }
  interface Session {
    user: User & {
      id: string
      tenantId: string
      role: string
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    tenantId: string
    role: string
    userId: string
  }
}
```

### Pattern 3: Proxy-Level Route Protection (Next.js 16)
**What:** proxy.ts protects dashboard routes; redirects unauthenticated users to /login
**When to use:** Global route protection -- runs before any page renders

```typescript
// proxy.ts (project root)
import { auth } from "@/lib/auth/config"

export const proxy = auth((req) => {
  const isAuth = !!req.auth
  const isAuthPage = req.nextUrl.pathname.startsWith("/login") ||
    req.nextUrl.pathname.startsWith("/register") ||
    req.nextUrl.pathname.startsWith("/verify-email") ||
    req.nextUrl.pathname.startsWith("/forgot-password") ||
    req.nextUrl.pathname.startsWith("/reset-password")

  if (!isAuth && !isAuthPage) {
    return Response.redirect(new URL("/login", req.nextUrl.origin))
  }

  if (isAuth && isAuthPage) {
    return Response.redirect(new URL("/overview", req.nextUrl.origin))
  }
})

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
```

### Pattern 4: Server Action for Registration
**What:** Server action that creates tenant + admin user in single transaction
**When to use:** Organization registration (ORG-01)

```typescript
// src/lib/auth/actions.ts
"use server"

import { db } from "@/lib/db"
import { tenants, users } from "@/lib/db/schema"
import { signIn } from "@/lib/auth/config"
import bcrypt from "bcryptjs"
import { registerSchema } from "@/lib/validations/auth"
import { sendVerificationEmail } from "@/lib/email/send"

export async function register(formData: FormData) {
  const data = registerSchema.parse({
    companyName: formData.get("companyName"),
    email: formData.get("email"),
    password: formData.get("password"),
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
  })

  const slug = data.companyName.toLowerCase().replace(/[^a-z0-9]+/g, "-")
  const passwordHash = await bcrypt.hash(data.password, 12)

  // Create tenant + admin user in single transaction
  const result = await db.transaction(async (tx) => {
    const [tenant] = await tx.insert(tenants).values({
      name: data.companyName,
      slug,
      settings: {
        timezone: "UTC",
        defaultCadence: "biweekly",
        defaultDurationMinutes: 30,
      },
    }).returning()

    const [user] = await tx.insert(users).values({
      tenantId: tenant.id,
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      role: "admin",
      passwordHash,
    }).returning()

    return { tenant, user }
  })

  // Send verification email
  await sendVerificationEmail(result.user.email, result.user.id)

  // Sign in immediately (email verification enforced on protected routes)
  await signIn("credentials", {
    email: data.email,
    password: data.password,
    redirect: false,
  })
}
```

### Pattern 5: OAuth Account Linking
**What:** When a user signs in via OAuth, link to existing user if email matches
**When to use:** AUTH-05, AUTH-06 -- OAuth sign-in for users who already have an account

```typescript
// In auth config callbacks:
callbacks: {
  async signIn({ user, account }) {
    if (account?.provider === "google" || account?.provider === "microsoft-entra-id") {
      // Check if a user with this email already exists
      const existingUser = await db.query.users.findFirst({
        where: (u, { eq }) => eq(u.email, user.email!),
      })

      if (existingUser) {
        // Auth.js adapter handles account linking automatically
        // if emails match and user is signed in
        return true
      }

      // For OAuth-only users, they must be invited first or register org
      // Deny sign-in if no user record exists
      return false
    }
    return true
  },
}
```

### Anti-Patterns to Avoid

- **Relying solely on proxy.ts for auth:** CVE-2025-29927 showed middleware can be bypassed. Always verify session in server components and API routes too. Defense in depth.
- **Storing tenant_id in URL or request params:** Tenant ID must come from the authenticated session (JWT token), never from query params, path params, or request body.
- **Using bcrypt (native) in serverless:** Native bcrypt requires compilation and fails in Vercel serverless functions. Use bcryptjs (pure JS) instead.
- **Skipping email verification for OAuth users:** Google/Microsoft return `email_verified` boolean -- check it in the signIn callback.
- **Putting Auth.js config in auth.ts at project root:** Project convention places it at `src/lib/auth/config.ts` for consistency with other lib modules.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| OAuth flow | Custom OAuth2 code | Auth.js Google/MicrosoftEntraID providers | OAuth has CSRF, PKCE, state validation, token refresh -- Auth.js handles all of this |
| Session management | Custom cookie/JWT logic | Auth.js JWT strategy with HTTP-only cookies | Session rotation, CSRF tokens, cookie configuration, expiry handling |
| Password hashing | Custom hash function | bcryptjs with cost factor 12 | bcrypt has built-in salt, configurable work factor, and is the industry standard |
| Account linking | Custom provider-to-user mapping | Auth.js adapter automatic linking | Auth.js links accounts by matching email and handles edge cases (multiple providers, re-linking) |
| CSRF protection | Custom CSRF tokens | Auth.js built-in CSRF | Auth.js generates and validates CSRF tokens on all form submissions |
| Email template rendering | String concatenation HTML | React Email components + render() | React Email handles HTML email compatibility across clients, inlines CSS, provides preview |

**Key insight:** Authentication has hundreds of edge cases (token expiry, race conditions, CSRF, session fixation, OAuth state validation). Auth.js and bcryptjs encode these lessons. Custom auth code is the #1 source of security vulnerabilities in web apps.

## Common Pitfalls

### Pitfall 1: Credentials Provider Does Not Persist to Database by Default
**What goes wrong:** The Credentials provider skips the adapter for user creation. Users created via signUp forms won't be saved unless you do it explicitly.
**Why it happens:** Auth.js designed Credentials as "bring your own DB" -- the adapter handles OAuth/magic link users, not credentials users.
**How to avoid:** Create user records explicitly in your register server action BEFORE calling signIn("credentials"). The authorize() callback only validates credentials -- it doesn't create users.
**Warning signs:** Users can sign up but get "Invalid credentials" on next login attempt.

### Pitfall 2: JWT Callback Runs on Every Request, User Object Only on Sign-In
**What goes wrong:** Trying to access `user.tenantId` in the JWT callback on subsequent requests fails because `user` is only populated during sign-in.
**Why it happens:** The JWT callback receives `user` only when the token is first created (sign-in). On subsequent requests, only `token` is available.
**How to avoid:** In the JWT callback, check `if (user)` before accessing user properties. Store custom fields on the token during sign-in; read them from token on subsequent requests.
**Warning signs:** `token.tenantId` is undefined after page refresh.

### Pitfall 3: OAuth Users Without Existing Tenant
**What goes wrong:** A user signs in with Google but has no tenant_id because they haven't registered an organization.
**Why it happens:** OAuth creates a user via the adapter automatically, but the adapter schema doesn't know about tenant_id.
**How to avoid:** Two strategies: (1) Require organization registration first, then invite users who can later link OAuth -- OAuth-only sign-in is blocked for unknown emails. (2) After OAuth sign-in, redirect to an "organization setup" page if user has no tenant. Strategy (1) is simpler and matches the project's invite flow.
**Warning signs:** NULL tenant_id in user record; RLS queries return empty results.

### Pitfall 4: Next.js 16 proxy.ts vs middleware.ts
**What goes wrong:** Creating middleware.ts instead of proxy.ts -- the auth check never runs.
**Why it happens:** Most Auth.js tutorials and documentation still reference middleware.ts (written for Next.js 14/15).
**How to avoid:** The project is on Next.js 16.1.6. Use `proxy.ts` at project root and export `proxy` (not `middleware`). The proxy runs on Node.js runtime (not Edge).
**Warning signs:** Unauthenticated users can access dashboard pages.

### Pitfall 5: Slug Collisions on Organization Registration
**What goes wrong:** Two companies with similar names get the same slug, causing unique constraint violation.
**Why it happens:** Simple slugification (lowercase + replace spaces with hyphens) doesn't guarantee uniqueness.
**How to avoid:** Check slug uniqueness in the database before insert. If taken, append a random suffix (e.g., "acme-corp-3f8a"). Validate slug format with Zod.
**Warning signs:** Registration fails with database error on company name submission.

### Pitfall 6: Auth.js Drizzle Adapter Schema Mismatch
**What goes wrong:** Auth.js adapter expects specific column names/types that don't match the custom schema.
**Why it happens:** The existing user table has custom columns (tenantId, firstName, lastName, etc.) that the adapter doesn't know about. The adapter expects `name`, `email`, `image`, `emailVerified` fields.
**How to avoid:** Pass custom table references to DrizzleAdapter with `usersTable`, `accountsTable`, etc. Ensure the user table includes all Auth.js-required columns (id, name, email, emailVerified, image) alongside custom columns.
**Warning signs:** "Column not found" errors on OAuth sign-in; adapter tries to insert into non-existent columns.

## Code Examples

### Auth.js Required Schema Tables (Drizzle + PostgreSQL)

```typescript
// src/lib/db/schema/auth.ts
import {
  pgTable, uuid, varchar, text, integer, timestamp,
  primaryKey, uniqueIndex,
} from "drizzle-orm/pg-core"
import { users } from "./users"

// OAuth account links (Google, Microsoft, etc.)
export const accounts = pgTable("account", {
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 255 }).notNull(),
  provider: varchar("provider", { length: 255 }).notNull(),
  providerAccountId: varchar("provider_account_id", { length: 255 }).notNull(),
  refreshToken: text("refresh_token"),
  accessToken: text("access_token"),
  expiresAt: integer("expires_at"),
  tokenType: varchar("token_type", { length: 255 }),
  scope: varchar("scope", { length: 255 }),
  idToken: text("id_token"),
  sessionState: varchar("session_state", { length: 255 }),
}, (table) => [
  primaryKey({ columns: [table.provider, table.providerAccountId] }),
])

// Database sessions (optional with JWT, but needed for adapter compatibility)
export const authSessions = pgTable("auth_session", {
  sessionToken: varchar("session_token", { length: 255 }).primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { withTimezone: true }).notNull(),
})

// Verification tokens (for Auth.js magic links -- may not be used directly)
export const verificationTokens = pgTable("verification_token", {
  identifier: varchar("identifier", { length: 255 }).notNull(),
  token: varchar("token", { length: 255 }).notNull(),
  expires: timestamp("expires", { withTimezone: true }).notNull(),
}, (table) => [
  primaryKey({ columns: [table.identifier, table.token] }),
])
```

### Extended User Table (Adding password_hash and Auth.js fields)

```typescript
// Addition to src/lib/db/schema/users.ts
// The existing user table needs these new columns:
//   passwordHash: varchar("password_hash", { length: 255 }),  -- bcrypt hash
//   emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),  -- Auth.js expects "emailVerified"
//   image: varchar("image", { length: 500 }),  -- Auth.js expects "image" for OAuth avatars
//
// The existing avatarUrl can be aliased or replaced with "image" to match Auth.js conventions.
// firstName + lastName provide the "name" field that Auth.js expects.
```

### Custom Email Verification Token Table

```typescript
// src/lib/db/schema/auth.ts (continued)
export const emailVerificationTokens = pgTable("email_verification_token", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export const passwordResetTokens = pgTable("password_reset_token", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})
```

### Sending Verification Email with Resend

```typescript
// src/lib/email/send.ts
import { Resend } from "resend"
import { VerificationEmail } from "./templates/verification"
import { PasswordResetEmail } from "./templates/password-reset"
import { randomBytes } from "crypto"
import { db } from "@/lib/db"
import { emailVerificationTokens, passwordResetTokens } from "@/lib/db/schema/auth"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendVerificationEmail(email: string, userId: string) {
  const token = randomBytes(32).toString("hex")
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

  await db.insert(emailVerificationTokens).values({
    userId,
    token,
    expiresAt,
  })

  const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify-email?token=${token}`

  await resend.emails.send({
    from: "1on1 <noreply@yourdomain.com>",
    to: email,
    subject: "Verify your email address",
    react: VerificationEmail({ verifyUrl }),
  })
}

export async function sendPasswordResetEmail(email: string, userId: string) {
  const token = randomBytes(32).toString("hex")
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

  await db.insert(passwordResetTokens).values({
    userId,
    token,
    expiresAt,
  })

  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`

  await resend.emails.send({
    from: "1on1 <noreply@yourdomain.com>",
    to: email,
    subject: "Reset your password",
    react: PasswordResetEmail({ resetUrl }),
  })
}
```

### Zod Validation Schemas

```typescript
// src/lib/validations/auth.ts
import { z } from "zod"

export const signInSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email"),
  password: z.string().min(1, "Password is required"),
})

export const registerSchema = z.object({
  companyName: z.string().min(2, "Company name must be at least 2 characters").max(255),
  email: z.string().email("Invalid email"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
})

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})
```

### Organization Settings Schema

```typescript
// src/lib/validations/organization.ts
import { z } from "zod"

export const orgSettingsSchema = z.object({
  timezone: z.string().min(1, "Timezone is required"),
  defaultCadence: z.enum(["weekly", "biweekly", "monthly", "custom"]),
  defaultDurationMinutes: z.number().min(15).max(120),
  orgType: z.enum(["for_profit", "non_profit"]).optional(),
})
```

### SessionProvider Setup for Client Components

```typescript
// src/app/(dashboard)/layout.tsx
import { auth } from "@/lib/auth/config"
import { SessionProvider } from "next-auth/react"
import { redirect } from "next/navigation"

export default async function DashboardLayout({
  children,
}: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect("/login")

  return (
    <SessionProvider session={session}>
      <div className="flex h-screen">
        {/* Sidebar will go here in later phases */}
        <main className="flex-1">{children}</main>
      </div>
    </SessionProvider>
  )
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| middleware.ts for auth | proxy.ts for route protection | Next.js 16 (2025) | File renamed; runs on Node.js runtime instead of Edge; `export { auth as proxy }` |
| Azure AD provider | Microsoft Entra ID provider | Auth.js 2024 | Azure AD provider deprecated; use `next-auth/providers/microsoft-entra-id` |
| getServerSession() / getSession() | auth() universal function | Auth.js v5 (2024) | Single function works everywhere: server components, API routes, proxy, server actions |
| next-auth (v4) | next-auth@beta (v5) | 2023-present | Still in beta/RC; stable in production; `import NextAuth from "next-auth"` instead of `from "next-auth/next"` |
| Auth.js active development | Auth.js maintenance mode | Sep 2025 | Better Auth team maintains Auth.js; security patches only; new features go to Better Auth |
| bcrypt (native) | bcryptjs (pure JS) | Long-standing | Pure JS avoids native compilation issues in serverless; negligible performance difference for auth |

**Deprecated/outdated:**
- `next-auth/providers/azure-ad`: Renamed to `microsoft-entra-id`. The old import still works but is deprecated.
- `middleware.ts` in Next.js 16+: Renamed to `proxy.ts`. Old file still works but is deprecated and will be removed.
- `export { auth as middleware }`: Now `export { auth as proxy }` in Next.js 16.
- Database session strategy with credentials: Auth.js v5 works best with JWT strategy for credentials provider. Database sessions + credentials have known friction (Discussion #4394, Issue #7740).

## Open Questions

1. **OAuth users without pre-existing tenant**
   - What we know: OAuth sign-in creates user records via the adapter, but new OAuth users won't have a tenant_id
   - What's unclear: Should OAuth be allowed only for users who were invited (have a user record)? Or should OAuth users go through org registration too?
   - Recommendation: Block OAuth sign-in for users without existing records. OAuth linking is for invited users who want to use Google/Microsoft instead of password. New org admins must register with credentials first.

2. **Email verification enforcement timing**
   - What we know: AUTH-02 requires verification email after signup
   - What's unclear: Should unverified users be blocked from all features, or just specific features?
   - Recommendation: Allow unverified users to access the dashboard (so they see the app immediately), but show a persistent banner prompting verification. Block sensitive operations (inviting users, changing settings) until verified. This matches the UX flow in docs/ux-flows.md where users see the setup wizard right after registration.

3. **Organization type field location (ORG-05)**
   - What we know: Organization type needs to support for-profit and non-profit
   - What's unclear: Whether this should be a dedicated column or part of the JSONB settings field
   - Recommendation: Add as a dedicated `org_type` column on the tenant table (not JSONB). It's a structural property that affects business logic (pricing, features), not a configurable setting. Use a PostgreSQL enum for type safety.

## Sources

### Primary (HIGH confidence)
- [Auth.js Installation Guide](https://authjs.dev/getting-started/installation) - Setup, route handler, proxy.ts pattern
- [Auth.js Drizzle Adapter](https://authjs.dev/getting-started/adapters/drizzle) - Schema requirements, configuration
- [Auth.js Drizzle Adapter PostgreSQL Reference](https://authjs.dev/reference/drizzle-adapter/lib/pg) - Table definitions
- [Auth.js Credentials Provider](https://authjs.dev/getting-started/authentication/credentials) - authorize function, Zod validation
- [Auth.js Google Provider](https://authjs.dev/getting-started/providers/google) - OAuth setup, env vars
- [Auth.js Microsoft Entra ID Provider](https://authjs.dev/getting-started/providers/microsoft-entra-id) - Issuer URL, Azure portal setup
- [Auth.js Session Strategies](https://authjs.dev/concepts/session-strategies) - JWT vs database sessions
- [Auth.js Extending Session](https://authjs.dev/guides/extending-the-session) - Custom fields in JWT/session callbacks
- [Auth.js Route Protection](https://authjs.dev/getting-started/session-management/protecting) - proxy.ts, server components, API routes
- [Auth.js Database Models](https://authjs.dev/concepts/database-models) - User, Account, Session, VerificationToken schemas
- [Auth.js Custom Pages](https://authjs.dev/getting-started/session-management/custom-pages) - pages config

### Secondary (MEDIUM confidence)
- [Auth.js joins Better Auth discussion](https://github.com/nextauthjs/next-auth/discussions/13252) - September 2025 maintenance mode announcement
- [Next.js 16 proxy.ts changes](https://medium.com/@amitupadhyay878/next-js-16-update-middleware-js-5a020bdf9ca7) - middleware.ts to proxy.ts migration
- [CVE-2025-29927 middleware bypass](https://workos.com/blog/nextjs-app-router-authentication-guide-2026) - Security vulnerability context
- [bcryptjs vs bcrypt with Bun](https://trenchesdeveloper.medium.com/migrating-from-node-js-to-bun-js-handling-bcrypt-password-hashing-with-a-workaround-9f8c920f6f92) - Bun $2b$ prefix issue
- [Bun password hashing docs](https://bun.com/docs/guides/util/hash-a-password) - Built-in bcrypt in Bun runtime

### Tertiary (LOW confidence)
- Auth.js v5 production readiness claims from community discussions (no official stable release yet)
- Better Auth migration recommendation (organizational, not technical -- Auth.js v5 still works)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Auth.js v5, Drizzle adapter, bcryptjs, Resend are all well-documented with official sources
- Architecture: HIGH - Patterns verified from Auth.js official docs and Next.js 16 documentation; project structure follows existing conventions from Phase 1
- Pitfalls: HIGH - Documented from official GitHub discussions, security advisories (CVE-2025-29927), and verified adapter behavior
- Email flow: MEDIUM - Custom verification/reset flows are well-understood patterns but not built-in to Auth.js (requires custom implementation)
- Auth.js maintenance status: HIGH - Confirmed by official GitHub discussion #13252

**Research date:** 2026-03-03
**Valid until:** 2026-04-03 (30 days -- Auth.js is in maintenance mode, unlikely to change rapidly)
