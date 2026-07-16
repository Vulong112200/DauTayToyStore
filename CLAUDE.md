# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

DauTayToy Store — an e-commerce platform for a children's toy store, built as a long-term
system (web + API meant to also serve a future mobile app), not a simple storefront. Phase 2
(customer-facing catalog/cart/checkout/wishlist/profile/blog/etc.) and Phase 3 (full admin panel
— see below) are both built. Phase 4+ (a shared promotion/pricing engine to wire the remaining
marketing entities into checkout, a real payment gateway, AI modules) are planned but not built.
See `docs/architecture.md` for the full log of architecture decisions and their rationale, and
`docs/ERD.md` for the database diagram.

## Commands

```bash
pnpm install
pnpm docker:up                          # Postgres + Redis for local dev
pnpm --filter api prisma:generate
pnpm db:migrate                         # pnpm --filter api prisma migrate dev
pnpm db:seed                            # pnpm --filter api prisma db seed

pnpm dev                                # runs api (:4000) + web (:3000) via turbo; builds packages first
pnpm --filter api dev
pnpm --filter web dev

pnpm lint
pnpm typecheck
pnpm build
pnpm --filter api test                  # unit tests, mocked Prisma, no DB needed
pnpm --filter api test:e2e              # e2e tests, needs a running Postgres + Redis

# single test file / single test case (jest, run from apps/api)
pnpm --filter api test -- path/to/file.spec.ts
pnpm --filter api test -- -t "test name"
```

**Build order matters**: `@repo/contracts` and `@repo/ui` are plain TS packages that compile to
`dist/` via `tsc` (`package.json#main`/`exports` point at `dist`, not `src`) — required because
NestJS's dev server and `node dist/main.js` load cross-package files through Node's own
resolver, which needs real compiled `.js` files with explicit extensions, unlike Next.js/webpack
which bundles `src` directly. `pnpm dev`/`turbo run build` handle this automatically
(`turbo.json`: `dev`/`build`/`lint`/`typecheck` all `dependsOn: ["^build"]`). Only run `pnpm
turbo run build --filter=@repo/contracts --filter=@repo/ui` manually if invoking `nest start` or
`next dev` directly instead of through the root scripts — otherwise you'll hit module resolution
errors that look unrelated to whatever you changed.

## Architecture

**Monorepo** (Turborepo + pnpm workspaces): `apps/api` (NestJS), `apps/web` (Next.js 15 App
Router), `packages/contracts` (shared Zod schemas — single source of truth for request/response
shapes across web, API, and the future mobile client), `packages/ui`, `packages/config-ts`,
`packages/config-eslint`.

**API domain modules** (`apps/api/src/modules/<domain>`) follow controller (presentation) →
service (use-case logic) → Prisma (infra, confined to `src/infra/prisma`) — nothing outside
`infra/prisma` talks to `@prisma/client` directly. Cross-cutting concerns shared by more than
one feature module live in `common/`, not inside a feature module (e.g.
`common/cart-identity/` — see below).

**Validation**: request bodies are validated with Zod schemas from `packages/contracts`, adapted
into Nest via `ZodValidationPipe`, and the *same* schemas drive `@hookform/resolvers/zod` on the
frontend — one validation definition per shape, not duplicated class-validator DTOs +
Zod. When a handler has more than one param and only one needs validation, bind the pipe to that
`@Body()` param directly (`@Body(new ZodValidationPipe(schema)) body`) — `@UsePipes()` at the
method level runs the pipe against *every* param (custom param decorators like
`@CurrentCartIdentity()` are not exempted from this the way `@Req()`/`@Res()` are).

**Auth**: access + refresh JWT pair. Refresh tokens are JWTs but also persisted as a SHA-256
hash in `RefreshToken` for revocation/rotation (every refresh rotates and marks the old one
`revokedAt`/`replacedBy`). Google login verifies an ID token server-side
(`google-auth-library`), no OAuth redirect flow. Every route is protected by default via a
global `JwtAuthGuard`; `@Public()` opts a route out. RBAC (`Role`/`Permission`, both seeded) is
checked at the role level today (`RolesGuard`); permission-level checks are wired into the
schema but not yet enforced.

