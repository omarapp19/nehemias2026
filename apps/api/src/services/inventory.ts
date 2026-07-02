import { prisma, Prisma } from "@nehemias/db";
import { esUrgente, type SupplyInput, type SupplyUpdateInput } from "@nehemias/core";

type Tx = Prisma.TransactionClient;

/** Recalcula la urgencia de un insumo (derivada: stock < umbral). */
export async function recalcUrgent(tx: Tx, supplyId: string): Promise<void> {
  const s = await tx.supply.findUnique({
    where: { id: supplyId },
    select: { currentStock: true, minThreshold: true },
  });
  if (!s) return;
  await tx.supply.update({
    where: { id: supplyId },
    data: { isUrgent: esUrgente(s.currentStock, s.minThreshold) },
  });
}

interface StockInArgs {
  supplyId?: string;
  name?: string;
  category?: string | null;
  unit?: string;
  quantity: number;
  origin: "purchased" | "donated";
  reason: string;
  refType: "expense" | "donation";
  refId: string;
}

/**
 * Suma stock: ubica el insumo (por id o por nombre) o lo crea, incrementa
 * existencias, registra el movimiento y recalcula urgencia.
 */
export async function applyStockIn(tx: Tx, args: StockInArgs): Promise<string> {
  let supplyId = args.supplyId;

  if (!supplyId && args.name) {
    const existing = await tx.supply.findFirst({
      where: { name: { equals: args.name, mode: "insensitive" } },
    });
    supplyId = existing?.id;
  }

  if (supplyId) {
    await tx.supply.update({
      where: { id: supplyId },
      data: { currentStock: { increment: new Prisma.Decimal(args.quantity) } },
    });
  } else {
    const created = await tx.supply.create({
      data: {
        name: args.name ?? "Insumo",
        category: args.category ?? null,
        unit: args.unit ?? "unidades",
        currentStock: new Prisma.Decimal(args.quantity),
        origin: args.origin,
      },
    });
    supplyId = created.id;
  }

  await tx.stockMovement.create({
    data: {
      supplyId,
      type: "in",
      quantity: new Prisma.Decimal(args.quantity),
      reason: args.reason,
      refType: args.refType,
      refId: args.refId,
    },
  });

  await recalcUrgent(tx, supplyId);
  return supplyId;
}

interface StockOutArgs {
  supplyId: string;
  quantity: number;
  reason: string;
  refType: "delivery";
  refId: string;
}

/** Resta stock (entrega): decrementa, registra movimiento y recalcula urgencia. */
export async function applyStockOut(tx: Tx, args: StockOutArgs): Promise<void> {
  await tx.supply.update({
    where: { id: args.supplyId },
    data: { currentStock: { decrement: new Prisma.Decimal(args.quantity) } },
  });
  await tx.stockMovement.create({
    data: {
      supplyId: args.supplyId,
      type: "out",
      quantity: new Prisma.Decimal(args.quantity),
      reason: args.reason,
      refType: args.refType,
      refId: args.refId,
    },
  });
  await recalcUrgent(tx, args.supplyId);
}

// ---------- CRUD de insumos ----------
export function listSupplies() {
  return prisma.supply.findMany({ orderBy: [{ isUrgent: "desc" }, { name: "asc" }] });
}

export function listUrgentSupplies() {
  return prisma.supply.findMany({
    where: { isUrgent: true },
    orderBy: { name: "asc" },
  });
}

export async function createSupply(input: SupplyInput) {
  const supply = await prisma.supply.create({
    data: {
      name: input.name,
      category: input.category ?? null,
      unit: input.unit,
      currentStock: new Prisma.Decimal(input.currentStock ?? 0),
      minThreshold: new Prisma.Decimal(input.minThreshold ?? 0),
      origin: input.origin ?? null,
    },
  });
  await prisma.$transaction((tx) => recalcUrgent(tx, supply.id));
  return prisma.supply.findUnique({ where: { id: supply.id } });
}

export async function updateSupply(id: string, input: SupplyUpdateInput) {
  await prisma.supply.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.category !== undefined ? { category: input.category } : {}),
      ...(input.unit !== undefined ? { unit: input.unit } : {}),
      ...(input.currentStock !== undefined
        ? { currentStock: new Prisma.Decimal(input.currentStock) }
        : {}),
      ...(input.minThreshold !== undefined
        ? { minThreshold: new Prisma.Decimal(input.minThreshold) }
        : {}),
      ...(input.origin !== undefined ? { origin: input.origin } : {}),
    },
  });
  await prisma.$transaction((tx) => recalcUrgent(tx, id));
  return prisma.supply.findUnique({ where: { id } });
}

export async function deleteSupply(id: string) {
  await prisma.supply.delete({ where: { id } });
}

