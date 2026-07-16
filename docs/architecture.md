# Architecture Decisions

## Phase 2 — Checkout + Order

### Shipping address is snapshotted onto `Order`, not just referenced via `Address`

`Address.userId` is required (a registered user's saved address book), but checkout must work
for guests too. Rather than making `Address` nullable-owner or building a parallel guest-address
concept, `Order` got its own `shippingLine1/2/ward/district/province/postalCode` columns,
populated directly from the checkout form regardless of whether the buyer is logged in.
`addressId` stays as an optional reference for the (not yet built) "checkout from a saved
address" convenience feature — but the snapshot fields are the source of truth for what was
actually shipped, which is also just correct order-history semantics (an order shouldn't change
retroactively if the customer later edits their saved address).

### `CartIdentityGuard` had to move out of `CartModule` into `common/`

Wiring `OrdersController`'s checkout endpoint to reuse `CartModule`'s existing
`CartIdentityGuard` (`@UseGuards(CartIdentityGuard)`, with `OrdersModule` importing
`CartModule`) crashed both modules at boot with `Nest can't resolve dependencies of the
CartIdentityGuard (?, ConfigService)`. Root cause, confirmed by reproducing it two different
ways: Nest resolves a guard passed by class reference to `@UseGuards()` by constructing a fresh
instance scoped to the **consuming controller's own module**, not by reusing whatever instance
already exists in a module that merely exports the guard's *class*. That means every one of the
guard's constructor dependencies must be independently resolvable in the consuming module's own
import graph — exporting the guard class alone isn't enough if its dependencies (here,
`JwtService`) aren't *also* visible through that chain. Two changes were needed together: (1)
move `CartIdentityGuard`/`CartIdentity`/`CurrentCartIdentity` out of the `cart` feature module
into `common/cart-identity/` as a proper cross-cutting concern (it's shared by Cart and Orders,
arguably more), with its own `CartIdentityModule`, and (2) have `CartIdentityModule` re-export
`JwtModule` itself, not just the guard — so any module importing `CartIdentityModule` gets
`JwtService` visible too, satisfying the guard's constructor wherever it's used. Lesson for any
future guard/pipe/interceptor shared across feature modules: **export the module that provides
its dependencies, not just the enhancer class.**

### Inventory reservation happens at checkout, not at payment confirmation

Since Phase 2 only supports COD (no real payment gateway yet), "payment confirmed" isn't a
meaningful event to gate stock reservation on. `OrdersService.checkout` increments
`Inventory.quantityReserved` for every line item inside the same transaction that creates the
order and clears the cart — so a placed order immediately reduces what `resolveAvailableStock`
reports elsewhere (cart, product listing) even before anyone confirms/ships it. Known gap: there
is no cancel/expire flow yet to release that reservation, so a cancelled order currently leaves
stock reserved. That's an explicit call to make in Phase 3 (admin order management) alongside
building the status-transition endpoints.

### Order confirmation avoids both a refetch and leaking email via URL

After a successful checkout, the frontend doesn't re-fetch the order — the API's create response
already **is** the full `OrderView`, so it's stashed in `sessionStorage` and the browser is routed
to `/order-confirmation/[orderNumber]`, which reads it back on mount. This sidesteps two less
appealing alternatives: refetching via the same guest-tracking endpoint (`GET /orders/track`)
would require passing the customer's email through the URL (`?email=...`), which is unnecessary
exposure for a same-session confirmation; and there's no session/cookie concept on this stateless
JWT API to authorize a plain `GET /orders/:orderNumber` for a guest. If the confirmation page is
reloaded or opened fresh (`sessionStorage` empty/mismatched), it degrades gracefully to a prompt
pointing at `/order-tracking` — which *does* require the email, appropriately, since that's an
intentional cross-session lookup.

## Phase 2 — Catalog + Cart core

### Why `@repo/contracts`/`@repo/ui` compile to `dist/` (build step required)

