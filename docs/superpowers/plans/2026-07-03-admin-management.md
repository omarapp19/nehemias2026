# Gestión de administradores desde el panel — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an `admin`-role user create, deactivate/reactivate, and reset passwords for other `AdminUser` rows from the panel, plus let any admin change their own password — all currently only possible via seed/bootstrap.

**Architecture:** Follow the existing feature-slice pattern used by "Captación" (payment methods): zod schemas in `packages/core`, a thin service module in `apps/api/src/services`, routes appended to the existing `adminRouter` (new `// ---------- ADMINS ----------` section) guarded by `requireRole("admin")`, a matching `apps/web/lib/admin-api.ts` client section, and a new `apps/web/app/admin/administradores` page mirroring `apps/web/app/admin/captacion/page.tsx`'s list+modal-form structure.

**Tech Stack:** Express 4 + zod + Prisma (Postgres) on the API; Next.js App Router client components + `@nehemias/ui` design-system components on the web app; argon2 for password hashing (already in place, reused as-is).

## Global Constraints

- Only `role: "admin"` may manage other admins — enforce with `requireRole("admin")` (`apps/api/src/auth/middleware.ts:18`), not plain `requireAdmin`.
- Password minimum length: 8 characters, no complexity requirement, applied identically to create/reset/self-change.
- Deactivation is soft (`AdminUser.isActive = false`); no hard-delete endpoint.
- An admin cannot deactivate themselves; the last remaining `isActive: true` admin cannot be deactivated.
- Login already rejects inactive admins with the generic "Correo o contraseña incorrectos." message (`apps/api/src/routes/auth.ts:18`) — no change needed there.
- No Prisma schema/migration changes — `AdminUser.isActive` and `AdminUser.role` already exist (`packages/db/prisma/schema.prisma:24-37`).
- This repo has no test runner configured (no vitest/jest, no existing `*.test.ts` files anywhere). Follow the codebase's existing convention: no automated test task is added. Each task instead ends with an explicit manual verification step (curl for API tasks, browser click-through for UI tasks) that must be run and confirmed before moving on.
- All user-facing strings are Spanish, matching existing copy style (see `apps/api/src/routes/auth.ts:19`, `apps/web/app/admin/captacion/page.tsx`).

---

### Task 1: Add password policy and admin-management validation schemas

**Files:**
- Modify: `packages/core/src/validation.ts` (append near `loginSchema`, after line 34)

**Interfaces:**
- Produces: `passwordPolicySchema: z.ZodString`, `createAdminSchema: z.ZodType<CreateAdminInput>`, `resetPasswordSchema: z.ZodType<ResetPasswordInput>`, `changePasswordSchema: z.ZodType<ChangePasswordInput>`, `adminRoleEnum: z.ZodEnum<["admin", "coordinator"]>` — consumed by Task 3 (service), Task 4 (routes), Task 5 (self-change route).

- [ ] **Step 1: Add the schemas**

Insert immediately after `loginSchema` (after line 34) in `packages/core/src/validation.ts`:

```typescript
// — Gestión de administradores —
export const adminRoleEnum = z.enum(["admin", "coordinator"], {
  errorMap: () => ({ message: "Elige un rol válido (admin o coordinador)." }),
});

export const passwordPolicySchema = z
  .string()
  .min(8, "La contraseña debe tener al menos 8 caracteres.");

export const createAdminSchema = z.object({
  email: z.string().email("Escribe un correo válido."),
  name: z.string().min(2, "Escribe el nombre del administrador."),
  role: adminRoleEnum,
  password: passwordPolicySchema,
});
export type CreateAdminInput = z.infer<typeof createAdminSchema>;

export const resetPasswordSchema = z.object({
  password: passwordPolicySchema,
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Escribe tu contraseña actual."),
  newPassword: passwordPolicySchema,
});
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
```

- [ ] **Step 2: Verify it compiles**

Run: `cd packages/core && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/validation.ts
git commit -m "feat(core): add admin management and password policy schemas"
```

---

### Task 2: Add IconUsers icon

**Files:**
- Modify: `packages/ui/src/components/icons.tsx` (append after `IconPlus`, line 153)

**Interfaces:**
- Produces: `IconUsers` component (same `IconProps` signature as every other icon in the file) — consumed by Task 8 (web nav entry + page header).

- [ ] **Step 1: Add the icon**

