# Mapa interactivo de puntos de ayuda + panel admin — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an interactive Leaflet map to the public Home showing the earthquake impact-zone trace plus clickable help-point markers (person/organization) with contact popups, and an admin panel to create points by clicking the map, edit the impact-zone trace, and list/delete points.

**Architecture:** New `HelpPoint` Prisma model exposed through existing public/admin route split (public = `isActive` only, admin = all). The impact-zone trace reuses the existing `SystemSetting` key/value table (key `impact_zone_coords`, JSON array of `[lat, lng]`), already exposed via `GET /public/settings`. Frontend uses Leaflet + `react-leaflet`, loaded client-only via `next/dynamic({ ssr: false })` since Leaflet touches `window` at import time.

**Tech Stack:** Next.js 15 (App Router) + Express + Prisma/Postgres (existing monorepo). New deps: `leaflet`, `react-leaflet` (apps/web only). No API key required — OpenStreetMap tiles.

**Full design spec:** [docs/superpowers/specs/2026-07-11-mapa-puntos-ayuda-design.md](../specs/2026-07-11-mapa-puntos-ayuda-design.md)

## Global Constraints

- Public DTOs never leak `isActive`/`createdAt` for `HelpPoint` — mirrors the existing `PublicX` vs raw-row split in `packages/core/src/dto.ts`.
- All admin routes stay under `adminRouter.use(requireAdmin)` (already applied globally in `apps/api/src/routes/admin.ts:51`) — no per-route auth needed.
- Zod validation lives in `packages/core/src/validation.ts`; API routes never touch Prisma without parsing through a schema first.
- Frontend map components must be `"use client"` and loaded via `next/dynamic(..., { ssr: false })` — Leaflet cannot run during SSR.
- No new automated frontend tests — this repo has no frontend test runner configured (confirmed: `apps/web/package.json` has no `test` script). Frontend tasks are verified manually in the browser instead; this is a deliberate, pre-agreed scope boundary, not a gap.
- Spanish, human-readable error/label copy throughout (matches existing validation messages and UI copy).

---

### Task 1: Prisma schema — `HelpPoint` model + migration

**Files:**
- Modify: `packages/db/prisma/schema.prisma:231-244`
- Create: `packages/db/prisma/migrations/20260711120000_add_help_point/migration.sql`

**Interfaces:**
- Produces: Prisma model `HelpPoint` (fields: `id`, `name`, `type: HelpPointType`, `description`, `contactPhone?`, `contactEmail?`, `lat: Decimal(9,6)`, `lng: Decimal(9,6)`, `isActive`, `createdAt`) and enum `HelpPointType` (`person` | `organization`), available to `apps/api` via `@nehemias/db`'s generated Prisma client (`prisma.helpPoint`).

- [ ] **Step 1: Add the model to `schema.prisma`**

Insert this new section between the end of the `GalleryPhoto` model and the `CONFIGURACIÓN GENERAL` comment (`packages/db/prisma/schema.prisma:237-239`):

```prisma
// ---------- PUNTOS DE AYUDA (mapa público) ----------
enum HelpPointType {
  person
  organization
}

model HelpPoint {
  id           String        @id @default(uuid())
  name         String
  type         HelpPointType
  description  String
  contactPhone String?
  contactEmail String?
  lat          Decimal       @db.Decimal(9, 6)
  lng          Decimal       @db.Decimal(9, 6)
  isActive     Boolean       @default(true)
  createdAt    DateTime      @default(now())

  @@index([isActive])
}

```

So the file reads (unchanged lines omitted):
```prisma
// ---------- GALERÍA DE FOTOS (público) ----------
model GalleryPhoto {
  id        String   @id @default(uuid())
  url       String
  title     String?
  createdAt DateTime @default(now())
}

// ---------- PUNTOS DE AYUDA (mapa público) ----------
enum HelpPointType {
  person
  organization
}

model HelpPoint {
  id           String        @id @default(uuid())
  name         String
  type         HelpPointType
  description  String
  contactPhone String?
  contactEmail String?
  lat          Decimal       @db.Decimal(9, 6)
  lng          Decimal       @db.Decimal(9, 6)
  isActive     Boolean       @default(true)
  createdAt    DateTime      @default(now())

  @@index([isActive])
}

// ---------- CONFIGURACIÓN GENERAL ----------
model SystemSetting {
  key   String @id
  value String
}
```

- [ ] **Step 2: Hand-write the migration SQL**

Create `packages/db/prisma/migrations/20260711120000_add_help_point/migration.sql`:

```sql
-- CreateEnum
CREATE TYPE "HelpPointType" AS ENUM ('person', 'organization');

-- CreateTable
CREATE TABLE "HelpPoint" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "HelpPointType" NOT NULL,
    "description" TEXT NOT NULL,
    "contactPhone" TEXT,
    "contactEmail" TEXT,
    "lat" DECIMAL(9,6) NOT NULL,
    "lng" DECIMAL(9,6) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HelpPoint_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HelpPoint_isActive_idx" ON "HelpPoint"("isActive");
```

This matches the exact style Prisma itself generates (compare `packages/db/prisma/migrations/20260629000000_init/migration.sql`), so it's safe to hand-write without a live dev database.

- [ ] **Step 3: Regenerate the Prisma client (validates the schema, no DB needed)**

Run: `pnpm db:generate`
Expected: ends with `✔ Generated Prisma Client` — no errors. This step does NOT require `DATABASE_URL`/a running Postgres; it only reads `schema.prisma`.

- [ ] **Step 4: Apply the migration (requires a running local Postgres)**

Run: `pnpm db:migrate`
Expected: `Applying migration '20260711120000_add_help_point'` then `The following migration(s) have been applied: ... add_help_point` and `Already in sync, no schema change or pending migration was found.` on a second run.
Prerequisite: a local Postgres reachable at your `.env`'s `DATABASE_URL` (e.g. `docker compose up -d db`, or a local Postgres install). If you don't have one available yet, note it and continue — Task 3's integration test will fail until this step has run against a real database.

- [ ] **Step 5: Commit**

```bash
git add packages/db/prisma/schema.prisma packages/db/prisma/migrations/20260711120000_add_help_point/migration.sql
git commit -m "feat(db): add HelpPoint model for the help-points map"
```

---

### Task 2: `packages/core` — DTO + validation for `HelpPoint`

**Files:**
- Modify: `packages/core/src/dto.ts` (append after the `PaymentInfo` section, end of file, currently line 267)
- Modify: `packages/core/src/validation.ts` (append after `paymentInfoSchema`, end of file, currently line 206)
- Modify: `packages/core/src/dto.test.ts` (append; add `HelpPointRow, toPublicHelpPoint` to the existing import on line 2)

