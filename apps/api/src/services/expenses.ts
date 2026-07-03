import { prisma, Prisma } from "@nehemias/db";
import {
  toPublicExpense,
  buildMeta,
  type ExpenseInput,
  type ExpenseQuery,
  type AdminExpenseQuery,
  type Paginated,
  type PublicExpense,
} from "@nehemias/core";
import { ApiError } from "../http.js";
import { applyStockIn } from "./inventory.js";
import { recordAudit } from "../audit/auditLog.js";

/** Registra una compra/egreso. Si alimenta inventario, suma stock (origen: comprado). */
export async function createExpense(
  input: ExpenseInput,
  adminId: string,
  invoiceUrl?: string,
) {
  return prisma.$transaction(async (tx) => {
    const expense = await tx.expense.create({
      data: {
        description: input.description,
        amount: new Prisma.Decimal(input.amount),
        currency: input.currency,
        category: input.category ?? null,
        supplier: input.supplier ?? null,
        invoiceUrl: invoiceUrl ?? null,
        invoiceNumber: input.invoiceNumber ?? null,
        exchangeRate: input.exchangeRate !== undefined && input.exchangeRate !== null ? new Prisma.Decimal(input.exchangeRate) : null,
        createsStock: input.createsStock ?? false,
        spentAt: input.spentAt ?? new Date(),
        createdById: adminId,
      },
    });

    if (input.createsStock && input.stockSupplyName && input.stockQuantity && input.stockUnit) {
      await applyStockIn(tx, {
        name: input.stockSupplyName,
        category: input.stockCategory ?? input.category ?? null,
        unit: input.stockUnit,
        quantity: input.stockQuantity,
        origin: "purchased",
        reason: "compra",
        refType: "expense",
        refId: expense.id,
      });
    }

    await recordAudit(tx, {
      actorId: adminId,
      actorRole: null,
      action: "CREATE",
      entityType: "Expense",
      entityId: expense.id,
      payload: null,
    });

    return toPublicExpense(expense);
  });
}

function expenseDateRangeWhere(query: { from?: Date; to?: Date }): Prisma.ExpenseWhereInput {
  if (!query.from && !query.to) return {};
  return {
    spentAt: {
      ...(query.from && { gte: query.from }),
      ...(query.to && { lte: query.to }),
    },
  };
}

/** Lista paginada de egresos, filtrable por categoría, proveedor, moneda y rango de fechas. */
export async function listPublicExpenses(
  query: AdminExpenseQuery | ExpenseQuery,
): Promise<Paginated<PublicExpense>> {
  const where: Prisma.ExpenseWhereInput = {
    ...(query.category && { category: query.category }),
    ...(query.currency && { currency: query.currency }),
    ...("supplier" in query && query.supplier && { supplier: query.supplier }),
    ...expenseDateRangeWhere(query),
  };

  const [rows, total] = await Promise.all([
    prisma.expense.findMany({
      where,
      orderBy: { spentAt: "desc" },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.expense.count({ where }),
  ]);

  return { data: rows.map(toPublicExpense), meta: buildMeta(query.page, query.limit, total) };
}

export function getExpensesForBalance() {
  return prisma.expense.findMany({ select: { amount: true, currency: true, exchangeRate: true } });
}

/** Actualiza campos editables de un egreso. */
export async function updateExpense(
  id: string,
  input: Partial<ExpenseInput>,
  invoiceUrl?: string | null,
) {
  return prisma.$transaction(async (tx) => {
    const expense = await tx.expense.findUnique({ where: { id } });
    if (!expense) throw new ApiError(404, "Egreso no encontrado.");

    const updated = await tx.expense.update({
      where: { id },
      data: {
        ...(input.description !== undefined && { description: input.description }),
        ...(input.amount !== undefined && { amount: new Prisma.Decimal(input.amount) }),
        ...(input.currency !== undefined && { currency: input.currency }),
        ...(input.category !== undefined && { category: input.category ?? null }),
        ...(input.supplier !== undefined && { supplier: input.supplier ?? null }),
        ...(input.invoiceNumber !== undefined && { invoiceNumber: input.invoiceNumber ?? null }),
        ...(input.exchangeRate !== undefined && { exchangeRate: input.exchangeRate !== null ? new Prisma.Decimal(input.exchangeRate) : null }),
        ...(input.spentAt !== undefined && { spentAt: input.spentAt }),
        ...(invoiceUrl !== undefined && { invoiceUrl: invoiceUrl ?? expense.invoiceUrl }),
      },
    });

    await recordAudit(tx, {
      actorId: null,
      actorRole: null,
      action: "UPDATE",
      entityType: "Expense",
      entityId: id,
      payload: null,
    });

    return toPublicExpense(updated);
  });
}

/** Elimina un egreso permanentemente. */
export async function deleteExpense(id: string) {
  await prisma.$transaction(async (tx) => {
    const expense = await tx.expense.findUnique({ where: { id } });
    if (!expense) throw new ApiError(404, "Egreso no encontrado.");
    await tx.expense.delete({ where: { id } });
    await recordAudit(tx, {
      actorId: null,
      actorRole: null,
      action: "DELETE",
      entityType: "Expense",
      entityId: id,
      payload: { snapshot: expense },
    });
  });
}