Append after the `IconPlus` export (line 153) in `packages/ui/src/components/icons.tsx`:

```tsx
export const IconUsers = (p: IconProps) => (
  <Svg {...p}>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </Svg>
);
```

- [ ] **Step 2: Verify it compiles**

Run: `cd packages/ui && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add packages/ui/src/components/icons.tsx
git commit -m "feat(ui): add IconUsers icon"
```

---

### Task 3: Admin management service with guardrails

**Files:**
- Create: `apps/api/src/services/admins.ts`

**Interfaces:**
- Consumes: `prisma.adminUser` (Prisma Client, model at `packages/db/prisma/schema.prisma:24-32`), `hashPassword(plain: string): Promise<string>` and `verifyPassword(hash: string, plain: string): Promise<boolean>` from `../auth/password.js`, `ApiError` from `../http.js`, `CreateAdminInput` from `@nehemias/core`.
- Produces (consumed by Task 4 routes and Task 5 route):
  - `listAdmins(): Promise<AdminSummary[]>` where `AdminSummary = { id: string; email: string; name: string; role: "admin" | "coordinator"; isActive: boolean; createdAt: Date }` (no `passwordHash`).
  - `createAdmin(input: CreateAdminInput): Promise<AdminSummary>`
  - `deactivateAdmin(targetId: string, actingAdminId: string): Promise<AdminSummary>` — throws `ApiError(400, "No puedes desactivar tu propia cuenta.")` if `targetId === actingAdminId`; throws `ApiError(400, "No puedes desactivar al último administrador activo.")` if target is the sole active admin.
  - `reactivateAdmin(targetId: string): Promise<AdminSummary>`
  - `resetAdminPassword(targetId: string, newPassword: string): Promise<void>`
  - `changeOwnPassword(adminId: string, currentPassword: string, newPassword: string): Promise<void>` — throws `ApiError(400, "Contraseña actual incorrecta.")` on mismatch.

- [ ] **Step 1: Write the service**

Create `apps/api/src/services/admins.ts`:

```typescript
import { prisma } from "@nehemias/db";
import type { CreateAdminInput } from "@nehemias/core";
import { ApiError } from "../http.js";
import { hashPassword, verifyPassword } from "../auth/password.js";

export interface AdminSummary {
  id: string;
  email: string;
  name: string;
  role: "admin" | "coordinator";
  isActive: boolean;
  createdAt: Date;
}

const SUMMARY_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  isActive: true,
  createdAt: true,
} as const;

export function listAdmins(): Promise<AdminSummary[]> {
  return prisma.adminUser.findMany({
    select: SUMMARY_SELECT,
    orderBy: { createdAt: "asc" },
  });
}

export async function createAdmin(input: CreateAdminInput): Promise<AdminSummary> {
  const passwordHash = await hashPassword(input.password);
  try {
    return await prisma.adminUser.create({
      data: {
        email: input.email,
        name: input.name,
        role: input.role,
        passwordHash,
      },
      select: SUMMARY_SELECT,
    });
  } catch (err) {
    if (isUniqueConstraintError(err)) {
      throw new ApiError(400, "Ya existe un administrador con ese correo.");
    }
    throw err;
  }
}

export async function deactivateAdmin(
  targetId: string,
  actingAdminId: string,
): Promise<AdminSummary> {
  if (targetId === actingAdminId) {
    throw new ApiError(400, "No puedes desactivar tu propia cuenta.");
  }
  const target = await prisma.adminUser.findUnique({ where: { id: targetId } });
  if (!target) throw new ApiError(404, "Administrador no encontrado.");
  if (target.isActive) {
    const activeCount = await prisma.adminUser.count({ where: { isActive: true } });
    if (activeCount <= 1) {
      throw new ApiError(400, "No puedes desactivar al último administrador activo.");
    }
  }
  return prisma.adminUser.update({
    where: { id: targetId },
    data: { isActive: false },
    select: SUMMARY_SELECT,
  });
}

export function reactivateAdmin(targetId: string): Promise<AdminSummary> {
  return prisma.adminUser.update({
    where: { id: targetId },
    data: { isActive: true },
    select: SUMMARY_SELECT,
  });
}

export async function resetAdminPassword(targetId: string, newPassword: string): Promise<void> {
  const passwordHash = await hashPassword(newPassword);
  await prisma.adminUser.update({ where: { id: targetId }, data: { passwordHash } });
}

export async function changeOwnPassword(
  adminId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const admin = await prisma.adminUser.findUnique({ where: { id: adminId } });
  if (!admin) throw new ApiError(404, "Administrador no encontrado.");
  const ok = await verifyPassword(admin.passwordHash, currentPassword);
  if (!ok) throw new ApiError(400, "Contraseña actual incorrecta.");
  const passwordHash = await hashPassword(newPassword);
  await prisma.adminUser.update({ where: { id: adminId }, data: { passwordHash } });
}

function isUniqueConstraintError(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && (err as { code: unknown }).code === "P2002";
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd apps/api && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/services/admins.ts
git commit -m "feat(api): add admin management service with deactivation guardrails"
```