**Cart identity**: carts work for both guests and logged-in users. `CartIdentityGuard`
(`common/cart-identity/`, not inside `modules/cart` — it's shared with Orders/checkout) tries a
`Bearer` token first, falling back to an `x-cart-session` header (a UUID the frontend generates
once into `localStorage`, `apps/web/lib/cart-session.ts`). `Cart.userId`/`Cart.sessionId` are
both `@unique`; `CartService` upserts on whichever identity is present. On register/login/Google-
login, `AuthController` reads that same `x-cart-session` header directly (no guard — auth routes
are `@Public()`) and `CartService.mergeGuestCartIntoUserCart` folds the guest cart into the
account's cart (summing quantities for matching product/variant lines, then deleting the guest
cart) — wrapped in a try/catch in `AuthService` so a merge failure can never fail the login
response itself.

**Checkout/orders**: `Order` snapshots the shipping address onto its own columns rather than
only referencing `Address` (which requires a `userId`), since checkout must work for guests.
Inventory reservation (`Inventory.quantityReserved`) happens at checkout time in the same
transaction as order creation, not at payment confirmation — there's no real payment gateway yet
(COD only). `AdminOrdersService.updateStatus` enforces an explicit state machine and releases
inventory correctly: moving to `CANCELLED` decrements only `quantityReserved` (stock never left
the warehouse), moving to `SHIPPED` decrements both `quantityOnHand` and `quantityReserved`
(stock physically left) — the Phase 2 reservation-release gap is closed. Shipping fee is not a
hardcoded constant: `OrdersService.checkout` reads `freeShippingThreshold`/`flatShippingFee` live
from `SettingsModule` (`modules/settings/`, a `@Global()` module storing one `SiteSettings` JSON
blob under `Setting.key = 'site'`), so an admin editing `/admin/settings` changes checkout
behavior with no redeploy. Order confirmation is passed to the frontend directly in the checkout
response and stashed in `sessionStorage` for `/order-confirmation/[orderNumber]` rather than
refetched, to avoid exposing the guest's email via URL query params; a reloaded/fresh
confirmation page degrades to pointing at `/order-tracking` (which does need the email, since
that's an intentional cross-session lookup).

**Admin panel** (`apps/api/src/modules/<domain>` — controllers/services prefixed `Admin*`;
`apps/web/app/admin/*`): every admin controller is class-decorated with `@Roles(...)` (STAFF
usually gets read access, write endpoints narrow to `ADMIN`/`SUPER_ADMIN` via a method-level
`@Roles()` override) and `@AuditLog('EntityType')`. The latter is read by a global
`AuditLogInterceptor` (`common/interceptors/audit-log.interceptor.ts`, registered as
`APP_INTERCEPTOR`) that auto-records every mutating request (POST/PATCH/PUT/DELETE — GET is
always skipped) to the `AuditLog` table: actor from `request.user.id`, `entityId` from the route
param (`:id`/`:productId`) or the response body, `after` as the response itself (no `before`
snapshot — no pre-fetch happens). This is why adding a new admin CRUD module only costs one
decorator line for audit coverage, not a hand-written `record()` call per service. View the log
at `/admin/audit-logs` (`ADMIN`/`SUPER_ADMIN` only — it contains IPs and full payloads, more
sensitive than the read-only aggregates at `/admin/reports`, which STAFF can see).

**Marketing / promotion engine** (`modules/marketing/`, `common/utils/promotion-engine.util.ts`,
`common/promotion-context/`): `Coupon` (code-based) and `FlashSale`/`ComboDeal`/`BuyXGetYRule`/
`FreeShippingRule` (automatic, no code needed) are all wired into cart/checkout pricing.
`PromotionContextService` loads whatever's currently active (`isActive` + date window) so
`CartService` (live preview) and `OrdersService.checkout` (finalization) run the *exact same*
`runPromotionEngine()` against the *exact same* data — a cart total can never disagree with the
order it turns into. Application order is fixed: flash sale overrides a line's unit price first,
then combos greedily claim whole item-sets from a per-product "unclaimed quantity" pool, then
BuyXGetYRule claims from what's left (so a unit already spent on a combo can't also be a BOGO
freebie), then Coupon's discount is computed against the resulting `netSubtotal`, then
`resolveFreeShipping()` checks both `Settings.freeShippingThreshold` and any matching
`FreeShippingRule` (amount + optional province match) — shipping is free if *either* says so.
`FlashSaleItem.soldCount` is the only side-effecting counter (incremented inside the checkout
transaction, re-checked against `stockLimit` right before the increment — same pragmatic
best-effort concurrency tradeoff as inventory reservation, not `SERIALIZABLE`). Combo/BuyXGetY/
FreeShipping have no such counter — they're pure price calculations, nothing to persist beyond
the order's `discountTotal` (which now folds *both* Coupon and automatic-promotion discounts into
one number — there wasn't room to track them separately without a schema change). `GiftVoucher`
is still admin-CRUD-only: it has no `Cart`/`Order` relation in the schema at all (unlike `Coupon`,
which had `couponId` FKs scaffolded since Phase 1), so redemption needs a migration, not just
service code — left for later.

