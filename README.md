# DauTayToy Store

Nền tảng thương mại điện tử cho cửa hàng đồ chơi trẻ em — được thiết kế như một hệ thống dài
hạn (web + API dùng chung cho app di động trong tương lai), không phải một website bán hàng
đơn giản.

**Phase 1–3 đã hoàn thành**: kiến trúc monorepo, database đầy đủ, xác thực (JWT + refresh + RBAC +
Google OAuth), toàn bộ trang khách hàng (catalog/cart/checkout/wishlist/profile/blog/...), và
admin panel đầy đủ (sản phẩm/đơn hàng/tồn kho/người dùng/blog/banner/marketing — coupon, flash
sale, combo, mua-X-tặng-Y, miễn phí vận chuyển, phiếu quà tặng/thư viện media/cấu hình cửa hàng/
nhật ký hệ thống/báo cáo). Xem chi tiết quyết định kiến trúc tại
[`docs/architecture.md`](./docs/architecture.md) và sơ đồ ERD tại [`docs/ERD.md`](./docs/ERD.md).

## Tech stack

- **Frontend**: Next.js 15 (App Router), TypeScript, TailwindCSS, shadcn/ui-style components,
  Framer Motion, React Hook Form + Zod, TanStack Query, Zustand.
- **Backend**: NestJS, Prisma ORM, PostgreSQL, Redis, BullMQ, JWT, Swagger.
- **Monorepo**: Turborepo + pnpm workspaces.

## Project structure

```
apps/
  api/     — NestJS backend
  web/     — Next.js 15 frontend
packages/
  contracts/     — Shared Zod schemas + types (source of truth for API request/response shapes)
  config-ts/     — Shared strict tsconfig bases
  config-eslint/ — Shared ESLint flat config
  ui/            — Shared UI component stub
```

## Prerequisites

- Node.js ≥ 20.11
- pnpm 9 (`corepack enable` or `npm install -g pnpm@9.15.0`)
- Docker (for local Postgres + Redis) — or a hosted Postgres such as Supabase, plus Redis

### Using Supabase instead of local Postgres

Set `apps/api/.env` with two connection strings instead of the docker-compose one:

```bash
# Pooled (PgBouncer, transaction mode) — used by the running app at request time.
DATABASE_URL="postgresql://postgres.<project-ref>:<password>@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"

# Direct connection — required for `prisma migrate`/`db push` since PgBouncer's
# transaction-pooling mode doesn't support the prepared statements/DDL sessions Prisma needs.
DIRECT_URL="postgresql://postgres.<project-ref>:<password>@aws-1-ap-south-1.pooler.supabase.com:5432/postgres"
```

Both must be set — `schema.prisma`'s `datasource db` reads `url` from `DATABASE_URL` and
`directUrl` from `DIRECT_URL`. Redis still needs its own instance (Docker, Upstash, etc.) — Supabase doesn't provide one.

## Setup

```bash
pnpm install

# copy env files
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local

# start Postgres + Redis
pnpm docker:up

# generate Prisma client, run migrations, seed data
pnpm --filter api prisma:generate
pnpm db:migrate
pnpm db:seed

# build the shared workspace packages (required once before dev/build — see note below)
pnpm turbo run build --filter=@repo/contracts --filter=@repo/ui
```

Seeded data includes the four RBAC roles (`SUPER_ADMIN`, `ADMIN`, `STAFF`, `CUSTOMER`) with a
starter permission set, an admin user (`admin@dautaytoystore.vn` / `Admin@123456` — **change
this in any shared environment**), and a sample brand/category/product.

> **Why the packages need a build step**: `@repo/contracts` and `@repo/ui` are plain TypeScript
> source consumed by both apps. Next.js/webpack bundles that source directly, but NestJS's dev
> runtime (`nest start`) and its production entrypoint (`node dist/main.js`) execute it via
> Node's own module loader, which — for a multi-file package — requires real, already-compiled
> `.js` files (Node's native TS support does not resolve extensionless relative imports across
> package boundaries the way a bundler does). So these two packages compile to `dist/` via
> `tsc` (see their `build` script) and `package.json#main`/`exports` point at `dist`, not `src`.
> `pnpm turbo run build` (and `pnpm dev`, which now depends on it — see `turbo.json`) handles
> this automatically; only run the command above manually if you invoke `nest start` or `next
> dev` directly instead of through the root `pnpm dev`/`turbo` scripts.

## Running

```bash
pnpm dev            # runs both apps via turbo (api: :4000, web: :3000); builds packages first
pnpm --filter api dev
pnpm --filter web dev
```

- API: http://localhost:4000/api
- Swagger docs: http://localhost:4000/api/docs
- Health check: http://localhost:4000/api/health
- Web: http://localhost:3000

## Quality gates

```bash
pnpm lint
pnpm typecheck
pnpm build
pnpm --filter api test        # unit tests (mocked Prisma, no DB needed)
pnpm --filter api test:e2e    # e2e tests (needs a running Postgres + Redis)
```

> **Note on this environment**: the sandbox this project was developed in has no Docker daemon,
> so day-to-day work here runs against a live Supabase Postgres + Upstash Redis instead of
> `pnpm docker:up` (see the Supabase section above) — every slice through Phase 3 has been
> migrated, seeded, and smoke-tested end-to-end against it (curl-level RBAC/edge-case checks,
> plus the Jest e2e suite). `pnpm docker:up` is the supported path for your own local dev; the CI
> workflow (`.github/workflows/ci.yml`) runs the DB-dependent steps against disposable service
> containers on every push/PR either way.

## Docker

```bash
pnpm docker:up      # postgres + redis for local dev
pnpm docker:down
```

`apps/api/Dockerfile` and `apps/web/Dockerfile` build production images for deployment
(API → Render, Web → Vercel, per the target deployment model).

## Roadmap

- ✅ **Phase 1** — monorepo, database, auth (JWT + refresh + RBAC + Google OAuth)
- ✅ **Phase 2** — customer-facing pages (catalog, cart, checkout, order tracking, wishlist, profile, blog, etc.)
- ✅ **Phase 3** — admin panel: products/categories/brands, orders/inventory, users/roles,
  blog/banners, marketing (coupon, flash sale, combo deal, buy-X-get-Y, and free-shipping rule are
  all wired into a shared promotion engine at cart/checkout — see `docs/architecture.md`; gift
  voucher is admin CRUD only, redemption needs a schema migration), audit logs, reports, media
  library (Cloudflare R2, verified live), site settings
- **Phase 4** — gift voucher redemption at checkout (needs a `Cart`/`Order` → `GiftVoucher`
  migration); a real payment gateway (COD only today); guest→user cart merge on login; a
  media-picker UI wired into the existing raw-URL image fields (product/blog/banner/brand)
- **Phase 5** — AI modules (description/SEO/FAQ generation, chat assistant, recommendations, image tooling)