Discovered while first running `nest start` for real (Phase 1 had only ever run this package
through `tsc --noEmit`, `ts-jest`, and Next.js/webpack — none of which exercise Node's own
module loader the way `nest start`/`node dist/main.js` do). Both `@repo/contracts` and
`@repo/ui` originally pointed `package.json#main` straight at `src/index.ts` with extensionless
relative exports (`export * from './common/pagination'`). That works when the *consumer's own
tool* transpiles/bundles the file (Next.js/webpack, ts-jest) — but NestJS's dev server and its
compiled `node dist/main.js` entrypoint load cross-package files through Node's own resolver,
and Node's native TypeScript support only follows the ESM resolution algorithm for `.ts` files,
which requires explicit file extensions on relative specifiers. The fix: give both packages a
real `build` script (`tsc -p tsconfig.build.json` → CommonJS `dist/*.js` + `.d.ts`, with the
source's relative imports written as `./common/pagination.js` so the emitted JS's `require()`
calls resolve to real sibling files), and point `package.json#main`/`exports` at `dist`. Root
`turbo.json`'s `dev` task now `dependsOn: ["^build"]` so `pnpm dev` always builds these first;
direct `nest start`/`next dev` invocations need `pnpm turbo run build --filter=@repo/contracts
--filter=@repo/ui` run once beforehand (see README).

### Cart identity: guest session header vs JWT, no forced login

Carts must work for anonymous shoppers (typical for a toy-store storefront) as well as logged-in
users. `CartIdentityGuard` (`apps/api/src/modules/cart/guards/cart-identity.guard.ts`) tries to
verify a `Bearer` access token first; if that's absent/invalid it falls back to requiring an
`x-cart-session` header — a random UUID the frontend generates once and persists in
`localStorage` (`apps/web/lib/cart-session.ts`). `Cart.userId`/`Cart.sessionId` are both
`@unique`, so `CartService` resolves the cart via `prisma.cart.upsert` on whichever identity is
present. Known gap (not built yet): merging a guest cart into a user's cart on login.

### Pipe-per-parameter, not per-method, when a handler mixes `@Body()` with other params

Real bug caught while manually exercising the cart endpoints end-to-end (not caught by unit
tests, since those call `CartService` directly, bypassing Nest's pipe pipeline — this is why the
verification step included live `curl` smoke tests, not just `jest`): `@UsePipes(pipe)` at the
**method** level applies that pipe to *every* parameter of the handler, not just the one
decorated with `@Body()`. `CartController.addItem(@CurrentCartIdentity() identity, @Body() body)`
had `@UsePipes(new ZodValidationPipe(addCartItemSchema))` at the method level, so the schema was
also run against `identity` (`{ sessionId: '...' }`), which has no `productId` — failing with
`"productId: Required"` before `body` was ever validated. `@Req()`/`@Res()`/`@Next()` are
exempted from method-level pipes by Nest internally (which is why `AuthController`'s
`(@Body() body, @Req() req)` handlers never hit this), but a custom decorator like
`@CurrentCartIdentity()` is not. Fix: bind the pipe directly to the `@Body()` parameter —
`@Body(new ZodValidationPipe(schema)) body: X` — instead of `@UsePipes()` on the method, whenever
a handler has more than one param and only one of them needs validation.

### Product listing/detail are Server Components with ISR, not client-fetched

`/categories`, `/categories/[slug]`, `/products`, `/products/[slug]` fetch directly in the page
(async Server Component) rather than through TanStack Query, using `revalidateSeconds` (mapped
to Next's `fetch(..., { next: { revalidate } })`) instead of the `cache: 'no-store'` the auth
API client uses. This gets real SSR/ISR HTML for SEO (a stated requirement) for free — verified
during Phase 2 by confirming the built `/categories` page's static HTML already contains the
Supabase-seeded category name. Cart and auth stay client-side (TanStack Query + Zustand) since
they're inherently per-visitor, mutable, and not something search engines need to see.

---

# Phase 1

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
