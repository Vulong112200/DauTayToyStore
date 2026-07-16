# Architecture Decisions

## Phase 4 — Real outbound email via Resend

### Lazy-config, same spirit as `R2Service` — but a missing config doesn't throw

`ResendEmailService` (`infra/email/resend-email.service.ts`) is a thin wrapper over Resend's HTTP
API — one `fetch` call, no SDK dependency. Like `R2Service`, it reads its config
(`RESEND_API_KEY`/`EMAIL_FROM`) lazily rather than failing app boot when they're unset. Unlike
`R2Service`, a missing config doesn't throw: R2 is a hard dependency the moment an admin tries to
upload media, but nothing in this app *requires* outbound email to boot or to exercise the rest of
the system in local dev, so `send()` logs a warning and returns `false` instead of throwing —
which, inside `EmailProcessor.process()`, means the BullMQ job completes normally rather than
being marked failed. A real send failure once actually configured (bad key, non-2xx from Resend's
API) still throws, so *that* failure stays visible instead of being swallowed the same way.

### Verified by inspecting the BullMQ job's state directly in Redis, not just by reading logs

Triggering `POST /auth/forgot-password` against the local dev server (Resend not configured)
returned `{"success":true}` immediately, but the Nest logger's warning line for the skipped send
didn't reliably show up in the captured process output — a stdout-buffering quirk of how this
session's background-task output gets captured, not a bug in the app. Rather than trust an absent
log line, the job's actual state was inspected directly on the Upstash instance (`bull:email:2`'s
hash: `returnvalue: null`, `finishedOn` set) — confirming the job ran to completion without
throwing, which is what "warn and return `false`" should produce. This is the more reliable way to
verify a background job outcome in this environment: read the job state Redis actually stored, not
just whatever reached stdout.

## Phase 4 — Production Dockerfile: workspace packages need building *and* copying into the runner stage, not just the build stage

### Two separate failures from the same root cause, found only by deploying to Render

`apps/api/Dockerfile`'s `build` stage `COPY`s `packages/contracts` (TS source) and `apps/api`, then
ran `nest build` directly — this compiled fine locally (via `pnpm dev`/`turbo run build`, which
always builds `@repo/contracts` first per the "Build order matters" rule above) but failed in
Docker with 83 `TS2307: Cannot find module '@repo/contracts'` errors, because the Dockerfile never
ran `@repo/contracts`'s own `tsc` build — `dist/index.js` (what `package.json#main` points at)
never existed. Fixed by adding `RUN pnpm --filter @repo/contracts run build` before `nest build`.

That got the `build` stage green, but the `runner` stage then failed *at container start* (not
build time) with `Cannot find module '@repo/contracts'` — the `runner` stage only copied
`apps/api/dist` and `node_modules`, never `packages/contracts` itself. In pnpm's workspace layout,
`apps/api/node_modules/@repo/contracts` is a symlink to `/repo/packages/contracts`, not a real
directory — copying `apps/api/node_modules` copies the symlink, but its target has to exist too.
Fixed by also `COPY`ing `packages/contracts/dist` and `packages/contracts/package.json` into the
`runner` stage at the same absolute path.

That still weren't enough: `@repo/contracts/dist/common/pagination.js` bare-`require("zod")`s, and
`zod` (a dependency of `@repo/contracts`, not of `apps/api` or the repo root) lives in pnpm's
per-package `node_modules/zod` symlink (`packages/contracts/node_modules/zod` →
`/repo/node_modules/.pnpm/zod@.../node_modules/zod`), not hoisted to `/repo/node_modules/zod`
directly. The final fix also copies `packages/contracts/node_modules` into the `runner` stage.
Verified by grepping the compiled `dist/` output for every bare `require(...)` call rather than
guessing — confirmed `@repo/contracts` is the only workspace package `apps/api/dist` requires at
runtime, and `zod` is the only bare dependency `@repo/contracts/dist` requires, so no further
`COPY` lines were needed beyond these three.

## Phase 4 — Gift voucher redemption wired into cart/checkout

### Closes the gap flagged in "Phase 3 — Remaining marketing entities" below

That section explicitly deferred `GiftVoucher` because it "has zero relation from `Cart`/`Order`
to `GiftVoucher`... wiring redemption in would mean a schema migration, not just service code."
This slice is exactly that migration: `Cart.voucherId` + `Order.giftVoucherId`/
`Order.giftVoucherAmount`, plus back-relations (`carts`/`orders`) on `GiftVoucher` itself.

### Voucher is store credit, not a price discount — deliberately kept out of `discountTotal`

Every other promotion (flash sale, combo, BOGO, coupon) reduces the price of what's being bought.
A gift voucher instead pays down what's owed, same as a partial payment — conceptually closer to
`Payment` than to `Coupon`. Folding it into `discountTotal` would have made an order's discount
number mean "how much cheaper this order was," which a voucher redemption doesn't answer; keeping
`giftVoucherAmount` as its own column preserves that distinction and required no change to how
`discountTotal` itself is computed (still `promotionDiscountTotal + couponDiscount`, unchanged).

### Applied after the coupon, and after the free-shipping threshold check — not before

