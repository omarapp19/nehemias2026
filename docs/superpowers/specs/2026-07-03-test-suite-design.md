# Test suite: unit, integration, E2E

Trello card: "Pruebas automatizadas (hoy NO hay tests en el repo)".

## Problem

Repo has zero automated tests. CI (`.github/workflows/*.yml`, merged to `main` in PR #10) runs lint/typecheck/build only. Need three layers of tests, wired into that CI workflow.

## 1. Unit tests — `packages/core`

- Add `vitest` as a devDependency of `packages/core`; add `vitest.config.ts`.
- Add `"test": "vitest run"` script to `packages/core/package.json`.
- Files under test: `balance.ts` (`computeBalances`), `num.ts`/`currency.ts` (`nivelStock` and related helpers — confirm actual export names while implementing), `dto.ts` (donor display + DTO shape).
- Coverage targets:
  - `computeBalances`: USD-only, VES-only, mixed, negative amounts, empty transaction list.
  - stock-level helper (`nivelStock`): boundaries (0, low, ok, high thresholds — read actual thresholds from source).
  - donor display formatting: anonymous vs named donor.
  - DTOs: assert serialized output never contains private fields (`passwordHash`, national ID/cédula, raw contact info not meant for public DTOs) — snapshot or explicit key-absence assertions.
- Run: `pnpm --filter @nehemias/core test`.

## 2. Integration tests — `apps/api` (Vitest + Supertest + real Postgres)

- New `docker-compose.test.yml` at repo root: single `postgres:16` service, ephemeral volume, distinct host port (avoid clashing with dev compose), health check.
- `apps/api` gets `vitest` + `supertest` devDependencies, plus `"test": "vitest run"` script.
- Test bootstrap (`apps/api/test/setup.ts`, wired via vitest `globalSetup` or `setupFiles`):
  - Point `DATABASE_URL` at `TEST_DATABASE_URL` (separate env var, defaults to the docker-compose test service).
  - Run `prisma migrate deploy` once before the suite.
  - Between tests: truncate all tables (or wrap each test in a transaction that's rolled back) for isolation — truncate is simpler given Prisma's connection pooling; use `TRUNCATE ... RESTART IDENTITY CASCADE` on all app tables.
- Test coverage:
  - Donation flow: create (pending) → admin verify → balance reflects verified amount only.
  - `/files` access control: authenticated admin can fetch, unauthenticated request is rejected.
  - Rate limiting: exceed configured limit on the public donation endpoint, expect 429.
  - Validation: malformed donation payload (bad currency, non-numeric amount, missing required field) returns 422 with Zod error shape.
- Local run: a `pretest`-style script (or documented manual step) brings up `docker-compose.test.yml`, waits for health, runs migrate deploy; `posttest` tears it down. Exact script mechanics decided during implementation.
- Run: `pnpm --filter @nehemias/api test`.

## 3. E2E tests — Playwright

- New Playwright project — top-level `e2e/` directory (not nested under `apps/web`), since it drives both `apps/web` and `apps/api` together.
- `packages/db/prisma/seed.test.ts`: lightweight seed reusing only the admin-upsert block from `seed.ts` (skip CSV/photo import — slow, irrelevant to E2E). Reads `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` from `.env.test`.
- Playwright config points `baseURL` at a locally-built-and-started `apps/web` + `apps/api`, both talking to the same test Postgres (the same `docker-compose.test.yml` service from layer 2).
- Auth: one setup spec logs into the admin panel through the real UI, saves Playwright `storageState`, reused by all admin-panel specs (no test-only backend shortcuts).
- Coverage:
  - Public donation flow A (donor declares donation) and flow B (whichever second public flow exists — confirm naming during implementation).
  - Public transparency view renders.
  - Admin: verify a donation, register an expense, view inventory levels, manage frentes, register a delivery.
- Run: `pnpm --filter e2e test` (or root `pnpm test:e2e` — exact wiring decided during implementation).

## Root wiring

- `turbo.json`: add a `test` task (no caching — integration/E2E hit a live DB and file system).
- Root `package.json`: add `"test": "turbo run test"` (covers unit + integration; E2E kept as a separate script since it needs built+running apps, not just `turbo run test`).

## CI wiring (extends existing `.github/workflows/ci.yml`)

Existing job order: checkout → corepack → setup-node → install → copy `.env.example` → `db:generate` → lint → typecheck → build.

Extend the same job (not a new parallel job — matches existing single-job style, avoids duplicate installs):

- Add a `postgres:16` service container to the job, with health check, on a distinct port; export `TEST_DATABASE_URL` for that service.
- After `build`, add:
  - `Prisma migrate deploy (test db)` — runs against `TEST_DATABASE_URL`.
  - `Run tests` — `pnpm test` (unit + integration).
  - `Install Playwright browsers` — `npx playwright install --with-deps chromium`.
  - `Build and start apps` — build `apps/web` + `apps/api`, start both in background against the test DB.
  - `Seed test admin` — `tsx packages/db/prisma/seed.test.ts` against `TEST_DATABASE_URL`.
  - `Run E2E tests` — Playwright against the running apps.

## Out of scope

- No conversion of `docker-compose.yml` (dev) — test compose file is separate and only used by CI/local test runs.
- No test-only API endpoints for auth shortcuts (rejected in favor of real UI login + storageState).
- No SQLite/in-memory DB swap for integration tests (rejected — Postgres-specific features in schema, real DB matches prod).
