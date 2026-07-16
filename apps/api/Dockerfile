# syntax=docker/dockerfile:1

FROM node:20-alpine AS base
RUN corepack enable
WORKDIR /repo

FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY packages/config-ts/package.json packages/config-ts/
COPY packages/config-eslint/package.json packages/config-eslint/
COPY packages/contracts/package.json packages/contracts/
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile --filter=api...

FROM deps AS build
COPY packages/config-ts packages/config-ts
COPY packages/config-eslint packages/config-eslint
COPY packages/contracts packages/contracts
COPY apps/api apps/api
RUN pnpm --filter @repo/contracts run build
RUN cd apps/api && npx prisma generate
RUN pnpm --filter api run build

FROM base AS runner
ENV NODE_ENV=production
WORKDIR /repo/apps/api

COPY --from=build /repo/apps/api/dist ./dist
COPY --from=build /repo/apps/api/prisma ./prisma
COPY --from=build /repo/apps/api/package.json ./package.json
COPY --from=build /repo/node_modules /repo/node_modules
COPY --from=build /repo/apps/api/node_modules ./node_modules
COPY --from=build /repo/packages/contracts/dist /repo/packages/contracts/dist
COPY --from=build /repo/packages/contracts/package.json /repo/packages/contracts/package.json
COPY --from=build /repo/packages/contracts/node_modules /repo/packages/contracts/node_modules

EXPOSE 4000
CMD ["node", "dist/main.js"]