`OrdersService.checkout` computes `netSubtotalAfterCoupon` first, resolves free shipping against
*that* number, and only then subtracts the voucher. Two consequences, both deliberate: a voucher
can never be spent to push an order below the free-shipping threshold (the threshold check runs
before the voucher is even considered), and a voucher never covers the shipping fee itself (it's
subtracted from the merchandise subtotal, with `shippingFee` added back afterward). `CartService`'s
live-preview math in `loadCartView` mirrors this exact order so the cart total never disagrees with
what checkout produces, same guarantee the promotion engine already provides for the other
discount types.

### Balance is re-validated and decremented inside the checkout transaction, mirroring flash-sale stock

`CartService.redeemVoucher`/`loadCartView` check the voucher's balance/active/expiry at
apply-and-preview time, but `OrdersService.checkout` re-fetches the voucher row *inside* the
`$transaction` and re-checks before decrementing — same pragmatic best-effort race-condition
guard already used for `FlashSaleItem.soldCount` (not `SERIALIZABLE` isolation, acceptable at this
system's scale). `redeemedAt` is stamped only when the balance reaches exactly 0, not on first use,
since a voucher can be partially spent across (theoretically) more than one checkout attempt if a
prior one failed after preview but before this transaction committed.

### Cancelling an order refunds the voucher balance — new symmetry with the existing inventory-release logic

`AdminOrdersService.updateStatus`'s `CANCELLED` branch already released reserved-but-unshipped
inventory (a Phase 2 gap closed in Phase 3). This slice adds the same idea for vouchers: cancelling
increments `GiftVoucher.balance` back by `Order.giftVoucherAmount` and clears `redeemedAt` to
`null`, so a cancelled order can never leave a customer's voucher permanently drained for goods
they never received. Verified live: redeemed a voucher (balance 50,000 → 0, `redeemedAt` stamped),
checked out, then cancelled the resulting order — balance correctly returned to 50,000 and
`redeemedAt` cleared back to `null`.

## Phase 4 — Media picker wired into every raw-URL image field

### Additive, not a replacement — the text input stays

`MediaPicker` (`components/admin/media/media-picker.tsx`) renders the existing text `Input`
*plus* a button that opens a modal over the same data `/admin/media` already lists (via the
existing `useAdminMedia`/`useUploadMedia` hooks — no new hooks or API routes needed). Every image
field it's wired into (`product-form.tsx`'s `images[].url`, `category-form.tsx`'s `imageUrl`,
`brand-form.tsx`'s `logoUrl`, `blog-post-form.tsx`'s `coverImageUrl`, `banner-form.tsx`'s
`imageUrl`) is still a plain `z.string().url()` in the contract — picking from the library just
fills the same text field a pasted external URL would. This was a deliberate choice over adding a
separate "asset id" field: no schema/contract change, and pasting a third-party image URL (e.g.
while content is still being migrated into the library) keeps working exactly as before.

### `category-form.tsx` had `imageUrl` in `defaultValues` but no field in the JSX at all

Investigated before writing any code and confirmed: the category form already threaded
`imageUrl` through `defaultValues` (so editing a category with an image wouldn't blow it away on
save) but never rendered an input for it — a pre-existing gap, not something this slice
introduced. Added the field for the first time here, using `MediaPicker` from day one rather than
shipping a plain text input just to replace it again later.

### Every field switched from `register` to `Controller` — `MediaPicker` is a controlled component

All five forms previously used bare `register('fieldName')` for their image fields (uncontrolled
inputs — react-hook-form reads the DOM node's value on submit). `MediaPicker` needs to be told
its value from outside (when a library asset is picked, the state update happens external to any
`<input onChange>`), so every wiring uses `<Controller name="..." render={({ field }) => <MediaPicker value={field.value} onChange={field.onChange} />} />` instead. `product-form.tsx` already
had `control` (for its `useFieldArray` calls); the other four forms didn't destructure `control`
from `useForm()` before this and needed it added.

### The library grid can safely use `next/image`; the picker's own preview thumbnail can't

`/admin/media`'s asset grid always shows R2-hosted URLs (the API only ever returns what it just
uploaded there), which match `next.config`'s `remotePatterns` (`**.r2.dev` /
`**.dautaytoystore.vn`) — safe for `next/image`. But `MediaPicker`'s small preview thumbnail next
to the text input reflects whatever URL is *currently in the form field*, which can be a
third-party URL an admin pasted by hand (still fully supported, per above) and might not be on
that whitelist — `next/image` throws a hard runtime error for an unconfigured hostname. That
preview uses a plain `<img>` instead, specifically because its input isn't constrained to a known
set of domains the way the library grid's is.

### UI verification was blocked by curl vs. real-browser hydration, not by anything this change broke

`pnpm build`/`lint`/`typecheck`/`test` all pass, and `next build` succeeds. Attempting to verify
the actual dialog interaction by starting the dev server and `curl`-ing admin pages hit a 500 —
but the same 500 reproduces on `/admin/orders` and `/admin/inventory`, pages untouched by this
slice, confirming it's the pre-existing `AdminGuard`/`useAuthHydrated` behavior (a client
component reading browser-only Zustand persist APIs) triggering on curl's server-render pass, not
a regression. This slice's actual click-through (opening the picker, selecting an asset,
confirming the URL lands in the field) could not be verified in a real browser in this
environment — flagged explicitly rather than claimed as tested.

## Phase 4 — Guest→user cart merge on login

### The merge point is the auth flow, not the cart flow — auth controllers read the guest header directly, no guard involved

