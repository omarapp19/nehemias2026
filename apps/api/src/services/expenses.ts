import { prisma, Prisma } from "@nehemias/db";
import { toPublicExpense, type ExpenseInput } from "@nehemias/core";
import { ApiError } from "../http.js";
import { applyStockIn } from "./inventory.js";

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

    return toPublicExpense(expense);
  });
}

export async function listPublicExpenses(limit?: number) {
  const rows = await prisma.expense.findMany({
    orderBy: { spentAt: "desc" },
    take: limit,
  });
  return rows.map(toPublicExpense);
}

export function getExpensesForBalance() {
  return prisma.expense.findMany({ select: { amount: true, currency: true } });
}

/** Actualiza campos editables de un egreso. */
export async function updateExpense(
  id: string,
  input: Partial<ExpenseInput>,
  invoiceUrl?: string | null,
) {
  const expense = await prisma.expense.findUnique({ where: { id } });
  if (!expense) throw new ApiError(404, "Egreso no encontrado.");

  const updated = await prisma.expense.update({
    where: { id },
    data: {
      ...(input.description !== undefined && { description: input.description }),
      ...(input.amount !== undefined && { amount: new Prisma.Decimal(input.amount) }),
      ...(input.currency !== undefined && { currency: input.currency }),
      ...(input.category !== undefined && { category: input.category ?? null }),
      ...(input.supplier !== undefined && { supplier: input.supplier ?? null }),
      ...(input.invoiceNumber !== undefined && { invoiceNumber: input.invoiceNumber ?? null }),
      ...(input.spentAt !== undefined && { spentAt: input.spentAt }),
      ...(invoiceUrl !== undefined && { invoiceUrl: invoiceUrl ?? expense.invoiceUrl }),
    },
  });
  return toPublicExpense(updated);
}

/** Elimina un egreso permanentemente. */
export async function deleteExpense(id: string) {
  const expense = await prisma.expense.findUnique({ where: { id } });
  if (!expense) throw new ApiError(404, "Egreso no encontrado.");
  await prisma.expense.delete({ where: { id } });
}