---

### Task 4: Admin management routes

**Files:**
- Modify: `apps/api/src/routes/admin.ts`

**Interfaces:**
- Consumes: everything produced by Task 1 (`createAdminSchema`, `resetPasswordSchema`) and Task 3 (`listAdmins`, `createAdmin`, `deactivateAdmin`, `reactivateAdmin`, `resetAdminPassword`), plus existing `requireRole` from `../auth/middleware.js` (`apps/api/src/auth/middleware.ts:18`) and `adminId(req)` helper already defined at `apps/api/src/routes/admin.ts:62-65`.
- Produces: `GET/POST /admin/admins`, `PATCH /admin/admins/:id/deactivate`, `PATCH /admin/admins/:id/reactivate`, `POST /admin/admins/:id/reset-password` — consumed by Task 6 (web API client).

- [ ] **Step 1: Add imports**

In `apps/api/src/routes/admin.ts`, extend the `@nehemias/core` import (lines 2-15) to add `createAdminSchema, resetPasswordSchema,`, and add a new import line after line 21 (`requireAdmin` import):

```typescript
import { requireAdmin, requireRole } from "../auth/middleware.js";
import {
  listAdmins,
  createAdmin,
  deactivateAdmin,
  reactivateAdmin,
  resetAdminPassword,
} from "../services/admins.js";
```

(Replace the existing single-name `requireAdmin` import at line 21 with the two-name version above.)

- [ ] **Step 2: Add the ADMINS route section**

Append after the `// ---------- SINCRONIZACIÓN GOOGLE SHEETS ----------` section (end of file, after line 325):

```typescript
// ---------- ADMINISTRADORES ----------
adminRouter.get(
  "/admins",
  requireRole("admin"),
  asyncHandler(async (_req, res) => {
    res.json({ admins: await listAdmins() });
  }),
);

adminRouter.post(
  "/admins",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const input = createAdminSchema.parse(req.body);
    res.status(201).json({ admin: await createAdmin(input) });
  }),
);

adminRouter.patch(
  "/admins/:id/deactivate",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const admin = await deactivateAdmin(req.params.id, adminId(req));
    res.json({ admin });
  }),
);

adminRouter.patch(
  "/admins/:id/reactivate",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    res.json({ admin: await reactivateAdmin(req.params.id) });
  }),
);

adminRouter.post(
  "/admins/:id/reset-password",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const { password } = resetPasswordSchema.parse(req.body);
    await resetAdminPassword(req.params.id, password);
    res.json({ ok: true });
  }),
);
```

- [ ] **Step 3: Verify it compiles**

Run: `cd apps/api && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Manual verification**

Start the API (`cd apps/api && npm run dev`) with a Postgres instance available, log in as a seeded admin to get a session cookie, then:

```bash
# list (expect 200, array with the seeded admin)
curl -b cookies.txt http://localhost:PORT/admin/admins

# create (expect 201)
curl -b cookies.txt -X POST http://localhost:PORT/admin/admins \
  -H "Content-Type: application/json" \
  -d '{"email":"nuevo@test.com","name":"Nuevo Admin","role":"coordinator","password":"password123"}'

# deactivate self (expect 400 "No puedes desactivar tu propia cuenta.")
curl -b cookies.txt -X PATCH http://localhost:PORT/admin/admins/<own-id>/deactivate

# deactivate the new admin (expect 200, isActive:false)
curl -b cookies.txt -X PATCH http://localhost:PORT/admin/admins/<new-id>/deactivate

# reset its password (expect 200 {"ok":true})
curl -b cookies.txt -X POST http://localhost:PORT/admin/admins/<new-id>/reset-password \
  -H "Content-Type: application/json" -d '{"password":"newpassword1"}'
