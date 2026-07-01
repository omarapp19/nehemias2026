import { prisma, Prisma } from "@nehemias/db";
import { toPublicDelivery, type DeliveryInput } from "@nehemias/core";
import { ApiError } from "../http.js";
import { applyStockOut, recalcUrgent } from "./inventory.js";

const fullInclude = {
  frente: true,
  items: true,
  photos: true,
} as const;

/**
 * Registra una jornada de entrega: crea la entrega, sus ítems y fotos, y
 * descuenta del stock cada ítem enlazado a un insumo (movimiento out).
 */
export async function createDelivery(
  input: DeliveryInput,
  adminId: string,
  photoUrls: string[],
) {
  return prisma.$transaction(async (tx) => {
    const frente = await tx.frente.findUnique({ where: { id: input.frenteId } });
    if (!frente) throw new ApiError(404, "El frente indicado no existe.");

    const delivery = await tx.delivery.create({
      data: {
        frenteId: input.frenteId,
        title: input.title,
        notes: input.notes ?? null,
        deliveredAt: input.deliveredAt ?? new Date(),
        createdById: adminId,
        items: {
          create: input.items.map((i) => ({
            description: i.description,
            quantity: new Prisma.Decimal(i.quantity),
            unit: i.unit,
            supplyId: i.supplyId ?? null,
          })),
        },
        photos: {
          create: photoUrls.map((url) => ({ url })),
        },
      },
      include: fullInclude,
    });

    // Descuenta stock de los ítems enlazados a un insumo del catálogo.
    for (const item of delivery.items) {
      if (item.supplyId) {
        await applyStockOut(tx, {
          supplyId: item.supplyId,
          quantity: Number(item.quantity),
          reason: "entrega",
          refType: "delivery",
          refId: delivery.id,
        });
      }
    }

    return toPublicDelivery(delivery);
  });
}

export async function listPublicDeliveries(limit?: number) {
  const rows = await prisma.delivery.findMany({
    orderBy: { deliveredAt: "desc" },
    take: limit,
    include: fullInclude,
  });
  return rows.map(toPublicDelivery);
}

export async function getPublicDelivery(id: string) {
  const row = await prisma.delivery.findUnique({ where: { id }, include: fullInclude });
  return row ? toPublicDelivery(row) : null;
}

export async function deleteDelivery(id: string) {
  return prisma.$transaction(async (tx) => {
    const delivery = await tx.delivery.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!delivery) throw new ApiError(404, "La entrega no existe.");

    // Restore stock for items that have a supplyId
    for (const item of delivery.items) {
      if (item.supplyId) {
        await tx.supply.update({
          where: { id: item.supplyId },
          data: { currentStock: { increment: item.quantity } },
        });
        await recalcUrgent(tx, item.supplyId);
      }
    }

    // Delete stock movements related to this delivery
    await tx.stockMovement.deleteMany({
      where: { refType: "delivery", refId: id },
    });

    // Delete the delivery (items and photos are Cascade-deleted by DB constraint)
    await tx.delivery.delete({
      where: { id },
    });
  });
}
