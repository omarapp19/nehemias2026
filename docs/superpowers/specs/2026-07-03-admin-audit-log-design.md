# Admin action audit log — design

Trello card: [Auditoría/log de acciones admin](https://trello.com/c/r1x0qbug/3-auditor%C3%ADa-log-de-acciones-admin) (P1)

## Problem

There is no record of who verified/rejected a donation, created/edited/deleted an
expense or inventory item, or triggered the Google Sheets sync — nor of what the
sync deleted before re-inserting. `syncGoogleSheets` (`apps/api/src/services/sheets.ts`)
runs inside a `prisma.$transaction` that does `donation.deleteMany` (financial type)
and an unfiltered `expense.deleteMany`, then bulk-inserts fresh rows from the
spreadsheet — if the sheet is wrong or the sync runs against stale data, there is
currently no way to see what was lost.

## Goals

- Every mutating admin action (donations, expenses, inventory, gallery photos,
  payment info, settings) writes an audit entry: who, what action, on what entity,
  when.
- The Sheets sync writes an audit entry per affected entity type containing counts
  **and** a snapshot of the rows it deleted, so a bad sync can be reconciled by hand.
- A simple admin UI page lists audit entries, filterable by entity type and date.

## Non-goals

- Diff/before-after view in the UI beyond the raw JSON payload (can follow later).
- Retention/pruning policy for the audit table (out of scope for this card).

## Data model

New Prisma model in `packages/db/prisma/schema.prisma`:

```prisma
model AuditLog {
  id         String   @id @default(cuid())
  actorId    String?
  actor      AdminUser? @relation(fields: [actorId], references: [id])
  actorRole  String?
  action     String   // CREATE | UPDATE | DELETE | VERIFY | REJECT | SYNC
  entityType String   // Donation | Expense | Supply | GalleryPhoto | PaymentInfo | SystemSetting
  entityId   String?  // null for bulk operations (sync)
  payload    Json?
  createdAt  DateTime @default(now())

  @@index([entityType, entityId])
  @@index([createdAt])
}
```

New migration under `packages/db/prisma/migrations/`.

## Write path

`apps/api/src/audit/auditLog.ts` exports:

```ts
recordAudit(tx: PrismaTransactionClient, entry: {
  actorId: string | null
  actorRole: string | null
  action: AuditAction
  entityType: string
  entityId: string | null
  payload?: unknown
}): Promise<void>
```

It takes a transaction client (not the top-level `prisma` client) so the audit
write is always inside the same transaction as the business mutation it
describes — if either fails, both roll back. Every mutating service function
(`services/donations.ts`, `services/expenses.ts`, `services/inventory.ts`, plus
the gallery/paymentInfo/settings handlers) wraps its mutation in
`prisma.$transaction` (adding one where none exists today) and calls
`recordAudit` immediately after the mutation, using `req.admin.sub` /
`req.admin.role` for actor fields.

### Sync special case

Inside `syncGoogleSheets`'s existing transaction:

1. Before `donation.deleteMany` / `expense.deleteMany`, `findMany` the rows about
   to be deleted.
2. After delete + bulk insert, call `recordAudit` once per entity type with
   `action: 'SYNC'`, `entityId: null`, and
   `payload: { deletedCount, insertedCount, deletedSnapshot }`.
3. Actor is the admin who triggered the sync (the route is behind `requireAdmin`).

## Read path

- `GET /admin/auditoria` — paginated, query params `entityType?`, `from?`, `to?`.
  New `services/auditLog.ts::listAuditLogs(filters, pagination)`.
- New admin UI page (wherever the admin panel lives in `apps/web`) rendering a
  table: fecha, actor, acción, entidad, entityId, expandable payload. Filters map
  to the query params above.

## Error handling

Audit writes live inside the same transaction as the mutation they describe —
fail-closed by construction, no extra error handling needed. The read endpoint
follows existing admin route validation/pagination conventions.

## Testing

- Unit: `recordAudit` writes the expected row shape.
- Integration (supertest): donation verify/reject writes a log entry with
  correct actor/action; sync writes snapshot + counts; `GET /admin/auditoria`
  filters correctly and is rejected without an admin session.