```

Confirm each response matches the expected status/shape before proceeding.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/routes/admin.ts
git commit -m "feat(api): add admin management routes (list/create/deactivate/reactivate/reset-password)"
```

---

### Task 5: Self-service change-password route

**Files:**
- Modify: `apps/api/src/routes/auth.ts`

**Interfaces:**
- Consumes: `changePasswordSchema` from `@nehemias/core` (Task 1), `changeOwnPassword` from `../services/admins.js` (Task 3), existing `requireAdmin` middleware.
- Produces: `POST /auth/change-password` — consumed by Task 6 (web API client).

- [ ] **Step 1: Add the route**

In `apps/api/src/routes/auth.ts`:
- Change line 2 import to: `import { loginSchema, changePasswordSchema } from "@nehemias/core";`
- Add a new import after line 8: `import { changeOwnPassword } from "../services/admins.js";`
- Append after the existing `/me` route (after line 39):

```typescript
authRouter.post(
  "/change-password",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
    await changeOwnPassword(req.admin!.sub, currentPassword, newPassword);
    res.json({ ok: true });
  }),
);
```

- [ ] **Step 2: Verify it compiles**

Run: `cd apps/api && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual verification**

With the API running and a logged-in session cookie:

```bash
# wrong current password (expect 400 "Contraseña actual incorrecta.")
curl -b cookies.txt -X POST http://localhost:PORT/auth/change-password \
  -H "Content-Type: application/json" \
  -d '{"currentPassword":"wrong","newPassword":"newpassword1"}'

# correct current password (expect 200 {"ok":true})
curl -b cookies.txt -X POST http://localhost:PORT/auth/change-password \
  -H "Content-Type: application/json" \
  -d '{"currentPassword":"<real-current-password>","newPassword":"newpassword1"}'

# log out and log back in with the new password to confirm it took effect
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/routes/auth.ts
git commit -m "feat(api): add self-service change-password endpoint"
```

---

### Task 6: Web API client functions

**Files:**
- Modify: `apps/web/lib/admin-api.ts`

**Interfaces:**
- Consumes: `apiGet`, `apiJson` helpers already defined at lines 24-35.
- Produces: `apiAdmins()`, `apiCrearAdmin(data)`, `apiDesactivarAdmin(id)`, `apiReactivarAdmin(id)`, `apiResetearPassword(id, password)`, `apiCambiarMiPassword(currentPassword, newPassword)` — consumed by Task 8 (page) and Task 7 (layout self-password dialog).

- [ ] **Step 1: Add the client functions**

Append at the end of `apps/web/lib/admin-api.ts` (after line 116):

```typescript
// — Administradores —
export interface AdminRow {
  id: string;
  email: string;
  name: string;
  role: "admin" | "coordinator";
  isActive: boolean;
  createdAt: string;
}
export const apiAdmins = () => apiGet("/admin/admins");
export const apiCrearAdmin = (data: { email: string; name: string; role: string; password: string }) =>
  apiJson("/admin/admins", "POST", data);
export const apiDesactivarAdmin = (id: string) => apiJson(`/admin/admins/${id}/deactivate`, "PATCH", {});
export const apiReactivarAdmin = (id: string) => apiJson(`/admin/admins/${id}/reactivate`, "PATCH", {});
export const apiResetearPassword = (id: string, password: string) =>
  apiJson(`/admin/admins/${id}/reset-password`, "POST", { password });
export const apiCambiarMiPassword = (currentPassword: string, newPassword: string) =>
  apiJson("/auth/change-password", "POST", { currentPassword, newPassword });
```

- [ ] **Step 2: Verify it compiles**

Run: `cd apps/web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib/admin-api.ts
git commit -m "feat(web): add admin management API client functions"
```

---

### Task 7: Self password-change dialog + nav entry

**Files:**
- Modify: `apps/web/app/admin/layout.tsx`

**Interfaces:**
- Consumes: `apiCambiarMiPassword` from Task 6, `AdminApiError` from `@/lib/admin-api`, `Field`, `Input`, `Button`, `IconUsers`, `IconX` from `@nehemias/ui`.
- Produces: nothing consumed by later tasks — this is a leaf UI addition.

- [ ] **Step 1: Add nav entry**

In `apps/web/app/admin/layout.tsx`, add `IconUsers` to the `@nehemias/ui` import (line 7-17) and add an entry to `NAV` (after line 27, the "Métodos de pago" entry):

```typescript
  { href: "/admin/administradores", label: "Administradores", icon: IconUsers },
