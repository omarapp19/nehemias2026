import { prisma, Prisma } from "@nehemias/db";
import {
  toAdminDonation,
  toPublicDonation,
  type DeclareDonationInput,
  type AdminCreateDonationInput,
} from "@nehemias/core";
import { ApiError } from "../http.js";
import { applyStockIn } from "./inventory.js";

type Tx = Prisma.TransactionClient;

const withItems = { inKindItems: true } as const;

/** Convierte una donación en especie verificada en stock (un movimiento por ítem). */
async function ingresarStockDeDonacion(
  tx: Tx,
  donation: { id: string; inKindItems: { id: string; supplyId: string | null; description: string; quantity: Prisma.Decimal; unit: string }[] },
): Promise<void> {
  for (const item of donation.inKindItems) {
    const supplyId = await applyStockIn(tx, {
      supplyId: item.supplyId ?? undefined,
      name: item.description,
      unit: item.unit,
      quantity: Number(item.quantity),
      origin: "donated",
      reason: "donación",
      refType: "donation",
      refId: donation.id,
    });
    // Enlazamos el ítem al insumo creado/actualizado para mantener la trazabilidad.
    if (!item.supplyId) {
      await tx.inKindItem.update({ where: { id: item.id }, data: { supplyId } });
    }
  }
}

/** Camino B: el público declara su donación. Entra SIEMPRE como `pending`. */
export async function declareDonation(input: DeclareDonationInput, proofUrl?: string) {
  const donation = await prisma.donation.create({
    data: {
      type: input.type,
      status: "pending",
      amount: input.type === "financial" && input.amount ? new Prisma.Decimal(input.amount) : null,
      currency: input.currency,
      method: input.method ?? null,
      referenceNumber: input.referenceNumber ?? null,
      exchangeRate: input.exchangeRate ? new Prisma.Decimal(input.exchangeRate) : null,
      donorName: input.donorName ?? null,
      isAnonymous: input.isAnonymous ?? false,
      donorContact: input.donorContact ?? null,
      message: input.message ?? null,
      proofUrl: proofUrl ?? null,
      declaredByPublic: true,
      donatedAt: input.donatedAt ?? new Date(),
      inKindItems:
        input.type === "in_kind" && input.inKindItems
          ? {
              create: input.inKindItems.map((i) => ({
                description: i.description,
                quantity: new Prisma.Decimal(i.quantity),
                unit: i.unit,
                supplyId: i.supplyId ?? null,
              })),
            }
          : undefined,
    },
    include: withItems,
  });
  return toAdminDonation(donation);
}

/** Admin registra una donación; puede quedar verificada directamente. */
export async function adminCreateDonation(
  input: AdminCreateDonationInput,
  adminId: string,
  proofUrl?: string,
) {
  const verified = input.markVerified;
  return prisma.$transaction(async (tx) => {
    const donation = await tx.donation.create({
      data: {
        type: input.type,
        status: verified ? "verified" : "pending",
        amount:
          input.type === "financial" && input.amount ? new Prisma.Decimal(input.amount) : null,
        currency: input.currency,
        method: input.method ?? null,
        referenceNumber: input.referenceNumber ?? null,
        exchangeRate: input.exchangeRate ? new Prisma.Decimal(input.exchangeRate) : null,
        donorName: input.donorName ?? null,
        isAnonymous: input.isAnonymous ?? false,
        donorContact: input.donorContact ?? null,
        message: input.message ?? null,
        proofUrl: proofUrl ?? null,
        declaredByPublic: false,
        verifiedById: verified ? adminId : null,
        verifiedAt: verified ? new Date() : null,
        donatedAt: input.donatedAt ?? new Date(),
        inKindItems:
          input.type === "in_kind" && input.inKindItems
            ? {
                create: input.inKindItems.map((i) => ({
                  description: i.description,
                  quantity: new Prisma.Decimal(i.quantity),
                  unit: i.unit,
                  supplyId: i.supplyId ?? null,
                })),
              }
            : undefined,
      },
      include: withItems,
    });

    if (verified && donation.type === "in_kind") {
      await ingresarStockDeDonacion(tx, donation);
    }
    return toAdminDonation(donation);
  });
}

