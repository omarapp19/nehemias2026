# Mapa interactivo de puntos de ayuda + panel admin

## Problem

Tras el terremoto (Higuerote–Tucacas), personas particulares y organizaciones ofrecen ayuda en distintos puntos del área afectada. Hoy no hay forma de mostrar esto en el sitio ni de gestionarlo desde el admin. Se necesita:

1. Un mapa en el Home público con la zona de mayor impacto marcada y marcadores clicables (persona / organización) con popup de contacto.
2. Una vista de admin para crear puntos haciendo clic en el mapa, editar la traza de impacto, y listar/eliminar puntos.

No hay librería de mapas ni API key de mapas en el proyecto (`.env.example` confirmado). Se usa **Leaflet + OpenStreetMap** (gratis, sin key).

## 1. Modelo de datos (`packages/db/prisma/schema.prisma`)

```prisma
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

A diferencia de `Donation.donorContact` (privado), aquí el contacto es intencionalmente público: es el dato que el visitante necesita para comunicarse con quien ofrece ayuda. Por eso no hay split DTO público/admin como en donaciones — un solo shape, el endpoint público solo filtra `isActive: true`.

**Traza de impacto** (línea roja del mockup): no requiere modelo nuevo. Se reutiliza `SystemSetting` (ya existe, ya expuesto en `GET /settings`), con la clave `impact_zone_coords` = JSON string de `[[lat, lng], ...]` en orden. El admin la edita clicando puntos en el mapa (ver sección 4); se guarda como un valor más vía `PUT /admin/settings`.

Migración: `pnpm db:generate` + `pnpm db:migrate` (nueva migración `add_help_point`).

## 2. Backend

### `packages/core`

- `dto.ts`: agregar `HelpPointRow`, `PublicHelpPoint`, `toPublicHelpPoint` (mapea Decimal→number para lat/lng vía `num()`, igual patrón que `toPublicFrente`).
- `validation.ts`: agregar
  - `helpPointSchema`: `name` (string, min 1), `type` (`z.enum(["person","organization"])`), `description` (string, min 1), `contactPhone` (string opcional), `contactEmail` (string opcional, `.email()` si presente), `lat` (`z.number().min(-90).max(90)`), `lng` (`z.number().min(-180).max(180)`), `isActive` (boolean, default `true`).
  - `helpPointUpdateSchema`: `helpPointSchema.partial()`.

### `apps/api/src/services/helpPoints.ts` (nuevo)

Patrón igual a `paymentInfo.ts`:
- `listActiveHelpPoints()` → `prisma.helpPoint.findMany({ where: { isActive: true } })`
- `listAllHelpPoints()` → todos, para admin
- `createHelpPoint(data)`, `updateHelpPoint(id, data)`, `deleteHelpPoint(id)`

### Rutas públicas (`apps/api/src/routes/public.ts`)

```
GET /puntos-ayuda  → { puntosAyuda: PublicHelpPoint[] }  (solo isActive)
```

`GET /home` se extiende para incluir `puntosAyuda` en la misma respuesta (evita un round-trip extra en el Home), reusando `listActiveHelpPoints`. `GET /settings` ya devuelve `impact_zone_coords` sin cambios (es solo otra key).

### Rutas admin (`apps/api/src/routes/admin.ts`, bajo `requireAdmin`)

```
GET    /admin/puntos-ayuda        → todos los puntos
POST   /admin/puntos-ayuda        → crear (helpPointSchema)
PUT    /admin/puntos-ayuda/:id    → actualizar (helpPointUpdateSchema)
DELETE /admin/puntos-ayuda/:id    → eliminar
```

Patrón idéntico a la sección `/captacion` existente.

`PUT /admin/settings` (línea ~297 de `admin.ts`) hoy solo acepta `contact_phone/email/sede` explícitos — se extiende con una línea más:
```ts
if (typeof impact_zone_coords === "string") await updateSetting("impact_zone_coords", impact_zone_coords);
```

## 3. Mapa público (Home)

- Dependencias nuevas en `apps/web`: `leaflet`, `react-leaflet`, `@types/leaflet` (dev).
- Nuevo componente `apps/web/components/impact-map.tsx`, `"use client"`, importado en `page.tsx` vía `next/dynamic` con `ssr: false` (Leaflet requiere `window`).
- Tile layer OpenStreetMap estándar.
- Polyline roja gruesa: coordenadas desde `impact_zone_coords` (parseado de settings); si no existe aún en DB, fallback a un array de ejemplo hardcodeado en el componente (traza indicativa Higuerote↔Tucacas) para que el mapa nunca se vea vacío.
- Marcadores: ícono SVG distinto por `type` (persona vs organización) usando `L.divIcon` (sin depender de los PNG default de Leaflet, que rompen con bundlers).
- Click en marcador → `Popup` de `react-leaflet` con nombre, descripción, teléfono (`<a href="tel:...">`) y email (`<a href="mailto:...">`) si existen.
- Nueva sección en `apps/web/app/(public)/page.tsx`, entre "Necesidades urgentes" y "Movimientos recientes", usando `data.puntosAyuda` del `HomeSnapshot` extendido (`lib/api.ts`).

## 4. Panel admin

Nueva ruta `apps/web/app/admin/mapa-ayuda/page.tsx` + link en el nav del layout admin (`apps/web/app/admin/layout.tsx`).

- Mapa Leaflet con `useMapEvents({ click })`.
- Dos modos, con un toggle simple (`estado: "puntos" | "traza"`):
  - **Modo puntos** (default): click en el mapa captura `{lat, lng}` y abre modal (mismo patrón `createPortal` que `admin/captacion/page.tsx`) con formulario: Nombre (`Input`), Tipo (`Select`: Persona/Organización), Descripción (`Textarea`), Teléfono (`Input` opcional), Email (`Input` opcional), Activo (checkbox). Submit → `apiCrearPuntoAyuda`.
  - **Modo traza**: click en el mapa agrega un punto al array de la polyline en edición (mostrado en vivo sobre el mapa); botones "Deshacer último punto", "Limpiar", "Guardar traza" → `apiActualizarSettings({ impact_zone_coords: JSON.stringify(puntos) })`.
- Debajo del mapa: tabla/lista de puntos existentes (nombre, tipo, activo/inactivo) con botón "Eliminar" + confirmación inline (mismo patrón que `admin/galeria/page.tsx`: `confirmDeleteId` + Sí/No).
- `apps/web/lib/admin-api.ts`: agregar `apiPuntosAyuda`, `apiCrearPuntoAyuda`, `apiActualizarPuntoAyuda`, `apiEliminarPuntoAyuda`.

## 5. Testing

- `apps/api/test/help-points.test.ts` (patrón `donations.test.ts`): crear punto, listar público solo trae `isActive: true`, actualizar, eliminar; validación rechaza `type` inválido y coordenadas fuera de rango.
- Verificación manual en navegador: mapa público carga con traza + marcadores; flujo admin click→formulario→guardar→aparece marcador; eliminar punto lo quita del mapa público; editar traza y verificar que se refleja en el Home.

## Out of scope

- Traza de impacto no se modela como tabla dedicada — vive en `SystemSetting` como JSON, consistente con `contact_phone`/etc. Si más adelante necesita versionado o múltiples zonas, se revisita.
- Sin drag-to-reorder de puntos de la traza (deshacer/limpiar es suficiente para el caso de uso).
- Sin geocoding/búsqueda de direcciones — solo clic directo en el mapa.
- Sin roles/permisos diferenciados dentro de admin (ya existe `requireAdmin` global, igual que el resto del panel).