```

- [ ] **Step 2: Add "Cambiar mi contraseña" dialog**

Add `useState`-driven dialog state and a trigger button next to "Cerrar sesión" in both the desktop sidebar (around line 148-155) and the mobile menu (around line 207-212). Add near the top of the component (after line 41, `const [menuOpen, setMenuOpen] = useState(false);`):

```typescript
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
```

Replace the desktop sidebar footer block (lines 142-157) with:

```tsx
        <div className="p-4 border-t border-[#143224] bg-black/10">
          <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 flex flex-col gap-3">
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold text-white truncate">{admin?.name}</span>
              <span className="text-xs text-brand-soft/75 truncate">Administrador</span>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowPasswordDialog(true)}
              className="w-full text-xs h-8 bg-white/10 border-none hover:bg-white/20 text-white font-bold"
            >
              Cambiar mi contraseña
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={logout}
              className="w-full text-xs h-8 bg-white/10 border-none hover:bg-white/20 text-white font-bold"
            >
              Cerrar sesión
            </Button>
          </div>
        </div>
```

Add the dialog itself right before the final closing `</div>` of the component (after line 246, before line 247 `</div>`, i.e. as a sibling of the outermost wrapper — insert after the `{/* Contenido principal */}` block closes):

```tsx
      {showPasswordDialog && (
        <ChangePasswordDialog onClose={() => setShowPasswordDialog(false)} />
      )}
