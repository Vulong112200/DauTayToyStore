# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

DauTayToy Store — an e-commerce platform for a children's toy store, built as a long-term
system (web + API meant to also serve a future mobile app), not a simple storefront. Phase 2
(customer-facing catalog/cart/checkout/wishlist/profile/blog/etc.) and Phase 3 (full admin panel
— see below) are both built. Phase 4 (permission-level RBAC, real outbound email, the shared
promotion/pricing engine wiring FlashSale/ComboDeal/BuyXGetYRule/FreeShippingRule/GiftVoucher into
checkout, and two real payment gateways — VNPay and MoMo, both sandbox-only so far) is also built.
Still planned but not built: Stripe as an additional payment gateway, and AI modules (image
compression/background removal). See `docs/architecture.md` for the full log of architecture
decisions and their rationale, and `docs/ERD.md` for the database diagram.

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
errors that look unrelated to whatever you changed. `apps/api/Dockerfile`'s production build hits
this same requirement twice over: the `build` stage must explicitly `pnpm --filter @repo/contracts
run build` before `nest build` (a plain `COPY packages/contracts` of the TS source isn't enough —
`nest build`'s `tsc` needs `dist/index.js` to already exist to resolve the import), and the final
`runner` stage must separately `COPY` both `packages/contracts/dist` *and*
`packages/contracts/node_modules` (pnpm's per-package `node_modules/zod` symlink, not hoisted to
the repo root) — omitting either one builds fine but fails at container start with `Cannot find
module '@repo/contracts'` or `Cannot find module 'zod'` respectively, since `node_modules/@repo/
contracts` in the running image is a symlink to `/repo/packages/contracts` and that target must
actually exist in the `runner` stage, not just the `build` stage.

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
global `JwtAuthGuard`; `@Public()` opts a route out. RBAC is checked at both the role level
(`RolesGuard`/`@Roles()`) and, additively, the permission level (`PermissionsGuard`/
`@RequirePermissions()`, `common/guards/permissions.guard.ts`) — a route with no
`@RequirePermissions()` is unaffected, gated by `@Roles()` alone exactly as before.
`JwtStrategy.validate` resolves both `roles` and a flattened, deduped `permissions: string[]`
(every role's `RolePermission.permission.key`) fresh from the DB on every request, the same place
`roles` was already resolved. `@RequirePermissions()` is applied only where the seeded
role→permission mapping produces *identical* effective access to the existing `@Roles()` gating
(Products/Orders/Users fully; Marketing's write endpoints only) — see `docs/architecture.md` for
two spots deliberately left unenforced because the seed data disagrees with current `@Roles()`
behavior (Settings, and read access on Marketing), flagged there for a product decision rather
than silently changing who can access what.

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
transaction as order creation, not at payment confirmation — this holds even for VNPay checkouts
(see **Payments** below), where confirmation only arrives after the customer leaves and returns.
`AdminOrdersService.updateStatus` enforces an explicit state machine and releases inventory
correctly: moving to `CANCELLED` decrements only `quantityReserved` (stock never left the
warehouse), moving to `SHIPPED` decrements both `quantityOnHand` and `quantityReserved` (stock
physically left) — the Phase 2 reservation-release gap is closed. Shipping fee is not a
hardcoded constant: `OrdersService.checkout` reads `freeShippingThreshold`/`flatShippingFee` live
from `SettingsModule` (`modules/settings/`, a `@Global()` module storing one `SiteSettings` JSON
blob under `Setting.key = 'site'`), so an admin editing `/admin/settings` changes checkout
behavior with no redeploy. For COD, order confirmation is passed to the frontend directly in the
checkout response and stashed in `sessionStorage` for `/order-confirmation/[orderNumber]` rather
than refetched, to avoid exposing the guest's email via URL query params; a reloaded/fresh
confirmation page (also the normal path after a VNPay redirect, since the browser leaves the SPA
entirely) degrades to pointing at `/order-tracking` (which does need the email, since that's an
intentional cross-session lookup).

**Payments** (`modules/payments/`): `checkoutSchema.paymentMethod` (`'COD' | 'VNPAY' | 'MOMO'`,
default `'COD'`) branches `OrdersService.checkout` — COD is unchanged; VNPay/MoMo additionally
return a `paymentUrl` the frontend redirects the browser to (VNPay builds this URL purely
locally; MoMo instead makes a real outbound API call to MoMo during checkout to obtain it — a
failure there after the Order+Payment(PENDING) row already committed is a documented known gap,
not auto-recovered). Both gateways confirm payment through two channels that can race (the
browser's return redirect and the gateway's own server-to-server IPN — VNPay's IPN is GET query
params acknowledged with `{RspCode,Message}` JSON, MoMo's is POST JSON body acknowledged with a
bare HTTP 204), so `PaymentsService`'s shared private `confirmPaymentCore` (wrapped by
`confirmVnpayPayment`/`confirmMomoPayment`) uses an atomic `updateMany({ where: { status: 'PENDING' } })`
compare-and-swap as the idempotency boundary — never a `findUnique`-then-branch — so whichever
channel arrives first wins and the other safely no-ops; each gateway's own service computes
`isSuccess` using its own response-code convention before calling in, so the shared core never
needs to know either gateway's semantics. Every outcome (success, failure, amount mismatch,
already-processed) is recorded as an `OrderStatusHistory` note, including the case where payment
succeeds after an order was already moved on from (e.g. admin-cancelled while payment was in
flight) — flagged loudly since there's no automatic refund call for either gateway yet, only a
manual merchant-portal process. See `docs/architecture.md`'s "Phase 4+ — VNPay payment gateway"
and "Phase 4+ — MoMo payment gateway" sections for the signature-encoding gotchas (VNPay's
`+`-for-space convention vs MoMo's fixed-field-list HMAC-SHA256, neither URL-encoded) and the
full out-of-scope list (Stripe, admin refund UI, payment retry).

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
`GiftVoucher` (a redeemable store-credit balance, not a price discount) is deducted from what's
left after the coupon, then `resolveFreeShipping()` checks both `Settings.freeShippingThreshold`
and any matching `FreeShippingRule` (amount + optional province match) — shipping is free if
*either* says so, evaluated on the coupon-adjusted total *before* the voucher is subtracted, so a
voucher can never be used to game the free-shipping threshold, and a voucher never covers the
shipping fee itself. `FlashSaleItem.soldCount` is the only side-effecting counter tied to pricing
(incremented inside the checkout transaction, re-checked against `stockLimit` right before the
increment — same pragmatic best-effort concurrency tradeoff as inventory reservation, not
`SERIALIZABLE`); `GiftVoucher.balance` is the other one — decremented in the same transaction
(re-validated against a last-instant race the same way), and refunded by `AdminOrdersService.
updateStatus` if the order is later `CANCELLED`, mirroring how that same transition releases
reserved inventory. Combo/BuyXGetY/FreeShipping have no persisted counter — they're pure price
calculations, nothing to persist beyond the order's `discountTotal` (which folds *both* Coupon and
automatic-promotion discounts into one number — there wasn't room to track them separately without
a schema change; `giftVoucherAmount` gets its own column instead, since it's store credit, not a
discount).

**Media**: `R2Service` (`infra/r2/`) wraps Cloudflare R2 (S3-compatible, via
`@aws-sdk/client-s3`) with a lazily-constructed client — the app boots fine with no R2
credentials configured; only an actual upload/delete call fails, with a clear error naming the
missing env var. Every image field across the admin (product images, category/blog/banner image,
brand logo) is still a plain `z.string().url()` in the contracts, but each now uses
`MediaPicker` (`components/admin/media/media-picker.tsx`) instead of a bare `Input` — it keeps
the same text field (so pasting an external URL still works) and adds a button opening a modal
over `/admin/media`'s existing library (pick an asset or upload a new one inline). Wired via
react-hook-form's `Controller`, not `register`, since the value can change from outside a DOM
`onChange` (picking a library asset). The picker's own preview thumbnail renders with a plain
`<img>`, not `next/image` — its value can be any admin-pasted URL, not just R2 asset URLs, so it
can't rely on `next.config`'s `remotePatterns` whitelist the way `/admin/media`'s own asset grid
(always R2 URLs) safely can.

**Frontend rendering split**: catalog pages (`/categories`, `/categories/[slug]`, `/products`,
`/products/[slug]`) are Server Components fetching directly with ISR
(`fetch(..., { next: { revalidate } })`) for SEO. Cart and auth are client-side (TanStack Query +
Zustand) since they're per-visitor and mutable. Auth pages (`app/(auth)/...`) each split into a
server component that only exports `metadata` plus a co-located `'use client'` form component, to
keep `'use client'` scoped as small as possible while still getting server-rendered metadata.

**Background jobs**: `QueueModule` registers `email`/`media`/`ai` BullMQ queues against Redis;
only `email` has a consumer (`EmailProcessor`). It sends through Resend's HTTP API via
`ResendEmailService` (`infra/email/`) — a lazy-config wrapper in the same spirit as `R2Service`,
except a missing `RESEND_API_KEY`/`EMAIL_FROM` doesn't throw (outbound email is optional in local
dev the way nothing else depends on it booting): `send()` logs a warning and returns `false`
instead of failing the BullMQ job, while a real send failure (bad key, non-2xx from Resend) still
throws so that failure is visible instead of silently swallowed.

