import { Prisma } from "@nehemias/db";

export type AuditAction = "CREATE" | "UPDATE" | "DELETE" | "VERIFY" | "REJECT" | "SYNC";

export interface AuditEntry {
  actorId: string | null;
  actorRole: string | null;
  action: AuditAction;
  entityType: string;
  entityId: string | null;
  payload?: unknown;
}

/**
 * Registra una entrada de auditoría dentro de la MISMA transacción que la
 * mutación que describe: si la escritura de auditoría falla, la mutación
 * también se revierte (fail-closed).
 */
export async function recordAudit(tx: Prisma.TransactionClient, entry: AuditEntry): Promise<void> {
  await tx.auditLog.create({
    data: {
      actorId: entry.actorId,
      actorRole: entry.actorRole,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      payload: (entry.payload ?? Prisma.JsonNull) as Prisma.InputJsonValue,
    },
  });
}
