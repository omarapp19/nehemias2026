# syntax=docker/dockerfile:1

# ───────────── Base ─────────────
FROM node:20-bookworm-slim AS base
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /repo

# ───────────── Build ─────────────
FROM base AS build
# Herramientas para compilar dependencias nativas (argon2)
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY pnpm-workspace.yaml package.json turbo.json .npmrc ./
COPY packages ./packages
COPY apps ./apps
RUN pnpm install --frozen-lockfile=false
RUN pnpm --filter @nehemias/db generate
RUN pnpm --filter @nehemias/api build
# Despliegue de producción aislado (solo deps de runtime del API)
RUN pnpm --filter @nehemias/api deploy --prod /app

# ───────────── Runner ─────────────
FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app ./
# Regenera el cliente Prisma en la imagen final (garantiza el engine correcto)
RUN pnpm exec prisma generate --schema ./node_modules/@nehemias/db/prisma/schema.prisma
COPY apps/api/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh
EXPOSE 4000
ENTRYPOINT ["./docker-entrypoint.sh"]