```

Add the `ChangePasswordDialog` component at the end of the file (after the closing `}` of `AdminLayout`):

```tsx
function ChangePasswordDialog({ onClose }: { onClose: () => void }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await apiCambiarMiPassword(currentPassword, newPassword);
      onClose();
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : "Error al cambiar la contraseña.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative max-w-md w-full bg-white rounded-2xl border border-border shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-border/60 bg-surface-sunken/30">
          <h3 className="font-serif text-lg font-bold text-ink">Cambiar mi contraseña</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-ink-muted hover:bg-surface-sunken hover:text-ink transition-colors cursor-pointer"
            aria-label="Cerrar"
          >
            <IconX size={20} />
          </button>
        </div>
        <form onSubmit={onSubmit} className="p-6 space-y-4">
          <Field label="Contraseña actual" htmlFor="current-password" required>
            <Input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </Field>
          <Field label="Nueva contraseña" htmlFor="new-password" required help="Mínimo 8 caracteres.">
            <Input
              id="new-password"
              type="password"
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </Field>
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

Add the same "Cambiar mi contraseña" button next to "Cerrar sesión" in the mobile menu footer (lines 202-213), using the same `onClick={() => setShowPasswordDialog(true)}` pattern, and add the `apiCambiarMiPassword, AdminApiError` import to the existing `@/lib/admin-api` import line (line 19):

```typescript
import { apiMe, apiLogout, apiCambiarMiPassword, AdminApiError } from "@/lib/admin-api";
```

- [ ] **Step 3: Verify it compiles**

Run: `cd apps/web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Manual verification**

Run `cd apps/web && npm run dev`, log into `/admin/login`, click "Cambiar mi contraseña" in the sidebar, submit with a wrong current password (expect inline error "Contraseña actual incorrecta."), then submit with the correct current password and a valid new one (expect dialog closes), log out and log back in with the new password to confirm it took effect.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/admin/layout.tsx
git commit -m "feat(web): add self-service change-password dialog and admins nav entry"
```

---

### Task 8: Admin management page

**Files:**
- Create: `apps/web/app/admin/administradores/page.tsx`

**Interfaces:**
- Consumes: `apiAdmins`, `apiCrearAdmin`, `apiDesactivarAdmin`, `apiReactivarAdmin`, `apiResetearPassword`, `AdminRow`, `AdminApiError` from `@/lib/admin-api` (Task 6); `Button`, `Card`, `Field`, `Input`, `Select`, `Badge`, `IconX` from `@nehemias/ui`.
- Produces: nothing consumed by later tasks — this is the final leaf page.

- [ ] **Step 1: Write the page**

Create `apps/web/app/admin/administradores/page.tsx`, following the list+portal-modal structure of `apps/web/app/admin/captacion/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button, Card, Field, Input, Select, Badge, IconX } from "@nehemias/ui";
import {
  apiAdmins,
  apiCrearAdmin,
  apiDesactivarAdmin,
  apiReactivarAdmin,
  apiResetearPassword,
  AdminApiError,
  type AdminRow,
} from "@/lib/admin-api";

export default function AdminAdministradoresPage() {
  const [items, setItems] = useState<AdminRow[]>([]);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [resetId, setResetId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => setMounted(true), []);

  function cargar() {
    apiAdmins()
      .then((r) => setItems(r.admins))
      .catch(() => setItems([]));
  }
  useEffect(cargar, []);

  useEffect(() => {
    document.body.style.overflow = mostrarForm || resetId !== null ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mostrarForm, resetId]);

  async function toggleActivo(a: AdminRow) {
    setError("");
    try {
      if (a.isActive) await apiDesactivarAdmin(a.id);
      else await apiReactivarAdmin(a.id);
      cargar();
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : "Error al actualizar el estado.");
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-border/80 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-brand animate-pulse"></span>
            <span className="text-xs font-bold text-brand uppercase tracking-wider">Acceso</span>
          </div>
          <h1 className="font-serif text-3xl font-extrabold tracking-tight text-ink">Administradores</h1>
          <p className="text-sm text-ink-muted leading-relaxed">
            Quiénes pueden entrar al panel y con qué rol.
          </p>
        </div>
        <Button
          variant={mostrarForm ? "secondary" : "primary"}
          onClick={() => setMostrarForm((v) => !v)}
          className="shrink-0 shadow-sm transition-all duration-300 hover:scale-[1.02]"
        >
          {mostrarForm ? "Ocultar Formulario" : "Crear Administrador"}
        </Button>
      </div>

      {error && <p className="text-sm text-danger font-semibold">{error}</p>}

      {mounted && mostrarForm && createPortal(
        <div className="fixed inset-0 z-50 flex justify-center items-start overflow-y-auto bg-black/60 backdrop-blur-sm p-4 sm:p-6 md:p-8">
          <div className="relative max-w-2xl w-full bg-white rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-border/60 bg-surface-sunken/30">
              <h3 className="font-serif text-lg font-bold text-ink">Crear administrador</h3>
              <button
                onClick={() => setMostrarForm(false)}
                className="p-1.5 rounded-full text-ink-muted hover:bg-surface-sunken hover:text-ink transition-colors cursor-pointer"
                aria-label="Cerrar"
              >
                <IconX size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
              <CrearAdminForm
                onDone={() => {
                  setMostrarForm(false);
                  cargar();
                }}
                onCancel={() => setMostrarForm(false)}
              />
            </div>
          </div>
        </div>,
        document.body
      )}

      {mounted && resetId !== null && createPortal(
        <div className="fixed inset-0 z-50 flex justify-center items-start overflow-y-auto bg-black/60 backdrop-blur-sm p-4 sm:p-6 md:p-8">
          <div className="relative max-w-md w-full bg-white rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-border/60 bg-surface-sunken/30">
              <h3 className="font-serif text-lg font-bold text-ink">Resetear contraseña</h3>
              <button
                onClick={() => setResetId(null)}
                className="p-1.5 rounded-full text-ink-muted hover:bg-surface-sunken hover:text-ink transition-colors cursor-pointer"
                aria-label="Cerrar"
              >
                <IconX size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
              <ResetPasswordForm
                id={resetId}
                onDone={() => setResetId(null)}
                onCancel={() => setResetId(null)}
              />
            </div>
          </div>
        </div>,
        document.body
      )}

      <section className="space-y-4">
        {items.map((a) => (
          <Card key={a.id} className="flex items-center justify-between p-5 bg-white border border-border/80 hover:-translate-y-0.5 hover:shadow-md transition-all duration-300">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <p className="font-bold text-ink text-base">{a.name}</p>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-brand-soft/20 text-brand px-2 py-0.5 rounded-full border border-brand/10">
                  {a.role === "admin" ? "Admin" : "Coordinador"}
                </span>
                {!a.isActive && <Badge tone="neutral">Inactivo</Badge>}
              </div>
              <p className="text-sm text-ink-muted">{a.email}</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button variant="secondary" size="sm" onClick={() => setResetId(a.id)} className="shadow-sm">
                Resetear contraseña
              </Button>
              <Button
                variant={a.isActive ? "danger" : "secondary"}
                size="sm"
                onClick={() => toggleActivo(a)}
                className="shadow-sm"
              >
                {a.isActive ? "Desactivar" : "Reactivar"}
              </Button>
            </div>
          </Card>
        ))}
        {items.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border-strong bg-white p-12 text-center text-ink-muted">
            <h3 className="font-serif text-lg font-bold text-ink">Sin registros</h3>
            <p className="text-sm text-ink-subtle mt-1">Aún no hay administradores.</p>
          </div>
        )}
      </section>
    </div>
  );
}

function CrearAdminForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [estado, setEstado] = useState<"idle" | "enviando">("idle");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEstado("enviando");
    setError("");
    const fd = new FormData(e.currentTarget);
    const data = {
      email: fd.get("email") as string,
      name: fd.get("name") as string,
      role: fd.get("role") as string,
      password: fd.get("password") as string,
    };
    try {
      await apiCrearAdmin(data);
      onDone();
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : "Error al crear el administrador.");
    } finally {
      setEstado("idle");
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-5 sm:grid-cols-2">
      <Field label="Nombre" htmlFor="a-name" required>
        <Input id="a-name" name="name" required />
      </Field>
      <Field label="Correo" htmlFor="a-email" required>
        <Input id="a-email" name="email" type="email" required />
      </Field>
      <Field label="Rol" htmlFor="a-role">
        <Select id="a-role" name="role" defaultValue="coordinator">
          <option value="coordinator">Coordinador</option>
          <option value="admin">Admin</option>
        </Select>
      </Field>
      <Field label="Contraseña" htmlFor="a-password" required help="Mínimo 8 caracteres.">
        <Input id="a-password" name="password" type="password" minLength={8} required />
      </Field>
      {error && <p className="text-sm text-danger sm:col-span-2">{error}</p>}
      <div className="pt-2 border-t border-border/40 flex justify-end gap-3 sm:col-span-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={estado === "enviando"}>
          Cancelar
        </Button>
        <Button type="submit" disabled={estado === "enviando"} className="shadow-md">
          {estado === "enviando" ? "Creando..." : "Crear Administrador"}
        </Button>
      </div>
    </form>
  );
}

function ResetPasswordForm({
  id,
  onDone,
  onCancel,
}: {
  id: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [password, setPassword] = useState("");
  const [estado, setEstado] = useState<"idle" | "enviando">("idle");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEstado("enviando");
    setError("");
    try {
      await apiResetearPassword(id, password);
      onDone();
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : "Error al resetear la contraseña.");
    } finally {
      setEstado("idle");
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="Nueva contraseña" htmlFor="r-password" required help="Mínimo 8 caracteres.">
        <Input
          id="r-password"
          type="password"
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </Field>
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={estado === "enviando"}>
          Cancelar
        </Button>
        <Button type="submit" disabled={estado === "enviando"}>
          {estado === "enviando" ? "Guardando..." : "Resetear"}
        </Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd apps/web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual verification**

Run `cd apps/web && npm run dev` (with API running), log in, go to `/admin/administradores`:
- Confirm the seeded admin appears in the list.
- Create a new coordinator; confirm it appears immediately.
- Click "Desactivar" on the new coordinator; confirm the "Inactivo" badge appears and the button flips to "Reactivar".
- Click "Resetear contraseña" on the new coordinator, submit a new password; confirm the dialog closes with no error.
- Attempt to desactivate the currently-logged-in admin from the API directly (already covered in Task 4's curl checks) — confirm the UI surfaces the 400 error message if you click deactivate on your own row (there is no client-side self-detection, so this exercises the server error path through `toggleActivo`'s catch block).
- Confirm the "Administradores" link appears in the sidebar and highlights when active.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/admin/administradores/page.tsx
git commit -m "feat(web): add admin management page (list/create/deactivate/reset-password)"
```

---

## Post-plan check

After all 8 tasks: run `npm run typecheck` (or the equivalent per-package `tsc --noEmit`) and `npm run lint` at the repo root if available, confirm both pass, then do one end-to-end pass through the manual verification steps of Tasks 4, 5, 7, and 8 in a single session (create → deactivate → reactivate → reset password → self change-password → re-login) before considering the feature done.
