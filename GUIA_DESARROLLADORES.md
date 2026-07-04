# Guía para desarrolladores — Proyecto Nehemías

> **Bienvenidos.** Este documento explica **todo** el código: la arquitectura, cada paquete, el
> modelo de datos, la API completa, las reglas de negocio, las decisiones técnicas (y por qué se
> tomaron), los “gotchas” que ya resolvimos, y un **checklist de pendientes** para terminar y
> endurecer el sistema. Está escrito para que **no necesiten preguntar nada**: si algo no está
> aquí, está en el código (y aquí te decimos dónde mirar).

**Antes de tocar nada, lean en este orden:**
1. [README.md](README.md) — qué es, cómo correrlo en local y con Docker.
2. [DEPLOY.md](DEPLOY.md) — despliegue completo en un VPS (Hostinger) desde cero: blindaje del
   servidor, Nginx, HTTPS, backups.
3. **Este documento** — para entender el código por dentro y qué falta.

---

## Tabla de contenido

1. [Contexto y filosofía del producto](#1-contexto-y-filosofía-del-producto)
2. [Arquitectura general](#2-arquitectura-general)
3. [Stack y versiones](#3-stack-y-versiones)
4. [Puesta en marcha en 15 minutos](#4-puesta-en-marcha-en-15-minutos)
5. [Estructura del monorepo, paquete por paquete](#5-estructura-del-monorepo-paquete-por-paquete)
6. [Modelo de datos (Prisma)](#6-modelo-de-datos-prisma)
7. [Reglas de negocio críticas](#7-reglas-de-negocio-críticas)
8. [Referencia completa de la API](#8-referencia-completa-de-la-api)
9. [Seguridad y privacidad — lo que NO se debe romper](#9-seguridad-y-privacidad--lo-que-no-se-debe-romper)
10. [Design system y cómo re-tematizar](#10-design-system-y-cómo-re-tematizar)
11. [Frontend (Next.js): cómo está organizado](#11-frontend-nextjs-cómo-está-organizado)
12. [Despliegue: resumen de la topología de producción](#12-despliegue-resumen-de-la-topología-de-producción)
13. [Convenciones de código y “gotchas”](#13-convenciones-de-código-y-gotchas)
14. [✅ Checklist de pendientes (QA, frontend, validaciones, Fase 2)](#14--checklist-de-pendientes)

---

## 1. Contexto y filosofía del producto

Plataforma de **gestión humanitaria y transparencia** para una iglesia que asiste a las
comunidades olvidadas tras los terremotos en Venezuela (La Guaira, Carayaca, Guarenas, Guatire,
Maracaibo).

**La idea central: el producto NO es la logística, es la CONFIANZA.** Todo existe para que un
donante pueda **auditar en tiempo real** a dónde fue cada bolívar y cada insumo, con comprobantes
y fotos. Reglas que mandan en cada decisión:

- **Transparencia total como gancho:** el público, sin login, ve cuánto entró, cuánto se gastó, el
  balance, en qué se gastó (con factura) y qué se entregó (con foto).
- **Cara pública / cara privada:** transparencia en lo financiero; privacidad en lo sensible.
  Contactos de donantes, comprobantes de donación, etc., **nunca** son públicos.
- **Solo lo verificado es público:** una donación declarada por un externo entra `pending` y **no
  afecta el balance** hasta que un admin la aprueba.
- **Trazabilidad de punta a punta:** donación → compra/recibo (con comprobante) → stock → entrega
  (con foto) → frente.
- **Para personas NO técnicas:** el equipo de la iglesia opera desde el **teléfono**, apurado en
  campo. El panel debe ser tan simple como llenar un recibo. Móvil-first de verdad.

Tengan esto presente: ante la duda entre “más features” y “más simple para un voluntario
apurado”, **elijan simplicidad**.

---

## 2. Arquitectura general

Monorepo (Turborepo + pnpm workspaces). Dos aplicaciones y cuatro paquetes compartidos:

```
┌─────────────┐     HTTP/REST      ┌─────────────┐     Prisma     ┌────────────┐
│  apps/web   │  ───────────────▶  │  apps/api   │  ───────────▶  │ PostgreSQL │
│  Next.js 15 │   (público y admin)│  Express 4  │                │            │
└─────────────┘                    └─────────────┘                └────────────┘
       │  usa                            │  usa
       ▼                                 ▼
  packages/ui                       packages/core   ◀── packages/db (cliente Prisma)
  (design system)                   (zod, balance, DTOs)
```

- **`apps/web`** sirve el sitio público (RSC, datos en tiempo real) y el panel `/admin` (cliente,
  con cookie de sesión). No habla con la base directamente: todo pasa por la API.
- **`apps/api`** es la única que toca la base. Centraliza auth, lógica contable, uploads y el
  control de acceso a archivos.
- **`packages/core`** es el “cerebro” compartido: validación (zod), cálculo de balance y, sobre
  todo, los **DTOs públicos** (la barrera que impide filtrar datos sensibles).
- **`packages/ui`** es el design system con la **única fuente de color** editable.
- **`packages/db`** es Prisma (schema + cliente + migraciones + seed).
- **`packages/config`** centraliza tsconfig / eslint / prettier.

**Por qué este corte:** la regla “lo sensible nunca sale” se cumple **por construcción** porque la
serialización pública vive en un solo lugar (`packages/core/src/dto.ts`). Si un campo no se mapea
ahí, no puede llegar al navegador.

---

## 3. Stack y versiones

| Capa | Tecnología |
|------|------------|
| Monorepo | Turborepo 2 + pnpm 10 (Node ≥ 20) |
| Web | Next.js 15 (App Router) + React 19 + Tailwind 3 (preset propio) |
| API | Express 4 (TypeScript, ESM), bundleada con tsup |
| Base de datos | PostgreSQL 16 + Prisma 6 |
| Validación | zod (compartida en `packages/core`) |
| Auth | argon2 (hash) + JWT en cookie `httpOnly` |
| Imágenes | sharp (redimensiona, convierte a webp, **borra EXIF**) |
| Contenedores | Docker + docker-compose (multi-stage) |

TypeScript **estricto** en todo el monorepo. ESLint + Prettier compartidos.

---

## 4. Puesta en marcha en 15 minutos

Requisitos: Node ≥ 20, pnpm 10, Docker (para la base) o un Postgres local.

```bash
pnpm install                       # instala todo el workspace
cp .env.example .env               # copia y edita variables (ver abajo)

docker compose up -d db            # levanta SOLO Postgres en 127.0.0.1:5432
pnpm db:generate                   # genera el cliente Prisma
pnpm db:migrate                    # aplica migraciones (crea las tablas)
pnpm db:seed                       # datos de demostración + 1 admin

pnpm dev                           # web (3000) + api (4000) en caliente
```

- Sitio: http://localhost:3000 · API: http://localhost:4000/health · Guía de estilo:
  http://localhost:3000/styleguide
- Admin: http://localhost:3000/admin/login con `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` del `.env`.

**Comandos del workspace** (desde la raíz):

| Comando | Qué hace |
|---------|----------|
| `pnpm dev` | web + api en desarrollo (Turbo) |
| `pnpm build` | build de producción (api con tsup, web standalone) |
| `pnpm lint` | ESLint en todos los proyectos |
| `pnpm typecheck` | TypeScript (`tsc --noEmit`) en todos |
| `pnpm db:migrate` | `prisma migrate dev` (crea/aplica migraciones) |
| `pnpm db:deploy` | `prisma migrate deploy` (producción, sin generar) |
| `pnpm db:seed` | siembra datos de demo |
| `pnpm db:studio` | Prisma Studio (explorar la base) |

> **Nota sobre el `.env` y Prisma:** los scripts `db:*` cargan el `.env` de la **raíz** del
> monorepo con `dotenv-cli` (porque Prisma corre dentro de `packages/db` y por defecto buscaría el
> `.env` ahí). Si crean nuevos scripts que usen `DATABASE_URL`, recuerden cargar ese `.env`.

---

## 5. Estructura del monorepo, paquete por paquete

### `packages/config`
tsconfig base (`tsconfig.base.json`, `tsconfig.nextjs.json`), config de **ESLint flat**
(`eslint.base.mjs`) y Prettier (`prettier.config.mjs`). Cada paquete extiende estos.
- ESLint usa flat config (ESLint 9) + `typescript-eslint`. `no-undef` está apagado (lo cubre TS).
- **Importante:** cada paquete declara `eslint` como devDependency directa (pnpm con linker
  aislado solo enlaza los binarios de dependencias directas).

### `packages/ui` — design system
- **`src/theme.config.ts`** → **ÚNICA fuente de color.** Para re-tematizar toda la app, editan los
  hex aquí. Ver sección 10.
- `src/css-vars.ts` → convierte el tema a variables CSS (`:root`). Hace que cambiar un hex
  re-tematice todo.
- `src/tailwind-preset.ts` → preset de Tailwind que apunta a esas variables CSS (con canales RGB
  para soportar opacidad tipo `bg-brand/10`). **Vive aquí, no en `config`, para evitar una
  dependencia circular** (config no debe depender de ui).
- `src/lib/format.ts` → `formatMoney`, `formatNumber`, `formatDate` (presentación).
- `src/components/*` → `Button`, `Field`/`Input`/`Textarea`/`Select`, `Badge` (+ `BadgeDonacion`,
  `BadgeStock`), `Card`/`SectionHeader`, `Money`, `Stat`, `ProgressBar`, `Skeleton`, `icons.tsx`
  (iconos SVG inline, sin librería externa).

### `packages/core` — lógica compartida (el “cerebro”)
- `src/currency.ts` → `Currency = "USD" | "VES"`, etiquetas.
- `src/num.ts` → `num()`/`money()` para convertir `Decimal` de Prisma a número con redondeo a 2
  decimales.
- `src/balance.ts` → **`computeBalances()`**: el balance derivado por moneda (USD y VES por
  separado, **nunca** se mezclan). También `nivelStock()` y `esUrgente()`.
- `src/validation.ts` → todos los **esquemas zod** (login, declarar donación, egreso, insumo,
  frente, entrega, captación…). Incluye `zBool()` (booleano robusto: evita que `"false"` se
  convierta en `true`, un gotcha conocido de `z.coerce.boolean()`).
- `src/dto.ts` → **los DTOs públicos/admin.** `toPublicDonation`, `toAdminDonation`,
  `toPublicExpense`, `toPublicSupply`, `toPublicFrente`, `toPublicDelivery`, `toPublicPaymentInfo`.
  **Esta es la barrera de privacidad:** la versión pública omite por construcción `donorContact` y
  `proofUrl`.

### `packages/db` — Prisma
- `prisma/schema.prisma` → modelo de datos (sección 6).
- `prisma/migrations/` → migraciones SQL. La inicial se generó **offline** con
  `prisma migrate diff` (no necesita base corriendo).
- `prisma/seed.ts` → datos de demostración realistas + admin inicial (idempotente: borra y recrea
  los datos de demo, **no** toca otros admins).
- `src/client.ts` → cliente Prisma como singleton.

### `apps/api` — Express
```
src/
  env.ts            Carga y valida variables de entorno
  app.ts            Arma la app Express (helmet, cors, cookies, rutas, errores)
  server.ts         Arranca el servidor + ensureInitialAdmin()
  bootstrap.ts      Crea el admin inicial si no existe (idempotente)
  http.ts           ApiError, asyncHandler, errorHandler (traduce zod → 422)
  auth/
    password.ts     hash/verify con argon2id
    jwt.ts          firmar/verificar el JWT de sesión
    cookies.ts      cookie httpOnly (nombre: nh_session)
    middleware.ts   requireAdmin / requireRole
  uploads/
    middleware.ts   multer en memoria (límite de tamaño y tipo)
    images.ts       sharp: webp + resize + borra EXIF; PDF se guarda tal cual
    storage.ts      abstracción de disco (categorías: invoices/proofs/deliveries)
  services/         lógica transaccional (donations, expenses, inventory,
                    deliveries, frentes, paymentInfo, transparency)
  routes/           auth.ts, public.ts, admin.ts, files.ts
```
La API se **bundlea con tsup** (inlina los paquetes `@nehemias/*`, deja externas las nativas:
`@prisma/client`, `sharp`, `argon2`).

### `apps/web` — Next.js (App Router)
```
app/
  layout.tsx              Layout raíz: fuentes (next/font) + inyecta variables de tema
  globals.css             Tailwind + estilos base + prefers-reduced-motion
  (public)/               Grupo público (con header/footer)
    layout.tsx            Chrome público (SiteHeader/SiteFooter)
    page.tsx              Home/Transparencia (el corazón)
    transparencia/        Lista de ingresos/egresos con filtros
    necesidades/          Matriz de prioridades
    entregas/             Bitácora + [id]/ detalle con galería
    donar/                Camino A (captación) + Camino B (formulario)
  admin/                  Panel (cliente, protegido por cookie)
    layout.tsx            Guardia de sesión + navegación
    login/ page.tsx
    page.tsx              Dashboard
    donaciones/ egresos/ inventario/ frentes/ entregas/ captacion/
  styleguide/ page.tsx    Design system vivo
components/               Componentes de la app (cards, balance, galerías, formularios…)
lib/
  config.ts               URLs del API + fileUrl()
  api.ts                  Fetchers de SERVIDOR (RSC, cache: no-store)
  admin-api.ts            Fetchers de CLIENTE (credentials: include) para el admin
  labels.ts               Etiquetas humanas (métodos, tipos de frente)
```

---

## 6. Modelo de datos (Prisma)

Archivo: `packages/db/prisma/schema.prisma`. **Principio: las cifras públicas se calculan, no se
escriben.** El balance siempre se deriva de transacciones verificadas.

**Enums:** `Currency(USD|VES)`, `AdminRole(admin|coordinator)`,
`DonationType(financial|in_kind)`, `DonationStatus(pending|verified|rejected)`,
`DonationMethod(pago_movil|transfer|cash|other)`, `SupplyOrigin(purchased|donated)`,
`MovementType(in|out|adjust)`.

| Modelo | Para qué | Campos sensibles (privados) |
|--------|----------|------------------------------|
| `AdminUser` | usuarios del panel | `passwordHash` (nunca sale) |
| `Donation` | donaciones (financiera/especie) | `donorContact`, `proofUrl` |
| `InKindItem` | líneas de una donación en especie | — |
| `Expense` | egresos/compras | `invoiceUrl` es **público** (auditoría) |
| `Supply` | inventario; `isUrgent` derivado | — |
| `StockMovement` | entradas/salidas de stock (trazabilidad) | — |
| `Frente` | comunidad / refugio / desplazados | — |
| `Delivery` + `DeliveryItem` + `DeliveryPhoto` | bitácora de entregas | — |
| `PaymentInfo` | datos de captación (públicos) | — |

Relaciones clave: `Donation 1—N InKindItem`, `Supply 1—N StockMovement`,
`Frente 1—N Delivery`, `Delivery 1—N DeliveryItem / DeliveryPhoto`.

**Cómo crear una migración nueva** (tras cambiar el schema):
```bash
# Con la base corriendo:
pnpm db:migrate            # te pedirá un nombre; genera el SQL en prisma/migrations/
# Sin base (offline), para generar el SQL a mano:
cd packages/db && pnpm exec prisma migrate diff \
  --from-schema-datasource prisma/schema.prisma \
  --to-schema-datamodel prisma/schema.prisma --script
```

---

## 7. Reglas de negocio críticas

Todas viven en `packages/core` y `apps/api/src/services`. **No las repliquen en el frontend.**

1. **Balance público = Σ donaciones financieras `verified` − Σ egresos, por moneda.**
   `computeBalances()` en `packages/core/src/balance.ts`. Se calcula al vuelo en
   `services/transparency.ts`. **Nunca** hay un campo “balance” en la base.
2. **USD y VES no se mezclan jamás.** Son dos balances independientes.
3. **Donación declarada por el público → `pending`** y no afecta el balance. Solo al **verificar**
   (admin) pasa a `verified` y cuenta. Ver `services/donations.ts`.
4. **Verificar una donación `in_kind`** crea/actualiza el `Supply` y registra `StockMovement(in)`
   (`applyStockIn`). Enlaza el ítem al insumo para mantener trazabilidad.
5. **Egreso con `createsStock=true`** alimenta inventario como `purchased`.
6. **Una `Delivery`** descuenta stock por cada ítem enlazado a un insumo (`applyStockOut`,
   `StockMovement(out)`).
7. **Tras cualquier movimiento de stock** se recalcula `isUrgent = currentStock < minThreshold`
   (`recalcUrgent`). “Urgente” es **derivado**, no se escribe a mano.

Todas las operaciones que mueven dinero o stock usan **transacciones de Prisma** (`$transaction`)
para que no queden estados a medias.

---

## 8. Referencia completa de la API

Base local: `http://localhost:4000`. Respuestas en JSON. Errores de validación → **422** con
`{ error, fields }`. Otros errores → `{ error }` con el código adecuado.

### Salud
- `GET /health` → `{ ok: true, service }`

### Autenticación (`/auth`)
| Método | Ruta | Cuerpo | Auth | Devuelve |
|--------|------|--------|------|----------|
| POST | `/auth/login` | `{ email, password }` | — | `{ admin }` + cookie `nh_session` |
| POST | `/auth/logout` | — | — | `{ ok }` (borra cookie) |
| GET | `/auth/me` | — | ✅ admin | `{ admin }` |

### Público — lecturas (`/public`, **solo datos verificados / no sensibles**)
| Método | Ruta | Devuelve |
|--------|------|----------|
| GET | `/public/home` | snapshot: `balances`, `urgentes`, `ultimasDonaciones`, `ultimosEgresos`, `ultimasEntregas`, `captacion` |
| GET | `/public/balances` | `{ balances: CurrencyBalance[] }` |
| GET | `/public/donaciones` | donaciones **verificadas** (públicas) |
| GET | `/public/egresos` | egresos (con `invoiceUrl` público) |
| GET | `/public/insumos` | inventario completo |
| GET | `/public/necesidades` | solo insumos urgentes |
| GET | `/public/frentes` | frentes |
| GET | `/public/entregas` | bitácora |
| GET | `/public/entregas/:id` | detalle de una entrega |
| GET | `/public/captacion` | datos de captación activos |

### Público — escritura
| Método | Ruta | Cuerpo | Notas |
|--------|------|--------|-------|
| POST | `/public/donaciones` | multipart: campos de `declareDonationSchema` + archivo `proof` | **Rate-limited** (10 / 15 min). Entra como `pending`. No devuelve datos sensibles. |

### Admin (`/admin`, **todo requiere sesión admin**)
| Método | Ruta | Notas |
|--------|------|-------|
| GET | `/admin/donaciones?status=pending\|verified\|rejected` | incluye datos privados (solo admin) |
| POST | `/admin/donaciones` | multipart (`proof`). `markVerified` decide si queda verificada |
| POST | `/admin/donaciones/:id/revisar` | `{ action: "verify" \| "reject" }` |
| GET | `/admin/egresos` | |
| POST | `/admin/egresos` | multipart (`invoice`). `createsStock` + campos `stock*` alimentan inventario |
| GET | `/admin/insumos` | |
| POST | `/admin/insumos` | crear insumo |
| PATCH | `/admin/insumos/:id` | actualizar stock/umbral (recalcula urgencia) |
| GET / POST | `/admin/frentes` | |
| PUT | `/admin/frentes/:id` | |
| GET | `/admin/entregas` | |
| POST | `/admin/entregas` | multipart: `photos[]` + `items` (JSON). Descuenta stock |
| GET / POST | `/admin/captacion` | |
| PUT / DELETE | `/admin/captacion/:id` | |

### Archivos (`/files/:category/:filename`)
- `invoices` y `deliveries` → **públicos**.
- `proofs` (comprobantes de donación) → **privados**: requieren sesión admin (403 si no).
- Lógica en `apps/api/src/routes/files.ts` + `uploads/storage.ts`.

---

## 9. Seguridad y privacidad — lo que NO se debe romper

Esto es el alma del producto. **Cualquier cambio que toque estos puntos debe revisarse con lupa.**

- **DTOs públicos como única salida.** La API pública nunca serializa entidades de Prisma
  directamente; siempre pasa por `toPublic*()` en `packages/core/src/dto.ts`. Si agregan un campo
  sensible al schema, **no** lo agreguen al DTO público.
- **Comprobante de donación = privado / factura de egreso = pública.** El control está por
  **categoría** en `uploads/storage.ts` (`PUBLIC_CATEGORIES`) y se aplica en `routes/files.ts`.
- **sharp borra metadatos EXIF/GPS** al re-codificar a webp (no se filtra la ubicación del
  teléfono). No llamen `.withMetadata()`.
- **Auth admin:** argon2id para el hash, JWT en cookie `httpOnly` (`Secure` en producción,
  `SameSite=lax`), middleware `requireAdmin` en todas las rutas `/admin`. Ese mismo middleware
  exige que `Origin`/`Referer` coincida con `WEB_ORIGIN` en cualquier método mutante autenticado
  por cookie (protección CSRF); los clientes con `Authorization: Bearer` quedan exentos porque no
  dependen del navegador para adjuntar credenciales.
- **Rate limiting** en el endpoint público de escritura (`express-rate-limit`).
- **Validación zod estricta** en cada entrada + límite de tamaño/tipo en uploads (`multer`).
- **Helmet** con `crossOriginResourcePolicy: cross-origin` (para que el sitio pueda incrustar
  imágenes servidas por la API) y **CORS** con `credentials: true` restringido a `WEB_ORIGIN`.
- **Anonimato:** si `isAnonymous`, el nombre del donante se reemplaza por “Anónimo” en
  `donorDisplay()`; el contacto nunca sale.

> ✅ **Resuelto:** `requireAdmin` (`apps/api/src/auth/middleware.ts`) verifica `Origin`/`Referer`
> contra `WEB_ORIGIN` en toda petición mutante autenticada por cookie, rechazando con 403 si no
> coincide (protección CSRF).

---

## 10. Design system y cómo re-tematizar

**Para cambiar la marca/colores de TODA la plataforma, editen un solo archivo:**
`packages/ui/src/theme.config.ts`. Cambien los hex de `theme.colors` y listo — esos valores
alimentan tanto las variables CSS (`:root`, vía `themeToCssVars()` inyectado en
`apps/web/app/layout.tsx`) como el preset de Tailwind.

- Base **blanca**, **sin modo oscuro** (decisión del cliente; no agreguen theming dual).
- Un solo **acento institucional** (`brand`, verde de reconstrucción). `warning`/`danger`
  (ámbar/rojo) se reservan **solo** para alertas de stock y donación rechazada.
- Tipografía: Inter (UI/datos) + Newsreader (serif para titulares), con cifras **tabulares** para
  que los montos alineen. Se cargan con `next/font` (auto-hospedadas, sin requests externos).
- La página `/styleguide` muestra paleta, tipografía, botones, inputs, estados y las tarjetas de
  transacción/insumo. **Úsenla como referencia y manténganla actualizada** al crear componentes.
- Accesibilidad: foco visible, `prefers-reduced-motion`, estados con color **+ texto + forma**
  (no solo color), objetivos de toque ≥ 48px, tipografía base ≥ 16px.

---

## 11. Frontend (Next.js): cómo está organizado

- **Páginas públicas = React Server Components** que llaman a la API con `lib/api.ts`
  (`cache: "no-store"` → transparencia en tiempo real). Usan `API_INTERNAL_URL` (red interna en
  Docker).
- **Panel admin = componentes de cliente.** La cookie de sesión la pone la API (otro origen), así
  que el panel hace `fetch` con `credentials: "include"` vía `lib/admin-api.ts` usando
  `NEXT_PUBLIC_API_URL`. El `app/admin/layout.tsx` es una **guardia de sesión** que llama a
  `/auth/me` y redirige a `/admin/login` si no hay sesión.
- **Imágenes:** se usan `<img>` simples (no `next/image`) para las galerías; las fotos reales ya
  vienen optimizadas por sharp. `fileUrl()` resuelve rutas relativas (`deliveries/x.webp`) contra
  la API, y deja pasar URLs absolutas (las del seed de demo).
- **Variable importante en build:** `NEXT_PUBLIC_API_URL` se **incrusta en el bundle del
  navegador en tiempo de build**. Si cambia, hay que **reconstruir** la web (`docker compose up -d
  --build web`).

---

## 12. Despliegue: resumen de la topología de producción

El detalle paso a paso está en [DEPLOY.md](DEPLOY.md). Resumen:

- `docker compose up -d --build` levanta `db`, `api`, `web`. Los puertos de `api` (4000) y `web`
  (3000) se publican **solo en 127.0.0.1**; **Nginx** (en el host) hace de proxy inverso y termina
  el TLS (Let's Encrypt/Certbot).
- Dominios sugeridos: `midominio.org` → web, `api.midominio.org` → api. La cookie se comparte con
  `COOKIE_DOMAIN=.midominio.org`.
- Las **migraciones se aplican solas** al arrancar el API (`prisma migrate deploy` en
  `apps/api/docker-entrypoint.sh`), y el **admin inicial se crea solo** (`bootstrap.ts`, con
  `SEED_ADMIN_*`). En producción el sistema arranca **vacío** (sin datos de demo).
- Archivos subidos → volumen `uploads_data`. Base → volumen `db_data`. **Backups** con cron (ver
  DEPLOY.md, Paso 7).
- Variables de entorno: todas documentadas en `.env.example`.

---

## 13. Convenciones de código y “gotchas”

Cosas que **ya resolvimos** y conviene que conozcan para no repetir errores:

- **ESM con extensiones `.js`:** en `packages/*` y `apps/api` (NodeNext) los imports relativos
  llevan `.js` aunque el archivo sea `.ts`. En `apps/web` (webpack) los imports relativos van
  **sin extensión**; `next.config.mjs` mapea `.js → .ts/.tsx` (`extensionAlias`) para que los `.js`
  de los paquetes resuelvan.
- **`noUncheckedIndexedAccess`** está activo en los paquetes (lógica pura) pero **apagado en las
  apps** (Express/Next acceden mucho por índice a `params`/`query`).
- **pnpm + dependencias nativas:** `package.json` raíz declara `pnpm.onlyBuiltDependencies`
  (prisma, argon2, sharp, esbuild) para permitir sus scripts de build. Tras `pnpm install`, si
  agregan una nativa, quizá deban añadirla ahí.
- **Prisma y el `.env`:** los scripts `db:*` cargan el `.env` de la raíz con `dotenv-cli` (Prisma
  corre en `packages/db`). El cliente Prisma se genera en `node_modules` (default).
- **`z.coerce.boolean()` es traicionero** (`"false"` → `true`). Usamos `zBool()` en
  `packages/core/src/validation.ts`. Úsenlo para cualquier booleano que venga de un formulario.
- **`Decimal` de Prisma** se serializa como **string** en JSON. Por eso `packages/core/src/num.ts`
  normaliza con `num()`/`money()`. En el admin, algunos listados traen montos como string: hagan
  `Number(...)`.
- **Tailwind preset en `ui`, no en `config`** (evita dependencia circular).
- **El warning `package.json#prisma` deprecado** es benigno; migrar a `prisma.config.ts` es un
  pendiente menor.

---

## 14. ✅ Checklist de pendientes

Lo que está hecho funciona de punta a punta (typecheck, lint, build y un E2E manual: declarar →
verificar → balance sube → egreso con factura → entrega con foto → todo visible; privacidad y
anonimato verificados). El proyecto ya está **en producción** en un VPS. Esta lista está
reordenada por prioridad real (de mayor a menor riesgo/impacto) y con lo ya construido marcado.
Revisada y verificada contra el código el 2026-07-03.

### ✅ Ya hecho (verificado en código, no repetir)
- [x] **Paginación** en listados de donaciones/egresos/galería (`paginationQuerySchema` en
      `packages/core/src/validation.ts`, usado por `admin`/`public` routers).
- [x] **Filtros de transparencia por rango de fechas** (`dateRangeSchema` mergeado en
      `donationQuerySchema` y `expenseQuerySchema`), además de por tipo/categoría/moneda.
- [x] **Galería de entregas con lightbox/zoom** (`components/gallery-view.tsx`).
- [x] **Metadatos básicos** (`title`/`description` en `apps/web/app/layout.tsx`) — falta OG
      images y favicon (ver pendiente abajo).
- [x] **Healthcheck de servicios** ya definido en `docker-compose.yml`.
- [x] **Sincronización con Google Sheets** (botón manual en el panel, `POST /admin/sync-sheets`,
      lógica en `apps/api/src/services/sheets.ts`) — funciona, pero ver nota de seguridad abajo:
      hoy borra y recrea todas las donaciones financieras/egresos en cada sync (no hace upsert),
      lo cual es un riesgo si se automatiza sin cambiarlo primero.

### P1 — Seguridad crítica (antes de tocar cualquier otra cosa)
- [ ] **CSRF**: la cookie de sesión admin usa `SameSite=lax` sin verificación de origen. Añadir
      chequeo de header `Origin`/`Referer` en rutas mutantes de `/admin`, o migrar a
      `SameSite=strict`. Ver nota en la sección 9.
- [ ] **Hacer segura la sincronización con Google Sheets** antes de automatizarla: cambiar de
      "borrar todo y recrear" a upsert por referencia estable, y evitar sync concurrente.
- [ ] **Gestión de administradores desde el panel** (hoy solo se crea por seed/bootstrap):
      crear/desactivar admins, cambio y reseteo de contraseña, política de contraseñas.
- [ ] **Auditoría/log** de acciones admin (quién verificó/rechazó/registró/sincronizó qué y
      cuándo) — especialmente importante porque el sync de Sheets borra datos.
- [ ] **Cabeceras CSP** explícitas y endurecidas (hoy Helmet corre con la config por defecto, sin
      `Content-Security-Policy` a medida).
- [ ] **Rotación de `JWT_SECRET`** y expiración/refresh de sesión.

### P2 — Calidad / CI (red de seguridad para todo lo demás)
- [ ] **Pruebas automatizadas** (hoy NO hay ni un test en el repo):
  - Unit de `packages/core`: `computeBalances` (casos USD/VES, negativos, vacíos), `nivelStock`,
    `donorDisplay`, los DTOs (asegurar que NO incluyen campos privados).
  - Integración de la API (supertest): flujo `pending → verify → balance`, control de acceso a
    `/files`, rate limiting, 422 de validación.
  - E2E con Playwright de los caminos públicos y del panel.
- [ ] **CI en GitHub Actions**: lint + typecheck + build + tests en cada push/PR.
- [ ] **QA funcional completo** en móvil real (iOS y Android, conexión lenta): donar (camino A y
      B), verificar, egreso, inventario, frentes, entregas.
- [ ] **Revisión de accesibilidad (AA):** contraste, foco, navegación por teclado, lectores de
      pantalla, `alt` reales en fotos.
- [ ] **Estados de carga y error** consistentes en todas las vistas (skeletons, mensajes humanos).

### P3 — Infraestructura / operación
- [ ] **Pipeline de despliegue (CD)**: automatizar `git pull` + rebuild en el VPS vía GitHub
      Actions (gateado por que CI pase), en vez del proceso manual actual.
- [ ] **Automatizar la sincronización con Google Sheets** (cron cada 15–30 min como primera
      opción; webhook vía Google Apps Script solo si se necesita tiempo real) — depende de
      resolver primero el punto de seguridad en P1.
- [ ] **Respaldos fuera del servidor** (hoy los backups viven en el mismo VPS que respaldan) +
      **probar la restauración** de un backup real (no solo crearlo).
- [ ] **Monitoreo de errores** (Sentry o similar) en api y web + **logs centralizados**.
- [ ] **Verificar el build de Docker en el VPS** en limpio (el `pnpm deploy` del Dockerfile del
      API + regeneración del cliente Prisma), siguiendo DEPLOY.md paso a paso.
- [ ] Migrar la config de Prisma a **`prisma.config.ts`** (quita el warning de deprecación).
- [ ] **Almacenamiento de archivos:** hoy es disco (volumen Docker). Si crece, migrar a S3/R2
      (la interfaz en `uploads/storage.ts` ya está pensada para eso).

### P4 — Validaciones (server y cliente)
- [ ] **Validar montos** con rigor: normalizar coma vs punto en el cliente antes de enviar (en
      VES el usuario escribe “1.234,56”); el server ya valida `> 0` con zod, falta la máscara del
      lado cliente.
- [ ] **Validar formatos venezolanos** donde aplique: teléfono, RIF/cédula (en captación).
- [ ] **Límite de fechas** (no permitir fechas futuras absurdas en donaciones/egresos).
- [ ] **Revisar tamaño/cantidad de fotos** en entregas (hoy multer: 12 archivos, 8 MB c/u) y dar
      feedback claro al exceder.
- [ ] **Mensajes de error de la API** mapeados a textos amables en el cliente (hoy parcial).

### P5 — Frontend / UX (pulir)
- [ ] **Favicon y OpenGraph images** completos para compartir en redes (hoy solo hay
      `title`/`description`).
- [ ] **Página 404/500 personalizada** y `loading.tsx`/`error.tsx` por ruta (hoy no existen).
- [ ] **Compresión de imágenes en el cliente** antes de subir (mejora en conexión lenta).
- [ ] **Microinteracciones**: contador del balance que anima al subir, transición al verificar.
- [ ] **Revisar que quede contenido 100% real** (no de demo): nombre exacto de la iglesia, logo,
      datos de captación reales (pago móvil, cuentas), textos — los colores de marca en
      `packages/ui/src/theme.config.ts` ya parecen personalizados, confirmar con el cliente.

### P6 — Notificaciones (mejora de confianza, opcional)
- [ ] **Notificaciones por correo/WhatsApp** al donante cuando su donación se verifica.
- [ ] **Afinar rate limiting** y considerar protección anti-bot en el formulario público.

### P7 — Fase 2 (preparada, NO construida — del plan original)
- [ ] **Módulo de beneficiarios individuales** (personas/familias con necesidades críticas en
      refugios), respetando privacidad (cédulas/datos nunca públicos).
- [ ] **Reportes exportables** (PDF/Excel de transparencia por período).
- [ ] **Multi-moneda avanzada** (tasas, histórico, quizá conversión opcional para visualización —
      manteniendo la honestidad del doble balance).

---

### Contacto y dudas
Todo lo necesario está en el código y en estos tres documentos
([README.md](README.md), [DEPLOY.md](DEPLOY.md) y esta guía). El código de dominio está nombrado en
**español** (donación, egreso, insumo, frente, entrega) para que sea fácil de seguir. Cuando algo
no esté documentado, el lugar canónico de la verdad es: **el schema de Prisma** (datos), **`packages/core`**
(reglas) y **`apps/api/src/routes`** (contrato de la API).

¡Gracias por continuar este proyecto! Lo que construyan le llega, de verdad, a quien más lo necesita.
