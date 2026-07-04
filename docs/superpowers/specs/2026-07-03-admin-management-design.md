# Gestión de administradores desde el panel

Trello: https://trello.com/c/L2LsAiOp/4-gesti%C3%B3n-de-administradores-desde-el-panel (P1)

## Problem

Today `AdminUser` rows are only created via seed script (`packages/db/prisma/seed.ts`) or the bootstrap-first-admin flow (`apps/api/src/bootstrap.ts`). There is no way, from the admin panel, to create new admins, deactivate them, or reset/change passwords. There is also no password strength policy anywhere in the codebase.

## Scope decisions (confirmed with user)

- Only `role: "admin"` can manage other admins (`requireRole("admin")`). Coordinators cannot.
- Two distinct password flows:
  - Self-service "change password" (any authenticated admin, requires current password).
  - Admin-driven "reset password" for another admin (no current-password check, admin-only).
- Deactivation is soft (`isActive = false` on existing `AdminUser.isActive` field). No hard delete endpoint.
- Guardrails: an admin cannot deactivate themselves, and the last remaining active admin cannot be deactivated.
- Password policy: minimum 8 characters, no complexity requirement beyond length.
- No schema/migration changes — `AdminUser.isActive` and `AdminUser.role` already exist.

## Backend design

### Validation (`packages/core/src/validation.ts`)
- `passwordSchema = z.string().min(8)` — shared across create/reset/change-password.
- `createAdminSchema` — `{ email, name, role: AdminRole, password: passwordSchema }`.
- `resetPasswordSchema` — `{ password: passwordSchema }`.
- `changePasswordSchema` — `{ currentPassword: z.string().min(1), newPassword: passwordSchema }`.

### Service (`apps/api/src/services/admins.ts`, new file, mirrors `services/paymentInfo.ts`)
- `listAdmins()` — all admins, ordered by createdAt, excludes passwordHash from response shape.
- `createAdmin(input)` — hash password via `hashPassword` (argon2), insert.
- `deactivateAdmin(targetId, actingAdminId)` — guardrails:
  - if `targetId === actingAdminId` → throw `SelfDeactivationError`
  - if target is the last row with `isActive: true` → throw `LastAdminError`
  - else set `isActive: false`
- `reactivateAdmin(targetId)` — set `isActive: true`.
- `resetAdminPassword(targetId, newPassword)` — hash + update `passwordHash`.
- `changeOwnPassword(adminId, currentPassword, newPassword)` — `verifyPassword` against stored hash, throw `InvalidCurrentPasswordError` on mismatch, else hash + update.

### Routes (`apps/api/src/routes/admin.ts`, new `// ---------- ADMINS ----------` section, all behind `requireRole("admin")`)
- `GET /admin/admins` → `listAdmins()`
- `POST /admin/admins` → `createAdminSchema.parse(body)` → `createAdmin`
- `PATCH /admin/admins/:id/deactivate` → `deactivateAdmin(id, req.admin.id)`, map guardrail errors to 400 with clear message
- `PATCH /admin/admins/:id/reactivate` → `reactivateAdmin(id)`
- `POST /admin/admins/:id/reset-password` → `resetPasswordSchema.parse(body)` → `resetAdminPassword`

### Self-service change password (`apps/api/src/routes/auth.ts`, behind `requireAdmin` only — not `requireRole`)
- `POST /auth/change-password` → `changePasswordSchema.parse(body)` → `changeOwnPassword(req.admin.id, ...)`, 400 on wrong current password.

### Login enforcement (`apps/api/src/routes/auth.ts`, existing `POST /auth/login`)
- After looking up admin by email, add check `admin.isActive === true`; if false, return the same generic invalid-credentials response used for wrong password/unknown email (don't leak deactivation state to the client).

## Frontend design

### New page: `apps/web/app/admin/administradores/page.tsx`
- Table: email, name, role, status badge (Activo/Inactivo), created date, row actions.
- "Crear admin" button → modal/form (email, name, role select, password).
- Row actions: Desactivar / Reactivar (disabled+tooltip when target is self or last active admin — client-side hint only, server is source of truth), Resetear contraseña (opens dialog, single password field, calls reset endpoint).
- Nav entry added to `apps/web/app/admin/layout.tsx` sidebar array (~line 21-28).

### Self password change
- Add "Cambiar mi contraseña" entry to existing header/profile area (wherever logout lives in `layout.tsx`), opens a small dialog: current password + new password, calls `/auth/change-password`.

### API client (`apps/web/lib/admin-api.ts`)
New functions following the existing `apiGet/apiJson` helper pattern (cookie-based, `credentials: "include"`):
- `apiListAdmins()`
- `apiCrearAdmin(input)`
- `apiDesactivarAdmin(id)`
- `apiReactivarAdmin(id)`
- `apiResetPassword(id, password)`
- `apiChangePassword(current, next)`

## Error handling

- Guardrail violations (self-deactivation, last-admin) → 400 with a specific message surfaced in the UI as a toast/inline error, not silently ignored.
- Wrong current password on self-change → 400, distinct message ("Contraseña actual incorrecta").
- Deactivated admin attempting login → same generic "credenciales inválidas" as any other login failure.
- Duplicate email on create → surface Prisma unique-constraint violation as 400 "Ya existe un admin con ese email".

## Testing

- Unit tests for `services/admins.ts` guardrails: self-deactivation blocked, last-admin blocked, normal deactivation/reactivation works.
- Route-level test: non-admin (coordinator) role gets 403 on all `/admin/admins/*` endpoints.
- Route-level test: deactivated admin cannot log in.
- Route-level test: self password change rejects wrong current password.

## Out of scope

- Hard delete of admins.
- Password complexity rules beyond min length.
- Audit log / history of admin actions (not requested).
- Coordinator ability to manage admins.
