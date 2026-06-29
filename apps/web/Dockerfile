# syntax=docker/dockerfile:1

# ───────────── Base ─────────────
FROM node:20-bookworm-slim AS base
RUN corepack enable
WORKDIR /repo

# ───────────── Build ─────────────
FROM base AS build
# La URL pública del API se incrusta en el bundle del navegador en build-time.
ARG NEXT_PUBLIC_API_URL=http://localhost:4000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1
COPY pnpm-workspace.yaml package.json turbo.json .npmrc ./
COPY packages ./packages
COPY apps ./apps
RUN pnpm install --frozen-lockfile=false
RUN pnpm --filter @nehemias/web build

# ───────────── Runner ─────────────
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
WORKDIR /app
# Salida standalone de Next (self-contained) + estáticos + public
COPY --from=build /repo/apps/web/.next/standalone ./
COPY --from=build /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /repo/apps/web/public ./apps/web/public
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