**Money**: all prices are `Int` VND (no minor currency unit), so price arithmetic is plain
integer math — no cents/decimal handling anywhere. Frontend formats via
`Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })`.

## TODO before production deploy

- **Set `RESEND_API_KEY`/`EMAIL_FROM` on the Render deploy** — `EmailProcessor` now actually sends
  through Resend (`infra/email/resend-email.service.ts`) instead of only logging, but only once
  those two env vars are set; until then, sends are skipped with a logged warning rather than
  failing the job (see the Background jobs paragraph above).
- ~~Change the seeded admin password~~ — done: the `admin@dautaytoystore.vn` account's password
  on the shared Supabase DB has been rotated off the seeded default. New password was generated
  and handed to the project owner directly, not stored in this repo.
- **Register a VNPay sandbox merchant account and set `VNPAY_TMN_CODE`/`VNPAY_HASH_SECRET`/
  `VNPAY_RETURN_URL` on the Render deploy** (register at sandbox.vnpayment.vn/devreg — see
  `docs/deployment.md`), then separately register the IPN URL
  (`<API public URL>/api/payments/vnpay/ipn`) inside the VNPay merchant dashboard itself. Until
  then, COD checkout is unaffected but choosing VNPay at checkout fails with a clear error.
- **Register a MoMo merchant/test account and set `MOMO_PARTNER_CODE`/`MOMO_ACCESS_KEY`/
  `MOMO_SECRET_KEY`/`MOMO_REDIRECT_URL`/`MOMO_IPN_URL` on the Render deploy** (MoMo does not
  publish shared public test credentials — register at business.momo.vn or email
  merchant.care@momo.vn — see `docs/deployment.md`). Unlike VNPay, no separate merchant-dashboard
  IPN registration step exists (`MOMO_IPN_URL` travels per-request), but double-check it's a
  publicly reachable, TLS-valid host before the first sandbox transaction — MoMo won't reject a
  bad URL at request time, delivery just silently fails later. Until set, COD/VNPay checkout is
  unaffected but choosing MoMo at checkout fails with a clear error.
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