`CartIdentityGuard` (the thing that normally resolves `x-cart-session`/Bearer into a
`CartIdentity`) is deliberately **not** attached to any `/auth/*` route: those routes are
`@Public()` and mixing in a guard that also independently tries to verify a Bearer token would
be confusing noise for a login endpoint that, by definition, doesn't have a valid access token
yet. Instead `AuthController` reads `req.headers[CART_SESSION_HEADER]` directly (importing the
same `CART_SESSION_HEADER` constant from `cart-identity.guard.ts` rather than re-declaring the
header name) and passes it as a plain optional `sessionId` argument into
`AuthService.register`/`login`/`loginWithGoogle`. `CartService` is imported into `AuthModule`
(safe, one-directional — `CartModule` has no dependency back on `AuthModule`) purely to call the
one new public method, `mergeGuestCartIntoUserCart`.

### A merge failure can never break a login/register — same philosophy as AuditLogService

`AuthService.mergeGuestCartIfNeeded` wraps the actual merge call in a try/catch and only logs on
failure, exactly like `AuditLogService.record` already does for its own side effect. A cart merge
going wrong (some unexpected DB hiccup) is not a reason to fail the auth response the user is
actually waiting on — worst case, their guest cart just doesn't merge this one time, which is
recoverable (the guest cart still exists under its old session id if the merge silently no-op'd
partway... though in practice the merge is one Prisma transaction, so it's all-or-nothing; the
try/catch is for the rare case the merge call itself throws before or after the transaction, e.g.
a connection blip). Verified with a dedicated test (`does not fail the login when the cart merge
itself throws`) that a rejected merge still returns valid tokens.

### Quantities are summed, not overwritten or dropped; the guest cart is deleted, not just re-pointed

`Cart.userId` and `Cart.sessionId` are both `@unique`, so a guest cart can't simply have its
`sessionId` swapped for the user's `userId` if that user already has their own cart (two rows
would violate the same conceptual identity). `mergeGuestCartIntoUserCart` instead: finds/creates
the user's cart, and for each guest `CartItem` either increments an existing matching
`(productId, variantId)` line in the user cart or creates a new one, then deletes the guest cart
(cascading away its now-redundant original `CartItem` rows). No stock/flash-sale re-validation
happens during the merge itself — same tradeoff as the rest of cart mutation, checkout remains the
final backstop that would reject an over-quantity line. The guest cart's coupon carries over only
if the user's cart doesn't already have one applied (an existing applied coupon on the account
wins over whatever the guest session had). Verified live: adding 2 units as a guest, then
registering with that session header, produced a fresh account cart with those 2 units; a second
guest session adding 3 more of the *same* product, then logging into that same account, correctly
summed to 5 (not 3, not two separate lines) — and the old guest cart's session subsequently
resolves to a brand-new empty cart, confirming the merged-from cart was actually deleted, not
left dangling.

## Phase 4 — Promotion engine: wiring FlashSale, ComboDeal, BuyXGetYRule, FreeShippingRule into checkout

### A pure, DB-free engine function, fed by a shared context loader

`common/utils/promotion-engine.util.ts` exports `runPromotionEngine()` and `resolveFreeShipping()`
as plain functions operating on plain data — no `PrismaService`, no NestJS DI, nothing async.
Given cart lines + "what's currently active" (flash sale items, combos, BOGO rules), it returns
adjusted line prices, the combo/BOGO discount total, and a human-readable list of what applied.
This is what let it get 19 unit tests with zero mocking — every case (flash price override, stock
exhaustion, combo greedy matching including the "not actually cheaper" and "flash-adjusted price
changes whether combo is worth it" edge cases, BOGO with same/different buy-and-get product,
combo-before-BOGO ordering, free-shipping province matching) is a plain function call with plain
assertions. `PromotionContextService` (`common/promotion-context/`, `@Global()` like
`AuditLogModule`/`SettingsModule`) is the only thing that touches Prisma — it loads "active right
now" flash sale items / combos / BOGO rules / free-shipping rules, filtered by `isActive` and an
open-ended date window (`startsAt`/`endsAt` null on either side means unbounded). Both
`CartService` and `OrdersService.checkout` call the same `PromotionContextService` +
`runPromotionEngine()` pair, so a cart's live total and the order it becomes can never disagree
on which promotions applied — there's exactly one code path that decides.

### Fixed application order: flash sale → combo → BuyXGetY → coupon → free shipping

Combos are matched before BuyXGetYRule specifically so a unit already "spent" satisfying a combo
can't *also* be claimed as a free/discounted BOGO unit — verified live: with a combo covering
products A+B and a BOGO rule "buy A get B", giving the cart exactly one A and one B, only the
combo applies (it runs first and claims both units from the shared per-product pool); the BOGO
rule sees nothing left and correctly does not fire (also covered by a dedicated unit test:
`applies combos before buy-X-get-Y so units are not double-claimed`). Flash sale price overrides
happen before combo pricing is even evaluated, which matters: a combo is only applied if its
comparison — combo price vs. the sum of (flash-adjusted) unit prices — actually saves money;
verified live that an active flash sale on one combo item made the combo *not* worth taking
(list price using the flash price was cheaper than the combo price), and the engine correctly
skipped it. Coupon's discount is computed against `netSubtotal` (post flash/combo/BOGO, matching
the "apply automatic promotions first, then a customer-entered code" convention most storefronts
use), and free shipping is evaluated last, against the subtotal after *every* discount including
the coupon — `resolveFreeShipping()` returns true if *either* the site-wide
`Settings.freeShippingThreshold` is met *or* any active `FreeShippingRule` matches on both amount
and (if the rule restricts it) the order's shipping province.