**Interfaces:**
- Consumes: `num` from `./num.js` (already imported at the top of `dto.ts`), `zBool` (already defined in `validation.ts`).
- Produces: `HelpPointRow`, `PublicHelpPoint`, `toPublicHelpPoint(row: HelpPointRow): PublicHelpPoint` from `dto.ts`; `helpPointTypeEnum`, `helpPointSchema`, `HelpPointInput`, `helpPointUpdateSchema`, `HelpPointUpdateInput` from `validation.ts`. Both re-exported automatically via `packages/core/src/index.ts`'s existing `export * from "./dto.js"` / `export * from "./validation.js"` — no change needed there.

- [ ] **Step 1: Write the failing test**

Change the import on line 2 of `packages/core/src/dto.test.ts` from:
```ts
import { donorDisplay, toPublicDonation, toAdminDonation, type DonationRow } from "./dto.js";
```
to:
```ts
import {
  donorDisplay,
  toPublicDonation,
  toAdminDonation,
  toPublicHelpPoint,
  type DonationRow,
  type HelpPointRow,
} from "./dto.js";
```

Append this block at the end of the file:
```ts

describe("toPublicHelpPoint", () => {
  const baseHelpPoint: HelpPointRow = {
    id: "h1",
    name: "Cruz Roja La Guaira",
    type: "organization",
    description: "Entrega de agua potable y kits de higiene.",
    contactPhone: "+58 412 555 0000",
    contactEmail: "ayuda@cruzroja.org",
    lat: "10.601700",
    lng: "-66.930800",
    isActive: true,
    createdAt: new Date("2026-07-11T00:00:00.000Z"),
  };

  it("converts Decimal-like lat/lng to numbers", () => {
    const pub = toPublicHelpPoint(baseHelpPoint);
    expect(pub.lat).toBe(10.6017);
    expect(pub.lng).toBe(-66.9308);
  });

  it("keeps public contact fields but drops isActive/createdAt", () => {
    const pub = toPublicHelpPoint(baseHelpPoint);
    expect(pub.contactPhone).toBe("+58 412 555 0000");
    expect(pub.contactEmail).toBe("ayuda@cruzroja.org");
    expect(pub).not.toHaveProperty("isActive");
    expect(pub).not.toHaveProperty("createdAt");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @nehemias/core test`
Expected: FAIL — `toPublicHelpPoint is not exported` / `HelpPointRow` type not found (compile error from `dto.ts` not yet having these).

- [ ] **Step 3: Implement the DTO**

Append to the end of `packages/core/src/dto.ts`:
```ts

// ---------- PUNTOS DE AYUDA (público) ----------
export interface HelpPointRow {
  id: string;
  name: string;
  type: "person" | "organization";
  description: string;
  contactPhone: string | null;
  contactEmail: string | null;
  lat: DecimalLike;
  lng: DecimalLike;
  isActive: boolean;
  createdAt: Date | string;
}

export interface PublicHelpPoint {
  id: string;
  name: string;
  type: "person" | "organization";
  description: string;
  contactPhone: string | null;
  contactEmail: string | null;
  lat: number;
  lng: number;
}

export function toPublicHelpPoint(h: HelpPointRow): PublicHelpPoint {
  return {
    id: h.id,
    name: h.name,
    type: h.type,
    description: h.description,
    contactPhone: h.contactPhone,
    contactEmail: h.contactEmail,
    lat: num(h.lat),
    lng: num(h.lng),
  };
}
```

- [ ] **Step 4: Implement the validation schemas**

Append to the end of `packages/core/src/validation.ts`:
```ts

// — Punto de ayuda (mapa) —
export const helpPointTypeEnum = z.enum(["person", "organization"], {
  errorMap: () => ({ message: "Elige un tipo válido (persona u organización)." }),
});

export const helpPointSchema = z.object({
  name: z.string().min(2, "Escribe el nombre."),
  type: helpPointTypeEnum,
  description: z.string().min(2, "Describe la ayuda que ofrece."),
  contactPhone: z.string().max(60).optional(),
  contactEmail: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.string().email("Escribe un correo válido.").optional(),
  ),
  lat: z.coerce.number().min(-90, "Latitud inválida.").max(90, "Latitud inválida."),
  lng: z.coerce.number().min(-180, "Longitud inválida.").max(180, "Longitud inválida."),
  isActive: zBool(true),
});
export type HelpPointInput = z.infer<typeof helpPointSchema>;

export const helpPointUpdateSchema = helpPointSchema.partial();
export type HelpPointUpdateInput = z.infer<typeof helpPointUpdateSchema>;
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter @nehemias/core test`
Expected: PASS — all `dto.test.ts` tests green, including the two new ones.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/dto.ts packages/core/src/validation.ts packages/core/src/dto.test.ts
git commit -m "feat(core): add HelpPoint DTO and validation schemas"
```

---

### Task 3: `apps/api` — service + public/admin routes for `HelpPoint` CRUD

**Files:**
- Create: `apps/api/src/services/helpPoints.ts`
- Modify: `apps/api/src/routes/public.ts` (imports + new route)
- Modify: `apps/api/src/routes/admin.ts` (imports + new routes)
- Modify: `apps/api/test/helpers.ts:4-18` (add `"HelpPoint"` to `TABLES`)
- Create: `apps/api/test/help-points.test.ts`

**Interfaces:**
- Consumes: `toPublicHelpPoint`, `HelpPointInput`, `HelpPointUpdateInput`, `helpPointSchema`, `helpPointUpdateSchema` from `@nehemias/core` (Task 2); `prisma` from `@nehemias/db`; `asyncHandler`, `ApiError` from `../http.js`; `requireAdmin` (already applied globally in `admin.ts`).
- Produces: `listActiveHelpPoints()`, `listAllHelpPoints()`, `createHelpPoint(input)`, `updateHelpPoint(id, input)`, `deleteHelpPoint(id)` from `services/helpPoints.ts` (consumed by Task 4's `/public/home` change). Routes: `GET /public/puntos-ayuda`, `GET /admin/puntos-ayuda`, `POST /admin/puntos-ayuda`, `PUT /admin/puntos-ayuda/:id`, `DELETE /admin/puntos-ayuda/:id`.

- [ ] **Step 1: Write the failing integration test**

Create `apps/api/test/help-points.test.ts`:
```ts
import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import argon2 from "argon2";
import { prisma } from "@nehemias/db";
import { signAdminToken } from "../src/auth/jwt.js";
import { SESSION_COOKIE } from "../src/auth/cookies.js";
import { createTestApp, resetDb } from "./helpers.js";

async function createAdminSessionCookie(): Promise<string> {
  const admin = await prisma.adminUser.create({
    data: {
      email: "admin@test.local",
      name: "Test Admin",
      passwordHash: await argon2.hash("irrelevant", { type: argon2.argon2id }),
      role: "admin",
    },
  });
  const token = signAdminToken({ sub: admin.id, role: admin.role, name: admin.name });
  return `${SESSION_COOKIE}=${token}`;
}

beforeEach(async () => {
  await resetDb();
});

