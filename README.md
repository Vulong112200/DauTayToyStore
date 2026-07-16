# DauTayToy Store

Nền tảng thương mại điện tử cho cửa hàng đồ chơi trẻ em — được thiết kế như một hệ thống dài
hạn (web + API dùng chung cho app di động trong tương lai), không phải một website bán hàng
đơn giản.

**Phase 1** (hiện tại): kiến trúc monorepo, thiết kế database đầy đủ, xác thực (JWT + refresh +
RBAC + Google OAuth), base layout. Xem chi tiết quyết định kiến trúc tại
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
  ui/            — Shared UI component stub (fills out in Phase 2)
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
```

Seeded data includes the four RBAC roles (`SUPER_ADMIN`, `ADMIN`, `STAFF`, `CUSTOMER`) with a
starter permission set, an admin user (`admin@dautaytoystore.vn` / `Admin@123456` — **change
this in any shared environment**), and a sample brand/category/product.

## Running

```bash
pnpm dev            # runs both apps via turbo (api: :4000, web: :3000)
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

> **Note on this environment**: the sandbox this project was scaffolded in has no Docker
> daemon, and port 5432 is already bound by an unrelated, pre-existing local Postgres instance
> with credentials this project doesn't have — so `prisma migrate`/`db:seed`/`test:e2e` could
> not be executed here end-to-end. Unit tests (`pnpm --filter api test`), linting, type
> checking, and both `pnpm build`s were all run and pass. Run the DB-dependent steps in your
> own environment via `pnpm docker:up` (or point `DATABASE_URL`/`REDIS_URL` at your own
> instances) — the CI workflow (`.github/workflows/ci.yml`) does this automatically against
> disposable service containers on every push/PR.

## Docker

```bash
pnpm docker:up      # postgres + redis for local dev
pnpm docker:down
```

`apps/api/Dockerfile` and `apps/web/Dockerfile` build production images for deployment
(API → Render, Web → Vercel, per the target deployment model).

## Roadmap

- **Phase 2** — customer-facing pages (catalog, cart, checkout, order tracking, etc.)
- **Phase 3** — admin panel
- **Phase 4** — advanced marketing features (coupons, flash sales, combos — schema already in place)
- **Phase 5** — AI modules (description/SEO/FAQ generation, chat assistant, recommendations, image tooling)