/** Aprobar o rechazar una donación pendiente. */
export async function reviewDonation(
  id: string,
  action: "verify" | "reject",
  adminId: string,
) {
  return prisma.$transaction(async (tx) => {
    const donation = await tx.donation.findUnique({ where: { id }, include: withItems });
    if (!donation) throw new ApiError(404, "Donación no encontrada.");
    if (donation.status !== "pending") {
      throw new ApiError(409, "Esta donación ya fue revisada.");
    }

    if (action === "reject") {
      const updated = await tx.donation.update({
        where: { id },
        data: { status: "rejected", verifiedById: adminId, verifiedAt: new Date() },
        include: withItems,
      });
      return toAdminDonation(updated);
    }

    // verify
    const updated = await tx.donation.update({
      where: { id },
      data: { status: "verified", verifiedById: adminId, verifiedAt: new Date() },
      include: withItems,
    });
    if (updated.type === "in_kind") {
      await ingresarStockDeDonacion(tx, updated);
    }
    return toAdminDonation(updated);
  });
}

/** Lista para el panel admin (puede filtrar por estado). */
export async function listAdminDonations(status?: "pending" | "verified" | "rejected") {
  const rows = await prisma.donation.findMany({
    where: status ? { status } : undefined,
    include: withItems,
    orderBy: [{ status: "asc" }, { donatedAt: "desc" }, { createdAt: "desc" }],
  });
  return rows.map(toAdminDonation);
}

/** Donaciones verificadas para la cara pública. */
export async function listPublicVerifiedDonations(limit?: number) {
  const rows = await prisma.donation.findMany({
    where: { status: "verified" },
    orderBy: [{ donatedAt: "desc" }, { createdAt: "desc" }],
    take: limit,
    include: withItems,
  });
  return rows.map(toPublicDonation);
}

/** Solo las financieras verificadas (para el cálculo de balance). */
export function getVerifiedFinancialForBalance() {
  return prisma.donation.findMany({
    where: { status: "verified", type: "financial" },
    select: { amount: true, currency: true },
  });
}

/** Actualiza campos editables de una donación. El stock no se modifica. */
export async function updateDonation(
  id: string,
  input: Partial<AdminCreateDonationInput>,
  proofUrl?: string | null,
) {
  const donation = await prisma.donation.findUnique({ where: { id } });
  if (!donation) throw new ApiError(404, "Donación no encontrada.");

  const updated = await prisma.donation.update({
    where: { id },
    data: {
      ...(input.donorName !== undefined && { donorName: input.donorName ?? null }),
      ...(input.isAnonymous !== undefined && { isAnonymous: input.isAnonymous }),
      ...(input.message !== undefined && { message: input.message ?? null }),
      ...(input.donorContact !== undefined && { donorContact: input.donorContact ?? null }),
      ...(input.referenceNumber !== undefined && { referenceNumber: input.referenceNumber ?? null }),
      ...(input.method !== undefined && { method: input.method ?? null }),
      ...(input.donatedAt !== undefined && { donatedAt: input.donatedAt }),
      ...(input.amount !== undefined && input.amount !== null && {
        amount: new Prisma.Decimal(input.amount),
      }),
      ...(input.currency !== undefined && { currency: input.currency }),
      ...(input.exchangeRate !== undefined && input.exchangeRate !== null && {
        exchangeRate: new Prisma.Decimal(input.exchangeRate),
      }),
      // Solo reemplaza el comprobante si se envía uno nuevo
      ...(proofUrl !== undefined && { proofUrl: proofUrl ?? donation.proofUrl }),
    },
    include: withItems,
  });
  return toAdminDonation(updated);
}

/** Elimina una donación permanentemente (InKindItems se borran por cascade). */
export async function deleteDonation(id: string) {
  const donation = await prisma.donation.findUnique({ where: { id } });
  if (!donation) throw new ApiError(404, "Donación no encontrada.");
  await prisma.donation.delete({ where: { id } });
}
