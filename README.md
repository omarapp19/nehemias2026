# Proyecto Nehemías

Plataforma de **gestión humanitaria y transparencia radical** para asistir a las comunidades
olvidadas tras los terremotos en Venezuela. El público puede **auditar en tiempo real** a dónde
fue cada bolívar y cada insumo: con comprobantes y fotos.

> El alma del sistema no es la logística, es la **confianza**. El balance se calcula solo, los
> egresos muestran su factura y las entregas su foto. Lo sensible (contactos, comprobantes de
> donantes) nunca es público.

> 👩‍💻 **¿Vas a continuar o desplegar este proyecto?** Lee la
> **[Guía para desarrolladores](GUIA_DESARROLLADORES.md)**: explica todo el código a nivel técnico,
> la API completa, las reglas de negocio y un checklist de pendientes (QA, validaciones, seguridad).

---

## Qué incluye

- **Cara pública (sin login):** balance en tiempo real (doble moneda **USD / VES**, sin
  mezclarse), necesidades urgentes, ingresos y egresos con factura, y bitácora de entregas con
  fotos por frente.
- **Panel admin (móvil-first):** cola de verificación de donaciones (aprobar/rechazar con un
  toque), registro de compras con factura, inventario con matriz de prioridades, frentes,
  bitácora de entregas con fotos y datos de captación.
- **Design system propio** (`packages/ui`) con un único archivo de tema editable por hex:
  [packages/ui/src/theme.config.ts](packages/ui/src/theme.config.ts). Página viva en `/styleguide`.

## Arquitectura (monorepo)

```
apps/web     Next.js (App Router) — sitio público + panel /admin
apps/api     Express (TypeScript) — REST, auth admin, lógica contable, uploads
packages/db  Prisma — schema, migraciones, cliente, seed
packages/ui  Design system — tema (única fuente de color), tokens, componentes, /styleguide
packages/core Lógica compartida — zod, balance derivado, DTOs públicos
packages/config tsconfig / eslint / prettier compartidos
```

**Stack:** Turborepo + pnpm · Next 15 + React 19 · Express 4 · PostgreSQL + Prisma 6 ·
Tailwind (preset propio) · sharp (imágenes, borra EXIF) · argon2 + JWT (cookie httpOnly).

---

## Arranque local (desarrollo)

Requisitos: **Node ≥ 20**, **pnpm 10**, y **PostgreSQL** (o Docker para levantar solo la base).

```bash
# 1) Dependencias
pnpm install

# 2) Variables de entorno
cp .env.example .env        # edita DATABASE_URL, JWT_SECRET, etc.

# 3) Base de datos: usa tu Postgres local, o levanta solo la base con Docker
docker compose up -d db     # expone 127.0.0.1:5432 (solo local)

# 4) Cliente Prisma + migraciones + datos de demostración
pnpm db:generate
pnpm db:migrate             # crea las tablas
pnpm db:seed                # ~15 donaciones, egresos, insumos, frentes, entregas y 1 admin

# 5) Levanta web + api a la vez
pnpm dev
```

- Web: http://localhost:3000 · API: http://localhost:4000 · Guía de estilo: http://localhost:3000/styleguide
- Admin: http://localhost:3000/admin/login (usa `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` del `.env`).

> Si el puerto 5432 ya está ocupado por otro Postgres, cambia el mapeo en
> [docker-compose.yml](docker-compose.yml) o apunta `DATABASE_URL` a tu base existente.

## Comandos útiles

```bash
pnpm dev          # web + api en caliente
pnpm build        # build de producción (api con tsup, web standalone)
pnpm lint         # ESLint en todo el monorepo
pnpm typecheck    # TypeScript en todo el monorepo
pnpm db:studio    # explorar la base con Prisma Studio
pnpm db:seed      # re-sembrar datos de demostración
```

---

## Arranque con Docker (producción)

Todo levanta con un comando. Las migraciones se aplican solas al arrancar el API.

```bash
cp .env.example .env        # define al menos JWT_SECRET y las claves de Postgres/admin
docker compose up -d --build
```

- `db`  → PostgreSQL con volumen persistente (`db_data`).
- `api` → Express; aplica `prisma migrate deploy` en el arranque y **crea el administrador
  inicial** (de `SEED_ADMIN_*`) si no existe ninguno. Guarda archivos en el volumen `uploads_data`.
- `web` → Next.js en modo producción (standalone).

> En producción el sistema arranca **vacío** (sin datos de demo), listo para que la iglesia
> cargue la información real. El seed con datos ficticios (`pnpm db:seed`) es solo para
> desarrollo local.

**Despliegue en un VPS (Hostinger), paso a paso desde cero** (blindaje del servidor, Nginx,
TLS y backups): ver **[DEPLOY.md](DEPLOY.md)**.

---

## Garantías de confianza (cómo está blindado)

- **El balance se calcula, no se escribe.** Σ donaciones financieras `verified` − Σ egresos, por
  moneda. Lógica en [packages/core/src/balance.ts](packages/core/src/balance.ts).
- **Solo lo verificado es público.** Una donación declarada por el público entra `pending` y no
  mueve el balance hasta que un admin la aprueba.
- **Lo sensible nunca sale.** La API pública serializa con DTOs explícitos
  ([packages/core/src/dto.ts](packages/core/src/dto.ts)); `donorContact` y `proofUrl` no se
  incluyen. Las facturas de egreso sí son públicas; los comprobantes de donación, no.
- **Anonimato de punta a punta.** El donante puede aparecer como “Anónimo”.
- **Privacidad de imágenes.** `sharp` re-codifica a webp y elimina metadatos EXIF/GPS.
```
