import { prisma, Prisma } from "@nehemias/db";
import { buildMeta, type Paginated } from "@nehemias/core";

export interface AuditLogRow {
  id: string;
  actorId: string | null;
  actorRole: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  payload: unknown;
  createdAt: string;
}

export interface AuditLogFilters {
  entityType?: string;
  from?: Date;
  to?: Date;
}

export interface AuditLogPagination {
  page: number;
  limit: number;
}

function toRow(r: {
  id: string;
  actorId: string | null;
  actorRole: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  payload: unknown;
  createdAt: Date;
}): AuditLogRow {
  return { ...r, createdAt: r.createdAt.toISOString() };
}

/** Lista paginada de entradas de auditoría, filtrable por entidad y rango de fechas. */
export async function listAuditLogs(
  filters: AuditLogFilters,
  pagination: AuditLogPagination,
): Promise<Paginated<AuditLogRow>> {
  const where: Prisma.AuditLogWhereInput = {
    ...(filters.entityType && { entityType: filters.entityType }),
    ...((filters.from || filters.to) && {
      createdAt: {
        ...(filters.from && { gte: filters.from }),
        ...(filters.to && { lte: filters.to }),
      },
    }),
  };

  const [rows, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (pagination.page - 1) * pagination.limit,
      take: pagination.limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { data: rows.map(toRow), meta: buildMeta(pagination.page, pagination.limit, total) };
}