### `FlashSaleItem.soldCount` is the only promotion with a persisted side effect

Combo/BuyXGetY/FreeShippingRule are pure price calculations — nothing to write back beyond the
resulting `Order.discountTotal` (which now folds *both* the coupon discount and the automatic
promotion discount into one number, since there wasn't schema room to track them as two separate
columns without a migration). Flash sale is different: its `stockLimit` is a real, shared,
depletable allocation, so `soldCount` has to be incremented transactionally at checkout, guarded
against having sold out between cart-preview and checkout — re-checked once before the checkout
transaction (a friendly, no-transaction-needed early rejection) and once more inside the
transaction against a freshly-read row (the real guard). This mirrors the exact same
best-effort-not-`SERIALIZABLE` concurrency tradeoff the existing inventory reservation already
makes, not a new or weaker guarantee. Verified live: adding more to cart than a flash sale's
remaining `stockLimit` allows is rejected at `POST /cart/items` (before checkout is even
reached, since `CartService` also caps `availableStock` by flash remaining stock); a flash-priced
order line correctly showed the sale price and incremented `soldCount`.

### `CartItemView.availableStock` is capped by flash stock too, not just warehouse inventory

Previously `availableStock` was purely inventory-derived (`quantityOnHand - quantityReserved`).
Now, for a product-level line with an active flash sale, it's `min(inventoryStock,
flashRemainingStock)` — so the quantity stepper in the cart UI (and the hard `addItem`/
`updateItemQuantity` validation) can never let a customer select more than the flash sale
actually has left, even if the warehouse has plenty of the product at full price. Verified live:
with 50 units in the warehouse but only 1 flash-sale slot remaining, the cart correctly reported
`availableStock: 1` and rejected an add-to-cart request for 2.

## Phase 3 — Remaining marketing entities (GiftVoucher, ComboDeal, BuyXGetYRule, FreeShippingRule)

### Scope: admin CRUD only, same as FlashSale/Banner — no storefront/checkout wiring

This closes out the marketing module started in the Coupon + Flash Sale slice. Like FlashSale,
none of these four are wired into the cart/checkout price calculation — building that (applying
a combo price instead of summed line items, granting a free item on a qualifying purchase,
picking a free-shipping rule by province, redeeming a gift voucher against a total) is a real
promotion-engine problem shared across all of them, not something to bolt on piecemeal per
entity. That's consistent with `orders.service.ts`'s own comment history (the Phase 2 shipping
constants were explicitly flagged as a stopgap "pending Phase 4"), and with GiftVoucher
specifically: the schema has zero relation from `Cart`/`Order` to `GiftVoucher` (unlike
`Coupon`, which already had `Cart.couponId`/`Order.couponId` scaffolded in Phase 1) — wiring
redemption in would mean a schema migration, not just service code, which is out of scope for a
"finish the remaining CRUD" slice.

### `BuyXGetYRule.buyProductId`/`getProductId` get an application-level existence check

The schema declares these as plain `String` scalars with no `@relation` to `Product` — a
deliberate-or-not gap already flagged during investigation. Since the DB won't catch a rule
pointing at a nonexistent product, `AdminBuyXGetYRulesService` checks both ids exist via a single
`findMany({ where: { id: { in: [...] } } })` before create/update and throws `BadRequestException`
if either is missing. Verified live: creating a rule with a fake `getProductId` correctly 400s
before any row is written.

### GiftVoucher's balance is admin-editable independently of its original amount

`amount` (the original face value) is set once at creation and never changes; `balance` (what's
left) is the only field `AdminGiftVouchersService.update` allows touching, via a separate
`UpdateGiftVoucherInput` schema from the create input — modeling "issue a voucher" and "adjust/
correct its remaining balance" as different operations rather than one generic PATCH that could
accidentally let an admin rewrite the original amount after the fact.

### ComboDeal reads current product name/price at request time, not a snapshot

Like FlashSale's items, `ComboItem` only stores `productId`/`quantity` — `AdminComboDealsService`
joins live `Product.name`/`Product.price` on every read. If a product's price changes after being
added to a combo, the admin UI always reflects today's price, not what it was when the combo was
created; there's no order-time snapshot here because nothing consumes a combo at checkout yet
(see the scope note above).

## Phase 3 — Media Library + Settings

### R2Service constructs its S3 client lazily, so booting without R2 credentials never fails

`R2_ACCOUNT_ID`/`R2_ACCESS_KEY_ID`/`R2_SECRET_ACCESS_KEY` were already scaffolded in
`AppConfiguration.r2` (Phase 1) but never actually used until this slice, and in this dev
environment they're still unset. Constructing an `S3Client` at app startup (e.g. in a
constructor or `onModuleInit`) would either throw or silently hold invalid credentials; instead
`R2Service.getClient()` builds the client on first actual use (`upload`/`remove`) and throws a
clear `InternalServerErrorException` naming the missing env vars if credentials aren't present.
This means the whole app boots fine with R2 unconfigured — only the upload endpoint itself fails,
with an actionable message instead of an opaque AWS SDK error. Verified live: `POST
/admin/media` with no R2 credentials configured returns exactly that message; every other route
(including `GET /admin/media`, which never touches R2) works normally.

### No image dimension probing — `width`/`height` stay null

`MediaAsset.width`/`height` exist in the schema but nothing here populates them; that would need
an image-decoding library (e.g. `image-size`) that isn't installed, and the admin UI doesn't
currently need it for anything (no responsive `srcset` generation, no aspect-ratio-aware crop
tool). Left null and documented rather than adding a dependency for an unused field.

### Every existing image field is still a raw URL text input — no MediaPicker wiring in this slice

Product images, blog cover images, banner images, brand logos, category images are all plain
`z.string().url()` text fields today (verified across every existing admin form). This slice
ships the library itself (upload, browse, copy URL, delete) but does not retrofit a "pick from
library" affordance into those existing forms — an admin uploads a file here, copies its URL,
and pastes it into the existing text field, same manual step as pasting any other external image
URL today. Wiring a `<MediaPicker>` into every existing form is real UI work left for a later
pass; scoping it out kept this slice to "the library exists and works," not "every image field
across the whole admin now opens it."

### Settings is a single JSON blob under one `Setting` row, not one row per field

`Setting.key` is already the table's primary key (flat key→JSON store), so the natural per-field
approach would be one row per setting (`key: 'siteName'`, `key: 'freeShippingThreshold'`, ...).
Instead `AdminSettingsService` stores the entire `SiteSettings` object under a single `key:
'site'` row, merges it over `DEFAULT_SETTINGS` on every read, and does a read-merge-write on
every partial update. This trades "one query per setting" flexibility (not needed — nothing
reads a single setting in isolation) for "one row to reason about, one migration-free way to add
a new field" (a new `SiteSettings` field just needs a default in `DEFAULT_SETTINGS`, no schema
change). `SettingsModule` is `@Global()`, matching `AuditLogModule`'s precedent, so any module
can inject `AdminSettingsService` without an explicit import.

### Settings actually replaces the hardcoded shipping constants in checkout, not just a form

`OrdersService.checkout` previously had `FREE_SHIPPING_THRESHOLD = 500_000` and `FLAT_SHIPPING_FEE
= 30_000` as module-level constants (flagged in Phase 2's architecture notes as a stopgap).
`OrdersService` now injects `AdminSettingsService` and reads `freeShippingThreshold`/
`flatShippingFee` from it on every checkout — same default values, but now a live, admin-editable
setting instead of a hardcoded constant. Verified live: raising `freeShippingThreshold` past a
test cart's subtotal correctly switched it from free shipping to the configured
`flatShippingFee`, and a changed `flatShippingFee` value showed up in the very next checkout's
`shippingFee`/`total` with no restart.

## Phase 3 — Audit Logs + Reports

### A generic, decorator-driven interceptor replaces per-service `record()` calls

Phase 1 built `AuditLogService.record()` and `AuditLog` (before/after JSON, actor, ip, ua) but
the only caller was `AuthService` (register/login/Google login), each with a hand-written call.
Hand-writing `record()` into every admin service (products, categories, brands, users, orders,
inventory, blog, banners, coupons, flash sales — 11 controllers) would mean 11+ near-identical
edits and an easy place to forget one on the next new admin module. Instead, `AuditLogInterceptor`
(registered globally via `APP_INTERCEPTOR`, alongside the existing `LoggingInterceptor`) reads an
`@AuditLog('EntityType')` class decorator via `Reflector` and — only for mutating verbs
(POST/PATCH/PUT/DELETE; GET is always skipped even on a decorated controller) — derives
`action` (`${entityType}.create/update/delete`), `entityId` (route `:id`/`:productId` param, else
`.id`/`.productId` off the response body), and `actorId` (`request.user.id`) automatically. Each
of the 11 controllers only needed one import + one class-level decorator line, not a service
rewrite — this is what let "applied broadly" (the original Phase 1 architecture note) actually
happen in one slice instead of being deferred again. `AuthService`'s existing manual calls are
untouched — they predate the decorator and use action names (`user.login`, `user.register`) that
don't fit the entity-based convention anyway.

### No "before" snapshot for interceptor-driven logs — a known, accepted gap

The interceptor has no pre-fetch step, so `before` is always `undefined` for automatically-logged
mutations (`after` is the response body; `DELETE` responses are just `{success:true}`, so `after`
is also skipped there and only `entityId` is recorded). This matches what `AuthService`'s manual
calls already do — none of them populate `before`/`after` either. Getting real diffs would mean
fetching the entity pre-mutation in the interceptor (a second DB round-trip per mutating request,
generically, for every decorated controller) or threading old-state through every service; both
were judged not worth it for this slice given no consumer of `before` exists yet. The `AuditLog`
row/contract still carries the field for whenever that's worth doing per-module.

### Audit log viewing is ADMIN/SUPER_ADMIN only; Reports stay open to STAFF

`AdminAuditLogController` uses `@Roles(ADMIN, SUPER_ADMIN)` with no `STAFF` — audit rows include
IP addresses and full request/response snapshots for every admin action, which is more sensitive
than the read-only aggregate numbers in Reports (`@Roles(ADMIN, SUPER_ADMIN, STAFF)`, matching
Dashboard's existing convention). Verified live: a STAFF actor gets 403 on `/admin/audit-logs`
but 200 on `/admin/reports/order-status-breakdown`.

### Reports bucket revenue in application code, not `$queryRaw`

Grouping orders by day/month for a revenue-over-time report isn't expressible as a plain Prisma
`groupBy` (no date-truncation support), and the standard workaround is a raw SQL
`date_trunc(...)` query. Given this admin panel's order volumes, `AdminReportsService.revenueOverTime`
instead fetches `{createdAt, total}` for orders in the requested window (excluding
CANCELLED/REFUNDED, same exclusion Dashboard's revenue sum already uses) and buckets them in JS
by `.toISOString().slice(0, 10 or 7)`. This avoids introducing the codebase's first raw-SQL call
for what's currently a small, bounded read — `topProducts` and `orderStatusBreakdown`, by
contrast, group by a single discrete column each and use real Prisma `groupBy` fine.

## Phase 3 — Coupon + Flash Sale management

### Scope: Coupon is fully wired end-to-end; Flash Sale is admin CRUD only

Marketing has six models in the schema (Coupon, GiftVoucher, FlashSale, ComboDeal, BuyXGetYRule,
FreeShippingRule) and none had any code at all before this slice — not even a `@repo/contracts`
entry. Given the size, this slice deliberately covers only Coupon and FlashSale, and only Coupon
is wired into Cart/Checkout for a real discount; FlashSale gets admin CRUD (create a sale window,
attach `FlashSaleItem`s with a per-item `salePrice`) but nothing yet reads it to actually override
a product's price on the storefront or in the cart — same holding pattern as Banner in the
previous slice. GiftVoucher (no relation to Cart/Order at all in the schema), ComboDeal,
BuyXGetYRule (whose `buyProductId`/`getProductId` are plain scalars with no FK, so referential
integrity isn't even guaranteed at the DB level), and FreeShippingRule are left for a future slice.

### Coupon validation split into two functions so per-user limits don't block guests

`common/utils/coupon.util.ts` has `assertCouponGloballyUsable` (active flag, start/expiry window,
`minOrderAmount`, `usageLimit` — all checkable from the coupon row and the cart's subtotal alone)
and a separate `assertCouponUserUsable` (the `perUserLimit` check, which needs a count of the
user's past orders against that coupon). Only the global check runs for guest carts — a guest
has no stable identity to count past redemptions against, so `perUserLimit` is silently not
enforced for guests. This is a known, documented gap rather than a bug: the alternative (blocking
guest coupon use entirely, or keying the limit off the cart session id, which resets whenever
`localStorage` is cleared) was judged worse than under-enforcing a marketing constraint.

### Discount is recomputed on every cart read, not cached on the Cart row

`Cart.couponId` is the only persisted state — `CartService.loadCartView` re-fetches the coupon
and recomputes `discountTotal` from the *current* subtotal every time the cart is read. If the
cart's contents drop below the coupon's `minOrderAmount`, or the coupon's active window lapses,
between apply and checkout, the discount silently drops to 0 on the next read rather than
throwing — there's no separate "coupon became invalid, please remove it" state. Checkout
re-validates for real with `assertCouponGloballyUsable`/`assertCouponUserUsable` and throws if
the coupon is no longer usable at that point, so a stale silent-0-discount at cart-read time can
never leak into an order with an unexpectedly-applied discount that shouldn't have counted.
Verified live: applying a coupon, then letting it expire (tested by creating one pre-expired),
correctly 400s at apply-time; a coupon valid at apply-time but invalidated before checkout would
400 there instead.

### Checkout increments `usageCount` and clears `Cart.couponId` inside the order transaction

Both happen in the same `$transaction` as order creation and inventory reservation — if the
transaction rolls back, the coupon's usage count is not incremented and the cart's coupon stays
attached, so a failed checkout can't silently consume a limited-use coupon. Verified live: a full
checkout with `SALE50K` (FIXED_AMOUNT, 50,000₫) applied to an 890,000₫ cart produced an order
with `discountTotal: 50000`, `total: 840000`; the coupon's `usageCount` incremented from 0 to 1;
and the cart came back empty with `couponCode: null` on the next read.

## Phase 3 — Blog + Banner management

### Blog categories can be hard-deleted; blog posts can too — neither has a Restrict FK

Unlike `Product` (kept as archive-only because `OrderItem.product` is `onDelete: Restrict`),
`BlogCategory.posts` is `onDelete: SetNull` and nothing references `BlogPost` at all. Both
`AdminBlogCategoriesService.remove` and `AdminBlogPostsService.remove` do a real
`prisma.*.delete`, matching the categories/brands precedent rather than the products one.
Deleting a category in use doesn't cascade-delete its posts — it just nulls their `categoryId`,
verified live by deleting a test category that had 2 posts and confirming both posts survived
with `categoryName: null` on the next list fetch.

### `publishedAt` is stamped once, on the transition into `PUBLISHED`, never recomputed

Same rule as `Product.publishedAt`: `create`/`update` only set `publishedAt: new Date()` when
`status === 'PUBLISHED'` AND no `publishedAt` already exists; editing an already-published post
(title, content, etc.) leaves its original `publishedAt` untouched so the public blog's
"newest first" ordering doesn't reshuffle every time an admin fixes a typo. Verified live:
publishing a draft stamps `publishedAt`; a second edit while already `PUBLISHED` returns the same
timestamp.

### Two admin blog controllers, not one, mirroring how categories/brands are separate from products

`AdminBlogCategoriesController` (`/admin/blog-categories`) and `AdminBlogPostsController`
(`/admin/blog-posts`) are independent — a post's `categoryId` is optional and posts can exist
uncategorized, so category management doesn't need to be nested under posts. Both share the
existing public `BlogController`'s module (`blog.module.ts`) since they operate on the same two
Prisma models; a genuinely new domain (`Banner`, no prior code at all) got its own module
(`content/banner/`) instead.

### Banner has no public read endpoint yet

This slice only builds the admin CRUD (`/admin/banners`), matching the user-selected scope
("Blog + Banner management" as an admin-panel slice, not a storefront feature). No homepage or
category-page component currently renders banners — wiring `Banner` into the public site is
left for whenever that UI work is scheduled, so shipping a public `GET /banners` endpoint now
would be unused surface area. `startsAt`/`endsAt` are stored but not yet enforced by any
"currently active" filter for the same reason — there's no consumer yet to filter for.

## Phase 3 — User Management + Roles

### Role-escalation and self-lockout guards live in the service, not the guard layer

`RolesGuard` only answers "does this actor hold one of the roles required for this route" — it
has no concept of *which* roles an actor may grant to *someone else*, or of an actor acting on
their own account. Both are business rules specific to `AdminUsersService`, so they're enforced
there: `assertCanAssignRoles` throws `ForbiddenException` if the target role set contains
`ADMIN`/`SUPER_ADMIN` and the actor isn't `SUPER_ADMIN` (a mere `ADMIN` can create/manage `STAFF`
and `CUSTOMER` accounts but can't mint peers or superiors); `update`/`updateRoles` both throw
`BadRequestException` when `actorId === id` and the change would deactivate the account or alter
its own roles (no account can lock itself out or self-promote). Verified live: a `STAFF` actor is
rejected before even reaching the service (class-level `@Roles(ADMIN, SUPER_ADMIN)` on the
controller excludes `STAFF` from `/admin/users` entirely); an `ADMIN` actor promoted from the
seeded flow is correctly blocked from granting `SUPER_ADMIN` to a third user; the seeded
`SUPER_ADMIN` is correctly blocked from deactivating or re-rolling itself, while still being able
to act on every other account.

### No delete endpoint for users, by design

Unlike categories/brands (hard delete is safe per the schema's FK behavior), users are never hard
deleted — `isActive: false` is the only "remove" affordance, so history (orders, audit logs,
reviews) tied to a `User.id` never dangles. The admin Users page reflects this directly: there is
no trash-can icon, only an inline edit form exposing the "Đang hoạt động" checkbox.

### Edit form issues two mutations, not one, because the API models them separately

`PATCH /admin/users/:id` (basic info + `isActive`) and `PATCH /admin/users/:id/roles` are
deliberately separate endpoints — role changes are the sensitive path with the escalation guard,
while `fullName`/`phone`/`isActive` is not. The web edit form collects both in one visual form
but on submit diffs the selected roles against the row's original roles and only calls
`updateRoles` when they actually changed, so a plain profile edit never touches the
role-escalation guard path (and never fails a `SUPER_ADMIN` editing their own `fullName` just
because the self-role-change guard would otherwise trip on a no-op roles payload).

## Phase 3 — Order + Inventory management

### The inventory reservation gap flagged in Phase 2 is now closed

Phase 2's architecture notes flagged that checkout reserves stock (`quantityReserved`) but
nothing ever released it on cancellation. `AdminOrdersService.updateStatus` now enforces an
explicit state machine (`PENDING → CONFIRMED → PROCESSING → SHIPPED → DELIVERED → REFUNDED`,
with `CANCELLED` reachable from any pre-shipped state) and ties inventory side effects to the
two transitions that actually change physical stock reality: moving to `CANCELLED` decrements
only `quantityReserved` (goods never left the warehouse, on-hand is untouched); moving to
`SHIPPED` decrements both `quantityOnHand` and `quantityReserved` together (goods physically
left). Verified end-to-end against Supabase: checkout → confirm → process → ship correctly
moved on-hand stock down by the order quantity while reserved returned to its pre-order value;
a separate checkout → cancel correctly released the reservation with on-hand untouched;
invalid transitions (`PENDING → SHIPPED` directly, anything from a terminal `CANCELLED`) both
return a real 400 from the live API, not just a theoretical guard clause.

### Extracted `order-view.util.ts` before adding admin order detail

Same rationale as `product-list.util.ts` in Phase 2: `AdminOrdersService.findById` needed to
return the exact `OrderView` shape `OrdersService` already built for checkout/tracking/"my
orders". The `ORDER_INCLUDE`/`toOrderView` pair moved out of `OrdersService` into a shared
`order-view.util.ts` that both services import — one mapping to keep in sync, not two.

### Inventory admin scope is product-level only, and low-stock filtering trades DB pagination for correctness

`InventoryService` deliberately only lists `Inventory` rows where `productId` is set (skipping
variant-level rows) — no seeded or admin-editable product uses variants yet, so a variant view
would be dead UI. Separately, `lowStockOnly` can't be expressed as a Prisma `where` clause
(comparing two computed columns — `quantityOnHand - quantityReserved <= lowStockThreshold` —
isn't a supported filter), so that path fetches all matching rows, filters in memory, and
paginates the *filtered* array instead of trusting the DB's `count()`. The alternative — filter
in memory but keep the DB-computed `totalItems` — would silently mismatch `totalPages` against
what's actually being paged through; verified live that toggling the threshold on/off correctly
changes `totalItems` in the response, not just the visible rows.

## Phase 3 — Admin foundation + Product management

### Route group refactor: `(public)` vs `/admin`

Every customer-facing route previously rendered inside the root `app/layout.tsx`, which
hard-coded `<SiteHeader/>`/`<SiteFooter/>` around `{children}` — meaning an admin section
nested anywhere under it would inherit the public storefront chrome. Fixed by moving every
existing route (all of `about`, `blog`, `cart`, `categories`, `checkout`, `contact`, `faq`,
`order-confirmation`, `order-tracking`, `page.tsx`, `privacy-policy`, `products`, `profile`,
`terms`, `wishlist`, and the `(auth)` group) into a new `app/(public)/` route group, with
`SiteHeader`/`SiteFooter` moved into `app/(public)/layout.tsx`. Route groups are purely
organizational — none of these URLs changed. The root layout now only owns `<html>/<body>`,
fonts, and the Theme/Query providers; `/admin` sits as a sibling of `(public)` with its own
sidebar-based chrome (`app/admin/layout.tsx`) and its own `AdminGuard` client component
(redirects to `/login` if logged out, shows a 403-style message if logged in but not
ADMIN/SUPER_ADMIN/STAFF).

### Admin pages must opt out of static prerendering

`next build` failed on `/admin/brands` with `Cannot read properties of undefined (reading
'hasHydrated')` — Next attempts to statically prerender any page (including `'use client'`
ones) that doesn't otherwise force dynamic rendering, which runs the component tree once in a
server/Node context. `AdminGuard`'s `useAuthHydrated()` hook calls
`useAuthStore.persist.hasHydrated()`, and the persisted store's browser-only machinery isn't
available in that prerender pass. Since every `/admin/*` page is inherently per-session
(behind a client-side, localStorage-backed auth check) there is no valid static version of it
to prerender anyway — fixed with `export const dynamic = 'force-dynamic'` in `app/admin/layout.tsx`,
which propagates to all nested admin routes.

### Role checks: class-level default + method-level override

Every new admin controller (`AdminProductsController`, `AdminCategoriesController`,
`AdminBrandsController`) sets a permissive class-level `@Roles(ADMIN, SUPER_ADMIN, STAFF)` (so
STAFF can read/update), then overrides specific mutating endpoints — `create`/`remove` — with a
tighter method-level `@Roles(ADMIN, SUPER_ADMIN)`. This relies on `RolesGuard`'s
`reflector.getAllAndOverride` resolving handler-level metadata before class-level, which was
already established in Phase 1/2 — this phase is the first to actually exercise the "override"
half of that behavior (previously every controller only set roles in one place). Verified
against live Supabase: a CUSTOMER-role token gets a real 403 from `/admin/products`, not just a
theoretical guard.

### Product `DELETE` archives, it doesn't delete

`OrderItem.product` is `onDelete: Restrict`, so a product referenced by any historical order can
never be hard-deleted regardless of what the admin UI calls the action. `AdminProductsService.remove`
sets `status: 'ARCHIVED'` instead — same REST verb/endpoint shape the frontend expects, honest
behavior underneath. Category and Brand deletes stay real hard deletes: both of their product
relations are `onDelete: Cascade`/`SetNull` respectively, so removing either cannot violate a
foreign key.

### Product edit replaces nested collections wholesale, not via diffing

`AdminProductsService.update` deletes and recreates `images`/`specifications`/`faqs`/`categories`
inside one transaction on every save, rather than computing which rows changed. For an admin
form where the whole nested-array state is already round-tripped from the client on every
submit (via `useFieldArray`), diffing would add real complexity for no behavioral difference —
the end state is identical either way, and the row count here is small (a handful of images/specs
per product, not thousands).

## Phase 2 — Wishlist + Profile

### Extracted `product-list.util.ts` before adding Wishlist

`WishlistService` needed to return the exact same `ProductListItem` shape `ProductsService`
already builds (image, brand, stock, rating) for wishlist entries. Rather than duplicate the
Prisma `select` shape and the row→DTO mapping a second time, both now import
`PRODUCT_LIST_SELECT`/`toProductListItem` from `modules/catalog/products/product-list.util.ts`.
Concrete payoff: fixing an inStock/rating mapping bug now only has one place to fix.

### Address book's "single default address" invariant lives in the service, not the DB

`Address.isDefault` has no partial-unique-index enforcing "at most one default per user" at the
Postgres level — enforcing it there would need a partial unique index
(`WHERE is_default = true`), which Prisma's schema DSL doesn't express directly (would require a
raw migration). Simpler and sufficient for now: `AddressesService.create`/`update` unset every
other address's `isDefault` in the same request whenever the incoming one sets `isDefault: true`
— verified against Supabase that creating a second default address correctly flips the first
back to `false`.

### Profile page added the app's first real logout

Every earlier phase built session *creation* (register/login/Google) but nothing called
`POST /auth/logout` from the UI — tokens only ever got cleared by a hard localStorage wipe during
manual testing. `ProfileView`'s logout button is the first place that both revokes the refresh
token server-side and clears the Zustand session, so it's the natural place this landed rather
than bolting a logout button onto the header speculatively before there was a page that needed
one.

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
