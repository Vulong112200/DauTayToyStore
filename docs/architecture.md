# Architecture Decisions — Phase 1

## Why a monorepo (Turborepo + pnpm)

A Flutter/React Native mobile app is planned for later phases. Putting the web app and the
API in one repo, with a **shared `packages/contracts` package**, means the mobile client can
later depend on the exact same Zod validation schemas and inferred TypeScript types used by
the web frontend and the backend DTOs — one source of truth for the request/response shapes,
no drift between clients. Turborepo gives incremental, cached builds across packages; pnpm
workspaces give strict, disk-efficient dependency resolution and enforce that each app only
sees the dependencies it declares.

## Why NestJS + Prisma (API-first)

NestJS's module system maps directly onto Clean Architecture: each business domain lives under
`src/modules/<domain>` with a controller (presentation), a service (application/use-case logic)
and, when persistence logic gets non-trivial, dedicated repository classes wrapping Prisma
(infrastructure). Prisma is the single ORM adapter — nothing outside `infra/prisma` talks to
`@prisma/client` directly, so swapping persistence later only touches one layer. The database
is designed up front with the full Phase 1–5 domain model (see `docs/ERD.md`) so later phases
are additive migrations, not schema rewrites.

## Auth design

- **Access + refresh JWT pair.** Access tokens are short-lived (15m) and stateless. Refresh
  tokens are also JWTs (so they self-validate signature/expiry) but are additionally persisted
  as a SHA-256 hash in `RefreshToken`, which is what makes **revocation and rotation** possible
  — a bare JWT can't be revoked before it expires, a hash-checked one can. Every refresh
  rotates the token (old one is marked `revokedAt` + `replacedBy`) — this limits the blast
  radius of a leaked refresh token to a single use.
- **Google login uses ID-token verification** (`google-auth-library`), not a server-side
  redirect/session flow. This fits a stateless JWT API talking to a Next.js SPA: the frontend
  runs Google Identity Services, gets an ID token, and POSTs it to `/api/auth/google`, which
  verifies it and issues our own token pair. No cookies/sessions needed on the backend.
- **RBAC is data-driven**, not hardcoded: `Role` ↔ `Permission` (`RolePermission`) and
  `User` ↔ `Role` (`UserRole`) are many-to-many tables, seeded with four roles
  (`SUPER_ADMIN`, `ADMIN`, `STAFF`, `CUSTOMER`) and a starter permission set. `RolesGuard`
  checks roles today; the `Permission` model is already there for finer-grained checks once
  the admin panel (Phase 3) needs them.
- **`@Public()`** opts a route out of the global `JwtAuthGuard` (registered as an `APP_GUARD`,
  so every route is protected by default — the safer failure mode for an e-commerce API).

## Validation strategy: Zod contracts, not duplicated DTOs

Request bodies for auth endpoints are validated with the *same* Zod schemas
(`packages/contracts/src/auth/schemas.ts`) that the Next.js forms use via
`@hookform/resolvers/zod`. A small `ZodValidationPipe` adapts a Zod schema into a Nest
`PipeTransform`. This avoids maintaining two parallel validation definitions (a class-validator
DTO and a Zod schema) that inevitably drift. `class-validator`/`class-transformer` remain
available as project dependencies for modules where a class-based DTO is a better fit (e.g.
admin CRUD with heavy Swagger schema generation in later phases).

## Background jobs (BullMQ) — ready, mostly stubbed

`QueueModule` registers three queues (`email`, `media`, `ai`) against Redis via `@nestjs/bullmq`.
Only `email` has a consumer in Phase 1 (`EmailProcessor`), and it logs instead of calling a real
provider — this keeps password-reset/forgot-password fully wired end-to-end (token issuance,
expiry, one-time use) without requiring SMTP credentials to exist yet. Swapping the processor
body for a real provider (SES, Resend, etc.) later doesn't touch any producer code.

## Audit logging

`AuditLogService` is a global provider writing to the `AuditLog` table (actor, action,
entity type/id, before/after JSON, IP, user agent). It's wired into `register`/`login`/
`login.google` today. Broader coverage (every admin mutation) lands in Phase 3 alongside the
admin panel, where an interceptor-based approach makes more sense than manual calls sprinkled
through services.

## Money handling

All prices are stored as `Int` in **VND**. VND has no minor currency unit in everyday use, so
there is no cents/decimal handling to get wrong — every arithmetic operation on price is plain
integer math. `formatVnd()` on the frontend uses `Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })`.

## Frontend structure

- **App Router**, with route groups: `app/(auth)/{login,register,forgot-password,reset-password}`
  keep auth pages out of the main URL namespace organizationally while staying at `/login` etc.
  in the actual URL (route groups don't add a path segment).
- Each auth page is a **server component that only exports `metadata`**, delegating the actual
  interactive form to a co-located client component (`login-form.tsx`, etc.). This keeps
  per-page SEO metadata server-rendered while isolating `'use client'` to the smallest
  possible surface.
- **Zustand** (`store/auth-store.ts`) persists `{ user, tokens }` to `localStorage` — enough
  for Phase 1's stateless-JWT approach. Cart/wishlist state will follow the same pattern in
  Phase 2.
- **TanStack Query** is wired at the root (`QueryProvider`) for Phase 2+ data fetching; Phase 1
  itself only needs plain `fetch` (via `lib/api-client.ts`) for the auth calls, since they're
  one-shot mutations rather than cached queries.
- Design tokens (pastel palette, radii, fonts) live as CSS variables in `app/globals.css` and
  are mapped into Tailwind's theme in `tailwind.config.ts` — this is the same variable-based
  approach shadcn/ui generates, so adding real shadcn/ui components in Phase 2 is a drop-in,
  not a rework.

## What's intentionally deferred

- **Email/SMS providers, payment gateways** — interfaces/queues exist; concrete providers are
  a later-phase decision (depends on which VN payment gateway — VNPay/MoMo — gets chosen).
  Modeled in Prisma (`Payment`, `PaymentMethod`) already.
- **Cloudflare R2 media upload** — config keys and `MediaAsset` model exist; the actual
  upload/pipeline (`AI Image Compression`/`Background Removal` too) is a Phase 5 module.
- **Fine-grained permission checks** in `RolesGuard` — the `Permission`/`RolePermission` tables
  exist and are seeded, but only role-level checks are enforced today; Phase 3's admin panel
  will add a `PermissionsGuard` once there are enough distinct admin actions to warrant it.