describe("help points: admin CRUD + public visibility", () => {
  it("only lists active help points on the public endpoint", async () => {
    const app = createTestApp();
    const cookie = await createAdminSessionCookie();

    const createRes = await request(app)
      .post("/admin/puntos-ayuda")
      .set("Cookie", cookie)
      .set("Origin", "http://localhost:3000")
      .send({
        name: "Cruz Roja La Guaira",
        type: "organization",
        description: "Entrega de agua potable y kits de higiene.",
        contactPhone: "+58 412 555 0000",
        contactEmail: "ayuda@cruzroja.org",
        lat: 10.6017,
        lng: -66.9308,
      });
    expect(createRes.status).toBe(201);
    const id = createRes.body.puntoAyuda.id;

    const publicListBefore = await request(app).get("/public/puntos-ayuda");
    expect(publicListBefore.body.puntosAyuda).toHaveLength(1);
    expect(publicListBefore.body.puntosAyuda[0]).not.toHaveProperty("isActive");

    const deactivateRes = await request(app)
      .put(`/admin/puntos-ayuda/${id}`)
      .set("Cookie", cookie)
      .set("Origin", "http://localhost:3000")
      .send({ isActive: false });
    expect(deactivateRes.status).toBe(200);

    const publicListAfter = await request(app).get("/public/puntos-ayuda");
    expect(publicListAfter.body.puntosAyuda).toHaveLength(0);

    const adminList = await request(app).get("/admin/puntos-ayuda").set("Cookie", cookie);
    expect(adminList.body.puntosAyuda).toHaveLength(1);
  });

  it("rejects invalid coordinates and type", async () => {
    const app = createTestApp();
    const cookie = await createAdminSessionCookie();

    const res = await request(app)
      .post("/admin/puntos-ayuda")
      .set("Cookie", cookie)
      .set("Origin", "http://localhost:3000")
      .send({
        name: "Punto inválido",
        type: "empresa",
        description: "x",
        lat: 200,
        lng: -66.93,
      });
    expect(res.status).toBe(422);
  });

  it("deletes a help point", async () => {
    const app = createTestApp();
    const cookie = await createAdminSessionCookie();

    const createRes = await request(app)
      .post("/admin/puntos-ayuda")
      .set("Cookie", cookie)
      .set("Origin", "http://localhost:3000")
      .send({
        name: "Juan Pérez",
        type: "person",
        description: "Refugio temporal con 3 habitaciones disponibles.",
        lat: 10.5,
        lng: -67.0,
      });
    const id = createRes.body.puntoAyuda.id;

    const deleteRes = await request(app)
      .delete(`/admin/puntos-ayuda/${id}`)
      .set("Cookie", cookie)
      .set("Origin", "http://localhost:3000");
    expect(deleteRes.status).toBe(200);

    const list = await request(app).get("/admin/puntos-ayuda").set("Cookie", cookie);
    expect(list.body.puntosAyuda).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Add `HelpPoint` to the test-DB truncate list**

In `apps/api/test/helpers.ts:4-18`, add `"HelpPoint"` to the `TABLES` array (position doesn't matter — no FK relations):
```ts
const TABLES = [
  "StockMovement",
  "DeliveryPhoto",
  "DeliveryItem",
  "Delivery",
  "InKindItem",
  "Donation",
  "Expense",
  "Supply",
  "Frente",
  "PaymentInfo",
  "HelpPoint",
  "GalleryPhoto",
  "SystemSetting",
  "AdminUser",
] as const;
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `pnpm --filter @nehemias/api test help-points`
Expected: FAIL — `POST /admin/puntos-ayuda` returns 404 (route doesn't exist yet). Requires the migration from Task 1 Step 4 to have been applied against your test/dev database first.

- [ ] **Step 4: Implement the service**

Create `apps/api/src/services/helpPoints.ts`:
```ts
import { prisma } from "@nehemias/db";
import { toPublicHelpPoint, type HelpPointInput, type HelpPointUpdateInput } from "@nehemias/core";

export async function listActiveHelpPoints() {
  const rows = await prisma.helpPoint.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toPublicHelpPoint);
}

export function listAllHelpPoints() {
  return prisma.helpPoint.findMany({ orderBy: { createdAt: "desc" } });
}

export function createHelpPoint(input: HelpPointInput) {
  return prisma.helpPoint.create({
    data: {
      name: input.name,
      type: input.type,
      description: input.description,
      contactPhone: input.contactPhone,
      contactEmail: input.contactEmail,
      lat: input.lat,
      lng: input.lng,
      isActive: input.isActive ?? true,
    },
  });
}

export function updateHelpPoint(id: string, input: HelpPointUpdateInput) {
  return prisma.helpPoint.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.contactPhone !== undefined && { contactPhone: input.contactPhone }),
      ...(input.contactEmail !== undefined && { contactEmail: input.contactEmail }),
      ...(input.lat !== undefined && { lat: input.lat }),
      ...(input.lng !== undefined && { lng: input.lng }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
    },
  });
}

export function deleteHelpPoint(id: string) {
  return prisma.helpPoint.delete({ where: { id } });
}
```

- [ ] **Step 5: Wire the public route**

In `apps/api/src/routes/public.ts`, add to the import block (after line 21, `import { listActivePaymentInfo } from "../services/paymentInfo.js";`):
```ts
import { listActiveHelpPoints } from "../services/helpPoints.js";
```

Add this route after the `/captacion` route (`apps/api/src/routes/public.ts:131-134`):
```ts

publicRouter.get(
  "/puntos-ayuda",
  asyncHandler(async (_req, res) => res.json({ puntosAyuda: await listActiveHelpPoints() })),
);
```

- [ ] **Step 6: Wire the admin routes**

In `apps/api/src/routes/admin.ts`, add `helpPointSchema, helpPointUpdateSchema` to the `@nehemias/core` import (lines 2-15):
```ts
import {
  adminCreateDonationSchema,
  adminUpdateDonationSchema,
  reviewDonationSchema,
  expenseSchema,
  expenseUpdateSchema,
  supplySchema,
  supplyUpdateSchema,
  paymentInfoSchema,
  helpPointSchema,
  helpPointUpdateSchema,
  adminDonationQuerySchema,
  adminExpenseQuerySchema,
  galleryQuerySchema,
  buildMeta,
} from "@nehemias/core";
```

Add to the imports block (after line 44, `import { getSettings, updateSetting } from "../services/settings.js";`):
```ts
import {
  listAllHelpPoints,
  createHelpPoint,
  updateHelpPoint,
  deleteHelpPoint,
} from "../services/helpPoints.js";
```

Add these routes right before the `// ---------- SINCRONIZACIÓN GOOGLE SHEETS ----------` comment (`apps/api/src/routes/admin.ts:308`):
```ts
// ---------- PUNTOS DE AYUDA (mapa) ----------
adminRouter.get(
  "/puntos-ayuda",
  asyncHandler(async (_req, res) => {
    res.json({ puntosAyuda: await listAllHelpPoints() });
  }),
);

adminRouter.post(
  "/puntos-ayuda",
  asyncHandler(async (req, res) => {
    const data = helpPointSchema.parse(req.body);
    const puntoAyuda = await createHelpPoint(data);
    res.status(201).json({ puntoAyuda });
  }),
);

adminRouter.put(
  "/puntos-ayuda/:id",
  asyncHandler(async (req, res) => {
    const data = helpPointUpdateSchema.parse(req.body);
    const puntoAyuda = await updateHelpPoint(req.params.id, data);
    res.json({ puntoAyuda });
  }),
);

adminRouter.delete(
  "/puntos-ayuda/:id",
  asyncHandler(async (req, res) => {
    await deleteHelpPoint(req.params.id);
    res.json({ ok: true });
  }),
);

```

- [ ] **Step 7: Run tests to verify they pass**

Run: `pnpm --filter @nehemias/api test help-points`
Expected: PASS — all 3 tests green.

Then run the full API suite to confirm no regressions:
Run: `pnpm --filter @nehemias/api test`
Expected: PASS — all suites green (donations, files, health, rate-limit, validation, help-points).

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/services/helpPoints.ts apps/api/src/routes/public.ts apps/api/src/routes/admin.ts apps/api/test/helpers.ts apps/api/test/help-points.test.ts
git commit -m "feat(api): add HelpPoint CRUD routes (public read, admin write)"
```

---

### Task 4: `apps/api` — extend `/public/home` and `/admin/settings` for the map

**Files:**
- Modify: `apps/api/src/routes/public.ts:45-70` (the `/home` handler)
- Modify: `apps/api/src/routes/admin.ts:291-306` (the `/settings` handlers)
- Modify: `apps/api/test/help-points.test.ts` (append one more test)

**Interfaces:**
- Consumes: `listActiveHelpPoints` (already imported in Task 3), `updateSetting`/`getSettings` (already imported in `admin.ts`).
- Produces: `GET /public/home` response gains a `puntosAyuda: PublicHelpPoint[]` field. `PUT /admin/settings` accepts an additional optional `impact_zone_coords` string field, persisted via the existing generic `SystemSetting` key/value store — no schema change needed, `GET /public/settings` already returns it as-is.

- [ ] **Step 1: Write the failing test**

Append to `apps/api/test/help-points.test.ts`, inside the existing `describe(...)` block (after the third `it(...)`):
```ts

  it("includes active help points in the public home snapshot, and lets admin save the impact zone trace", async () => {
    const app = createTestApp();
    const cookie = await createAdminSessionCookie();

    await request(app)
      .post("/admin/puntos-ayuda")
      .set("Cookie", cookie)
      .set("Origin", "http://localhost:3000")
      .send({
        name: "Punto Home",
        type: "person",
        description: "Ofrece agua y comida.",
        lat: 10.5,
        lng: -67.0,
      });

    const home = await request(app).get("/public/home");
    expect(home.body.puntosAyuda).toHaveLength(1);
    expect(home.body.puntosAyuda[0].name).toBe("Punto Home");

    const coords = JSON.stringify([
      [10.8206, -68.324],
      [10.6017, -66.9308],
    ]);
    const settingsRes = await request(app)
      .put("/admin/settings")
      .set("Cookie", cookie)
      .set("Origin", "http://localhost:3000")
      .send({ impact_zone_coords: coords });
    expect(settingsRes.status).toBe(200);
    expect(settingsRes.body.settings.impact_zone_coords).toBe(coords);

    const publicSettings = await request(app).get("/public/settings");
    expect(publicSettings.body.settings.impact_zone_coords).toBe(coords);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @nehemias/api test help-points`
Expected: FAIL — `home.body.puntosAyuda` is `undefined` (not yet added to the `/home` handler).

- [ ] **Step 3: Extend `/public/home`**

In `apps/api/src/routes/public.ts:45-70`, change:
```ts
publicRouter.get(
  "/home",
  asyncHandler(async (_req, res) => {
    const homeListQuery = { page: 1, limit: 20 } as const;
    const [{ balances, exchangeRate }, urgentes, donaciones, egresos, captacion, fotos] = await Promise.all([
      getBalances(),
      listUrgentSupplies(),
      listPublicVerifiedDonations(homeListQuery),
      listPublicExpenses(homeListQuery),
      listActivePaymentInfo(),
      prisma.galleryPhoto.findMany({
        take: 8,
        orderBy: { createdAt: "desc" },
      }),
    ]);
    res.json({
      balances,
      exchangeRate,
      urgentes: urgentes.map(toPublicSupply),
      ultimasDonaciones: donaciones.data,
      ultimosEgresos: egresos.data,
      captacion,
      ultimasFotos: fotos,
    });
  }),
);
```
to:
```ts
publicRouter.get(
  "/home",
  asyncHandler(async (_req, res) => {
    const homeListQuery = { page: 1, limit: 20 } as const;
    const [{ balances, exchangeRate }, urgentes, donaciones, egresos, captacion, fotos, puntosAyuda] =
      await Promise.all([
        getBalances(),
        listUrgentSupplies(),
        listPublicVerifiedDonations(homeListQuery),
        listPublicExpenses(homeListQuery),
        listActivePaymentInfo(),
        prisma.galleryPhoto.findMany({
          take: 8,
          orderBy: { createdAt: "desc" },
        }),
        listActiveHelpPoints(),
      ]);
    res.json({
      balances,
      exchangeRate,
      urgentes: urgentes.map(toPublicSupply),
      ultimasDonaciones: donaciones.data,
      ultimosEgresos: egresos.data,
      captacion,
      ultimasFotos: fotos,
      puntosAyuda,
    });
  }),
);
```

- [ ] **Step 4: Extend `PUT /admin/settings`**

In `apps/api/src/routes/admin.ts:297-306`, change:
```ts
adminRouter.put(
  "/settings",
  asyncHandler(async (req, res) => {
    const { contact_phone, contact_email, contact_sede } = req.body;
    if (typeof contact_phone === "string") await updateSetting("contact_phone", contact_phone);
    if (typeof contact_email === "string") await updateSetting("contact_email", contact_email);
    if (typeof contact_sede === "string") await updateSetting("contact_sede", contact_sede);
    res.json({ settings: await getSettings() });
  }),
);
```
to:
```ts
adminRouter.put(
  "/settings",
  asyncHandler(async (req, res) => {
    const { contact_phone, contact_email, contact_sede, impact_zone_coords } = req.body;
    if (typeof contact_phone === "string") await updateSetting("contact_phone", contact_phone);
    if (typeof contact_email === "string") await updateSetting("contact_email", contact_email);
    if (typeof contact_sede === "string") await updateSetting("contact_sede", contact_sede);
    if (typeof impact_zone_coords === "string")
      await updateSetting("impact_zone_coords", impact_zone_coords);
    res.json({ settings: await getSettings() });
  }),
);
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm --filter @nehemias/api test`
Expected: PASS — all suites green.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/routes/public.ts apps/api/src/routes/admin.ts apps/api/test/help-points.test.ts
git commit -m "feat(api): expose help points on /home and impact zone trace on /settings"
```

---

### Task 5: `apps/web` — public Leaflet map on the Home page

**Files:**
- Modify: `apps/web/package.json` (add `leaflet`, `react-leaflet`, `@types/leaflet`)
- Create: `apps/web/lib/impact-zone.ts`
- Create: `apps/web/lib/help-point-icons.ts`
- Create: `apps/web/components/impact-map.tsx`
- Modify: `apps/web/lib/api.ts` (import + `HomeSnapshot`)
- Modify: `apps/web/app/(public)/page.tsx`

**Interfaces:**
- Consumes: `PublicHelpPoint` from `@nehemias/core` (Task 2); `getHome`, `getSettings` from `apps/web/lib/api.ts` (already exist).
- Produces: `DEFAULT_ZONE_COORDS: [number, number][]`, `parseZoneCoords(raw: string | undefined): [number, number][] | null` from `lib/impact-zone.ts` (consumed by Task 6's admin page too); `iconFor(type: "person" | "organization"): L.DivIcon` from `lib/help-point-icons.ts` (consumed by Task 6's admin map); default-exported `ImpactMap` React component from `components/impact-map.tsx` with props `{ points: PublicHelpPoint[]; zoneCoords: [number, number][] | null }`.

- [ ] **Step 1: Add dependencies**

In `apps/web/package.json`, add to `"dependencies"`:
```json
    "leaflet": "^1.9.4",
    "react-leaflet": "^5.0.0",
```
and to `"devDependencies"`:
```json
    "@types/leaflet": "^1.9.12",
```

Run: `pnpm install`
Expected: lockfile updates, install succeeds with no peer-dependency errors (react-leaflet 5 targets React 19, matching this repo's `react": "^19.0.0"`).

- [ ] **Step 2: Create the shared zone-coords helper**

Create `apps/web/lib/impact-zone.ts`:
```ts
/**
 * Traza de ejemplo de la zona de mayor impacto (Higuerote–Tucacas), usada
 * como respaldo mientras el admin no haya guardado una traza real.
 */
export const DEFAULT_ZONE_COORDS: [number, number][] = [
  [10.8206, -68.324], // Tucacas
  [10.7419, -68.2415], // Chichiriviche
  [10.4756, -68.0102], // Puerto Cabello
  [10.6017, -66.9308], // La Guaira / Maiquetía
  [10.52, -66.6],
  [10.4806, -66.1004], // Higuerote
];

/** Parsea el valor guardado en SystemSetting `impact_zone_coords`. Null si falta o es inválido. */
export function parseZoneCoords(raw: string | undefined): [number, number][] | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    const coords = parsed.filter(
      (p): p is [number, number] =>
        Array.isArray(p) && p.length === 2 && typeof p[0] === "number" && typeof p[1] === "number",
    );
    return coords.length > 1 ? coords : null;
  } catch {
    return null;
  }
}
```

- [ ] **Step 3: Create the shared marker icons**

Create `apps/web/lib/help-point-icons.ts`:
```ts
import L from "leaflet";

/**
 * Iconos de marcador por tipo de punto de ayuda. Este módulo solo se importa
 * desde componentes cargados vía next/dynamic({ ssr: false }), así que nunca
 * se ejecuta en el servidor (Leaflet no soporta SSR).
 */
export const personIcon = L.divIcon({
  className: "help-point-icon",
  html: `<div style="background:#2563eb;width:28px;height:28px;border-radius:9999px;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4)"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 21v-1a7 7 0 0 1 14 0v1"/></svg></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

export const organizationIcon = L.divIcon({
  className: "help-point-icon",
  html: `<div style="background:#b45309;width:28px;height:28px;border-radius:9999px;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4)"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M3 21h18M6 21V7l6-4 6 4v14M9 9h1M9 13h1M14 9h1M14 13h1"/></svg></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

export function iconFor(type: "person" | "organization"): L.DivIcon {
  return type === "person" ? personIcon : organizationIcon;
}
```

- [ ] **Step 4: Create the public map component**

Create `apps/web/components/impact-map.tsx`:
```tsx
"use client";

import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { PublicHelpPoint } from "@nehemias/core";
import { DEFAULT_ZONE_COORDS } from "@/lib/impact-zone";
import { iconFor } from "@/lib/help-point-icons";

interface ImpactMapProps {
  points: PublicHelpPoint[];
  zoneCoords: [number, number][] | null;
}

export default function ImpactMap({ points, zoneCoords }: ImpactMapProps) {
  const zone = zoneCoords && zoneCoords.length > 1 ? zoneCoords : DEFAULT_ZONE_COORDS;

  return (
    <div className="h-[420px] w-full overflow-hidden rounded-2xl border border-border shadow-sm">
      <MapContainer center={[10.55, -67.4]} zoom={9} scrollWheelZoom={false} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Polyline positions={zone} pathOptions={{ color: "#dc2626", weight: 5, opacity: 0.75 }} />
        {points.map((p) => (
          <Marker key={p.id} position={[p.lat, p.lng]} icon={iconFor(p.type)}>
            <Popup>
              <div className="space-y-1 text-sm">
                <p className="font-semibold text-ink">{p.name}</p>
                <p className="text-xs uppercase tracking-wide text-ink-subtle">
                  {p.type === "person" ? "Persona particular" : "Organización"}
                </p>
                <p className="text-ink-muted">{p.description}</p>
                {p.contactPhone && (
                  <p>
                    <a href={`tel:${p.contactPhone}`} className="font-medium text-brand">
                      {p.contactPhone}
                    </a>
                  </p>
                )}
                {p.contactEmail && (
                  <p>
                    <a href={`mailto:${p.contactEmail}`} className="font-medium text-brand">
                      {p.contactEmail}
                    </a>
                  </p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
```

- [ ] **Step 5: Extend `HomeSnapshot`**

In `apps/web/lib/api.ts`, change the import block (lines 1-8) from:
```ts
import type {
  CurrencyBalance,
  PublicDonation,
  PublicExpense,
  PublicSupply,
  PublicPaymentInfo,
  PaginationMeta,
} from "@nehemias/core";
```
to:
```ts
import type {
  CurrencyBalance,
  PublicDonation,
  PublicExpense,
  PublicSupply,
  PublicPaymentInfo,
  PublicHelpPoint,
  PaginationMeta,
} from "@nehemias/core";
```

Change the `HomeSnapshot` interface (lines 59-67) from:
```ts
export interface HomeSnapshot {
  balances: CurrencyBalance[];
  exchangeRate: number;
  urgentes: PublicSupply[];
  ultimasDonaciones: PublicDonation[];
  ultimosEgresos: PublicExpense[];
  captacion: PublicPaymentInfo[];
  ultimasFotos: { id: string; url: string; title: string | null; createdAt: string }[];
}
```
to:
```ts
export interface HomeSnapshot {
  balances: CurrencyBalance[];
  exchangeRate: number;
  urgentes: PublicSupply[];
  ultimasDonaciones: PublicDonation[];
  ultimosEgresos: PublicExpense[];
  captacion: PublicPaymentInfo[];
  ultimasFotos: { id: string; url: string; title: string | null; createdAt: string }[];
  puntosAyuda: PublicHelpPoint[];
}
```

- [ ] **Step 6: Wire the map into the Home page**

In `apps/web/app/(public)/page.tsx`, change the import block (lines 1-9) from:
```tsx
import Link from "next/link";
import { buttonClasses, SectionHeader, IconArrowRight, IconShield } from "@nehemias/ui";
import { getHome, type HomeSnapshot } from "@/lib/api";
import { BalancePanel } from "@/components/balance";
import { InsumoCard } from "@/components/cards";
import { RecentDonations, RecentExpenses } from "@/components/recent-transactions";
import { GalleryView } from "@/components/gallery-view";

export const dynamic = "force-dynamic";
```
to:
```tsx
import Link from "next/link";
import dynamicImport from "next/dynamic";
import { buttonClasses, SectionHeader, IconArrowRight, IconShield } from "@nehemias/ui";
import { getHome, getSettings, type HomeSnapshot } from "@/lib/api";
import { BalancePanel } from "@/components/balance";
import { InsumoCard } from "@/components/cards";
import { RecentDonations, RecentExpenses } from "@/components/recent-transactions";
import { GalleryView } from "@/components/gallery-view";
import { parseZoneCoords } from "@/lib/impact-zone";

export const dynamic = "force-dynamic";

const ImpactMap = dynamicImport(() => import("@/components/impact-map"), {
  ssr: false,
  loading: () => <div className="h-[420px] w-full animate-pulse rounded-2xl bg-surface-sunken" />,
});
```
(Renamed the `next/dynamic` import to `dynamicImport` because the file already exports a route-segment config constant named `dynamic` — `next/dynamic`'s default export would otherwise collide with it.)

Change the data-loading block (lines 11-18) from:
```tsx
export default async function HomePage() {
  let data: HomeSnapshot | null = null;
  try {
    data = await getHome();
  } catch {
    data = null;
  }
```
to:
```tsx
export default async function HomePage() {
  let data: HomeSnapshot | null = null;
  let zoneCoords: [number, number][] | null = null;
  try {
    const [home, settingsRes] = await Promise.all([getHome(), getSettings()]);
    data = home;
    zoneCoords = parseZoneCoords(settingsRes.settings.impact_zone_coords);
  } catch {
    data = null;
  }
```

Add a new section right after the "Necesidades urgentes" section and before "Movimientos recientes" (between lines 127 and 129 of the original file — the closing `)}` of the urgentes block and the `{/* ── Movimientos recientes ── */}` comment):
```tsx
        {/* ── Mapa de ayuda ── */}
        <section>
          <SectionHeader
            eyebrow="Zona afectada"
            title="Mapa de ayuda en terreno"
            description="La traza marca la zona de mayor impacto del terremoto. Cada punto es una persona u organización brindando ayuda ahí — haz clic para ver cómo contactarla."
          />
          <div className="mt-6">
            <ImpactMap points={data.puntosAyuda} zoneCoords={zoneCoords} />
          </div>
        </section>

```

- [ ] **Step 7: Manual verification**

Prerequisite: a running local Postgres with the Task 1 migration applied (`pnpm db:migrate`).

Run: `pnpm dev` (starts `apps/api` on :4000 and `apps/web` on :3000 via turbo)
Open `http://localhost:3000` in a browser.
Expected:
- A new "Mapa de ayuda en terreno" section renders between "Necesidades urgentes" and "Últimos aportes verificados".
- The map shows OpenStreetMap tiles and a thick red line following the example Higuerote–Tucacas coastline coordinates (no help points exist yet, so no markers — that's expected until Task 6 lets you add one).
- No console errors about `window is not defined` (confirms the `ssr: false` dynamic import is working).

- [ ] **Step 8: Commit**

```bash
git add apps/web/package.json apps/web/lib/impact-zone.ts apps/web/lib/help-point-icons.ts apps/web/components/impact-map.tsx apps/web/lib/api.ts "apps/web/app/(public)/page.tsx" pnpm-lock.yaml
git commit -m "feat(web): render impact-zone map with help-point markers on Home"
```

---

### Task 6: `apps/web` — admin "Mapa de ayuda" page

**Files:**
- Modify: `apps/web/lib/admin-api.ts` (append)
- Create: `apps/web/components/admin-help-map.tsx`
- Create: `apps/web/app/admin/mapa-ayuda/page.tsx`
- Modify: `apps/web/app/admin/layout.tsx:21-28` (`NAV` array)

**Interfaces:**
- Consumes: `DEFAULT_ZONE_COORDS`, `parseZoneCoords` from `lib/impact-zone.ts` (Task 5); `iconFor` from `lib/help-point-icons.ts` (Task 5); `apiSettings`, `apiActualizarSettings` (already exist in `admin-api.ts`).
- Produces: `apiPuntosAyuda()`, `apiCrearPuntoAyuda(data)`, `apiActualizarPuntoAyuda(id, data)`, `apiEliminarPuntoAyuda(id)` in `admin-api.ts`; default-exported `AdminHelpMap` component with props `{ points: {id,name,type,lat,lng,isActive}[]; zoneCoords: [number,number][]; mode: "puntos" | "traza"; onMapClick: (lat:number,lng:number)=>void }`.

- [ ] **Step 1: Add admin API client functions**

Append to the end of `apps/web/lib/admin-api.ts`:
```ts

// — Puntos de ayuda (mapa) —
export const apiPuntosAyuda = () => apiGet("/admin/puntos-ayuda");
export const apiCrearPuntoAyuda = (data: unknown) => apiJson("/admin/puntos-ayuda", "POST", data);
export const apiActualizarPuntoAyuda = (id: string, data: unknown) =>
  apiJson(`/admin/puntos-ayuda/${id}`, "PUT", data);
export const apiEliminarPuntoAyuda = (id: string) =>
  apiJson(`/admin/puntos-ayuda/${id}`, "DELETE", {});
```

- [ ] **Step 2: Create the admin map component**

Create `apps/web/components/admin-help-map.tsx`:
```tsx
"use client";

import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { iconFor } from "@/lib/help-point-icons";

interface AdminHelpPoint {
  id: string;
  name: string;
  type: "person" | "organization";
  lat: number;
  lng: number;
  isActive: boolean;
}

interface AdminHelpMapProps {
  points: AdminHelpPoint[];
  zoneCoords: [number, number][];
  mode: "puntos" | "traza";
  onMapClick: (lat: number, lng: number) => void;
}

function ClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function AdminHelpMap({ points, zoneCoords, mode, onMapClick }: AdminHelpMapProps) {
  return (
    <div className="h-[480px] w-full overflow-hidden rounded-2xl border border-border shadow-sm">
      <MapContainer center={[10.55, -67.4]} zoom={9} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler onClick={onMapClick} />
        {zoneCoords.length > 1 && (
          <Polyline positions={zoneCoords} pathOptions={{ color: "#dc2626", weight: 5, opacity: 0.75 }} />
        )}
        {mode === "puntos" &&
          points.map((p) => (
            <Marker key={p.id} position={[p.lat, p.lng]} icon={iconFor(p.type)}>
              <Popup>
                <div className="text-sm">
                  <p className="font-semibold">{p.name}</p>
                  {!p.isActive && <p className="text-xs text-danger">Inactivo</p>}
                </div>
              </Popup>
            </Marker>
          ))}
      </MapContainer>
    </div>
  );
}
```

- [ ] **Step 3: Create the admin page**

Create `apps/web/app/admin/mapa-ayuda/page.tsx`:
```tsx
"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { createPortal } from "react-dom";
import { Button, Card, Field, Input, Textarea, Select, Badge, IconX, IconTrash } from "@nehemias/ui";
import {
  apiPuntosAyuda,
  apiCrearPuntoAyuda,
  apiEliminarPuntoAyuda,
  apiSettings,
  apiActualizarSettings,
} from "@/lib/admin-api";
import { DEFAULT_ZONE_COORDS, parseZoneCoords } from "@/lib/impact-zone";

const AdminHelpMap = dynamic(() => import("@/components/admin-help-map"), {
  ssr: false,
  loading: () => <div className="h-[480px] w-full animate-pulse rounded-2xl bg-surface-sunken" />,
});

interface PuntoAyudaRow {
  id: string;
  name: string;
  type: "person" | "organization";
  description: string;
  contactPhone: string | null;
  contactEmail: string | null;
  lat: number | string;
  lng: number | string;
  isActive: boolean;
}

export default function AdminMapaAyudaPage() {
  const [puntos, setPuntos] = useState<PuntoAyudaRow[]>([]);
  const [mode, setMode] = useState<"puntos" | "traza">("puntos");
  const [pendingCoord, setPendingCoord] = useState<{ lat: number; lng: number } | null>(null);
  const [zoneCoords, setZoneCoords] = useState<[number, number][]>(DEFAULT_ZONE_COORDS);
  const [zoneSaving, setZoneSaving] = useState(false);
  const [zoneMessage, setZoneMessage] = useState("");
  const [mounted, setMounted] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  function cargarPuntos() {
    apiPuntosAyuda()
      .then((r) => setPuntos(r.puntosAyuda))
      .catch(() => setPuntos([]));
  }
  useEffect(cargarPuntos, []);

  useEffect(() => {
    apiSettings()
      .then((r) => {
        const parsed = parseZoneCoords(r.settings?.impact_zone_coords);
        if (parsed) setZoneCoords(parsed);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    document.body.style.overflow = pendingCoord ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [pendingCoord]);

  function onMapClick(lat: number, lng: number) {
    if (mode === "puntos") {
      setPendingCoord({ lat, lng });
    } else {
      setZoneCoords((prev) => [...prev, [lat, lng]]);
    }
  }

  async function eliminar(id: string) {
    setBusyId(id);
    setDeleteError(null);
    try {
      await apiEliminarPuntoAyuda(id);
      setConfirmDeleteId(null);
      cargarPuntos();
    } catch (err) {
      setDeleteError((err as Error).message || "No se pudo eliminar el punto.");
    } finally {
      setBusyId(null);
    }
  }

  async function guardarTraza() {
    setZoneSaving(true);
    setZoneMessage("");
    try {
      await apiActualizarSettings({ impact_zone_coords: JSON.stringify(zoneCoords) });
      setZoneMessage("Traza guardada. Ya se ve en el mapa público.");
    } catch {
      setZoneMessage("Error al guardar la traza.");
    } finally {
      setZoneSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl font-semibold text-ink">Mapa de ayuda</h1>
        <p className="mt-1 text-ink-muted">
          Gestiona los puntos de personas y organizaciones que brindan ayuda, y la traza de la zona
          de mayor impacto que se muestra en el inicio.
        </p>
      </div>

      <Card className="p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            <Button variant={mode === "puntos" ? "primary" : "secondary"} size="sm" onClick={() => setMode("puntos")}>
              Agregar puntos
            </Button>
            <Button variant={mode === "traza" ? "primary" : "secondary"} size="sm" onClick={() => setMode("traza")}>
              Editar traza de impacto
            </Button>
          </div>
          {mode === "puntos" ? (
            <p className="text-sm text-ink-subtle">Haz clic en el mapa para agregar un punto.</p>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setZoneCoords((prev) => prev.slice(0, -1))}
                disabled={zoneCoords.length === 0}
              >
                Deshacer último punto
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setZoneCoords([])} disabled={zoneCoords.length === 0}>
                Limpiar
              </Button>
              <Button size="sm" onClick={guardarTraza} disabled={zoneSaving || zoneCoords.length < 2}>
                {zoneSaving ? "Guardando..." : "Guardar traza"}
              </Button>
            </div>
          )}
        </div>
        {mode === "traza" && zoneMessage && (
          <p className={`text-sm font-semibold ${zoneMessage.includes("Error") ? "text-danger" : "text-success"}`}>
            {zoneMessage}
          </p>
        )}

        <AdminHelpMap
          points={puntos.map((p) => ({ ...p, lat: Number(p.lat), lng: Number(p.lng) }))}
          zoneCoords={zoneCoords}
          mode={mode}
          onMapClick={onMapClick}
        />
      </Card>

      {mounted &&
        pendingCoord &&
        createPortal(
          <div className="fixed inset-0 z-50 flex justify-center items-start overflow-y-auto bg-black/60 backdrop-blur-sm p-4 sm:p-6 md:p-8">
            <div className="relative max-w-lg w-full bg-white rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between p-5 border-b border-border/60 bg-surface-sunken/30">
                <h3 className="font-serif text-lg font-bold text-ink leading-tight">Nuevo punto de ayuda</h3>
                <button
                  onClick={() => setPendingCoord(null)}
                  className="p-1.5 rounded-full text-ink-muted hover:bg-surface-sunken hover:text-ink transition-colors cursor-pointer"
                  aria-label="Cerrar"
                >
                  <IconX size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
                <PuntoAyudaForm
                  coord={pendingCoord}
                  onDone={() => {
                    setPendingCoord(null);
                    cargarPuntos();
                  }}
                  onCancel={() => setPendingCoord(null)}
                />
              </div>
            </div>
          </div>,
          document.body,
        )}

      <section className="space-y-4">
        <h2 className="font-serif text-xl font-semibold text-ink">Puntos registrados ({puntos.length})</h2>

        {deleteError && (
          <div className="bg-danger-soft border border-danger/20 text-danger p-3 rounded-lg text-xs font-semibold">
            {deleteError}
          </div>
        )}

        {puntos.map((p) => (
          <Card key={p.id} className="flex items-center justify-between p-5 bg-white border border-border/80">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <p className="font-bold text-ink text-base">{p.name}</p>
                <Badge tone="brand">{p.type === "person" ? "Persona" : "Organización"}</Badge>
                {!p.isActive && <Badge tone="danger">Inactivo</Badge>}
              </div>
              <p className="text-sm text-ink-muted">{p.description}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {confirmDeleteId === p.id ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-danger">¿Eliminar?</span>
                  <Button variant="secondary" size="sm" onClick={() => setConfirmDeleteId(null)} disabled={busyId === p.id}>
                    No
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => eliminar(p.id)} disabled={busyId === p.id}>
                    Sí
                  </Button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDeleteId(p.id)}
                  className="p-2 rounded-full text-danger hover:bg-danger-soft transition-colors cursor-pointer"
                  title="Eliminar punto"
                >
                  <IconTrash size={18} />
                </button>
              )}
            </div>
          </Card>
        ))}

        {puntos.length === 0 && (
          <p className="text-ink-muted py-8 text-center bg-surface-sunken/45 rounded-xl border border-border border-dashed text-sm font-medium">
            Aún no hay puntos de ayuda registrados. Haz clic en el mapa para agregar el primero.
          </p>
        )}
      </section>
    </div>
  );
}

function PuntoAyudaForm({
  coord,
  onDone,
  onCancel,
}: {
  coord: { lat: number; lng: number };
  onDone: () => void;
  onCancel: () => void;
}) {
  const [estado, setEstado] = useState<"idle" | "enviando">("idle");
  const [activo, setActivo] = useState(true);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setEstado("enviando");
    const fd = new FormData(e.currentTarget);
    const data = {
      name: fd.get("name"),
      type: fd.get("type"),
      description: fd.get("description"),
      contactPhone: fd.get("contactPhone") || undefined,
      contactEmail: fd.get("contactEmail") || undefined,
      lat: coord.lat,
      lng: coord.lng,
      isActive: activo,
    };
    try {
      await apiCrearPuntoAyuda(data);
      onDone();
    } catch (err) {
      setError((err as Error).message || "No se pudo guardar el punto.");
      setEstado("idle");
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-5">
      <p className="text-xs text-ink-subtle">
        Coordenadas capturadas: {coord.lat.toFixed(5)}, {coord.lng.toFixed(5)}
      </p>
      <Field label="Nombre" htmlFor="pa-name" required>
        <Input id="pa-name" name="name" placeholder="Ej: Juan Pérez o Cruz Roja La Guaira" required />
      </Field>
      <Field label="Tipo" htmlFor="pa-type" required>
        <Select id="pa-type" name="type" defaultValue="person" required>
          <option value="person">Persona particular</option>
          <option value="organization">Organización</option>
        </Select>
      </Field>
      <Field label="Descripción de la ayuda" htmlFor="pa-description" required>
        <Textarea
          id="pa-description"
          name="description"
          placeholder="Qué tipo de ayuda ofrece (agua, refugio, atención médica...)"
          required
          rows={3}
        />
      </Field>
      <Field label="Teléfono / WhatsApp" htmlFor="pa-phone">
        <Input id="pa-phone" name="contactPhone" placeholder="+58 412 555 0000" />
      </Field>
      <Field label="Correo" htmlFor="pa-email">
        <Input id="pa-email" name="contactEmail" type="email" placeholder="contacto@ejemplo.org" />
      </Field>
      <div>
        <label className="inline-flex cursor-pointer items-center gap-2.5 text-sm font-semibold text-ink select-none">
          <input
            type="checkbox"
            checked={activo}
            onChange={(e) => setActivo(e.target.checked)}
            className="h-4.5 w-4.5 rounded border-border text-brand focus:ring-brand accent-[color:rgb(var(--color-brand))]"
          />
          Visible en el mapa público
        </label>
      </div>
      {error && <p className="text-sm text-danger font-medium">{error}</p>}
      <div className="pt-2 border-t border-border/40 flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={estado === "enviando"}>
          Cancelar
        </Button>
        <Button type="submit" disabled={estado === "enviando"}>
          {estado === "enviando" ? "Guardando..." : "Agregar punto"}
        </Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 4: Add the nav entry**

In `apps/web/app/admin/layout.tsx:21-28`, change:
```tsx
const NAV = [
  { href: "/admin", label: "Inicio", icon: IconTrendingUp },
  { href: "/admin/donaciones", label: "Donaciones", icon: IconHeart },
  { href: "/admin/egresos", label: "Egresos", icon: IconReceipt },
  { href: "/admin/inventario", label: "Inventario", icon: IconBox },
  { href: "/admin/galeria", label: "Galería", icon: IconCamera },
  { href: "/admin/captacion", label: "Métodos de pago", icon: IconShield },
];
```
to:
```tsx
const NAV = [
  { href: "/admin", label: "Inicio", icon: IconTrendingUp },
  { href: "/admin/donaciones", label: "Donaciones", icon: IconHeart },
  { href: "/admin/egresos", label: "Egresos", icon: IconReceipt },
  { href: "/admin/inventario", label: "Inventario", icon: IconBox },
  { href: "/admin/mapa-ayuda", label: "Mapa de ayuda", icon: IconMapPin },
  { href: "/admin/galeria", label: "Galería", icon: IconCamera },
  { href: "/admin/captacion", label: "Métodos de pago", icon: IconShield },
];
```
(`IconMapPin` is already imported at the top of this file, line 12 — it was unused until now.)

- [ ] **Step 5: Manual verification**

Prerequisite: `pnpm dev` running (same as Task 5 Step 7), logged into `/admin/login` with the seeded admin (`SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` from `.env`).

Open `http://localhost:3000/admin/mapa-ayuda`. Verify, in order:
1. "Mapa de ayuda" appears in the sidebar nav and the page loads with the map showing the default red trace.
2. In "Agregar puntos" mode (default), clicking anywhere on the map opens the "Nuevo punto de ayuda" modal with the clicked coordinates shown. Fill Nombre/Tipo/Descripción, submit → modal closes, a new marker (colored by type) appears on the map, and the point appears in the "Puntos registrados" list below.
3. Click "Eliminar" on that point, confirm "Sí" → the row and the marker both disappear.
4. Switch to "Editar traza de impacto" mode, click 3-4 new spots on the map → a live red line follows the clicks; "Deshacer último punto" removes the last click; "Guardar traza" persists it (success message shown).
5. Open `http://localhost:3000` (public Home) in another tab and confirm the red trace there now matches what was just saved in step 4.

- [ ] **Step 6: Commit**

```bash
git add apps/web/lib/admin-api.ts apps/web/components/admin-help-map.tsx apps/web/app/admin/mapa-ayuda/page.tsx apps/web/app/admin/layout.tsx
git commit -m "feat(web): add admin panel to manage help points and the impact zone trace"
```

---

## Post-implementation checklist

- [ ] `pnpm typecheck` (root, runs across all workspaces) passes with no errors.
- [ ] `pnpm lint` passes.
- [ ] `pnpm --filter @nehemias/core test` and `pnpm --filter @nehemias/api test` both pass.
- [ ] Full manual walkthrough from Task 6 Step 5 completed once more end-to-end after all tasks are merged.