**Media**: `R2Service` (`infra/r2/`) wraps Cloudflare R2 (S3-compatible, via
`@aws-sdk/client-s3`) with a lazily-constructed client — the app boots fine with no R2
credentials configured; only an actual upload/delete call fails, with a clear error naming the
missing env var. No existing image field (product images, blog cover image, banner image, brand
logo) is wired to a "pick from library" UI yet — admins upload via `/admin/media` and manually
paste the returned URL into those still-plain `z.string().url()` text inputs.

**Frontend rendering split**: catalog pages (`/categories`, `/categories/[slug]`, `/products`,
`/products/[slug]`) are Server Components fetching directly with ISR
(`fetch(..., { next: { revalidate } })`) for SEO. Cart and auth are client-side (TanStack Query +
Zustand) since they're per-visitor and mutable. Auth pages (`app/(auth)/...`) each split into a
server component that only exports `metadata` plus a co-located `'use client'` form component, to
keep `'use client'` scoped as small as possible while still getting server-rendered metadata.

**Background jobs**: `QueueModule` registers `email`/`media`/`ai` BullMQ queues against Redis;
only `email` has a consumer (`EmailProcessor`), currently logging instead of calling a real
provider.

**Money**: all prices are `Int` VND (no minor currency unit), so price arithmetic is plain
integer math — no cents/decimal handling anywhere. Frontend formats via
`Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })`.

## TODO before production deploy

- **Leaked Supabase credential in `apps/api/.env.example`**: line with `DIRECT_URL` contains a
  real password (`db.tqpbdaszqlxhtrnqnvgs.supabase.co`), not a placeholder. Rotate that DB
  password on Supabase first, then replace the line with a placeholder like the `DATABASE_URL`
  line above it. Do this before any deploy or public push, not after.
- **`EmailProcessor` only logs, doesn't send real email** — forgot-password will silently not
  deliver on production until a real provider (SES/Resend/etc.) is wired in.
- **Change the seeded admin password** (`admin@dautaytoystore.vn` / `Admin@123456`) before
  seeding any shared/production environment.
- After fixing the above and actually deploying, **update this file's "Project" section and this
  TODO list** to reflect the new state (remove fixed items, note the live deploy URLs/setup if
  relevant) — don't leave stale TODOs here once they're done.

## Supabase (alternative to local Postgres)

If using Supabase instead of `pnpm docker:up`'s Postgres, `apps/api/.env` needs **both**
`DATABASE_URL` (pooled, PgBouncer transaction mode, port 6543, `?pgbouncer=true&connection_limit=1`)
and `DIRECT_URL` (direct connection, port 5432) — `prisma migrate`/`db push` need the direct
connection since PgBouncer's transaction-pooling mode doesn't support the prepared
statements/DDL sessions Prisma requires. Redis still needs its own separate instance regardless
(Supabase doesn't provide one).
