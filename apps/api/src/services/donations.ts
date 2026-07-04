import { prisma, Prisma } from "@nehemias/db";
import {
  toAdminDonation,
  toPublicDonation,
  buildMeta,
  type DeclareDonationInput,
  type AdminCreateDonationInput,
  type DonationQuery,
  type AdminDonationQuery,
  type Paginated,
  type PublicDonation,
  type AdminDonation,
} from "@nehemias/core";
import { ApiError } from "../http.js";
import { applyStockIn } from "./inventory.js";
import { recordAudit } from "../audit/auditLog.js";

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
    await recordAudit(tx, {
      actorId: adminId,
      actorRole: null,
      action: "CREATE",
      entityType: "Donation",
      entityId: donation.id,
      payload: { status: donation.status, type: donation.type },
    });
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
      await recordAudit(tx, {
        actorId: adminId,
        actorRole: null,
        action: "REJECT",
        entityType: "Donation",
        entityId: id,
        payload: null,
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
    await recordAudit(tx, {
      actorId: adminId,
      actorRole: null,
      action: "VERIFY",
      entityType: "Donation",
      entityId: id,
      payload: null,
    });
    return toAdminDonation(updated);
  });
}

function donationDateRangeWhere(query: { from?: Date; to?: Date }): Prisma.DonationWhereInput {
  if (!query.from && !query.to) return {};
  return {
    donatedAt: {
      ...(query.from && { gte: query.from }),
      ...(query.to && { lte: query.to }),
    },
  };
}

/** Lista paginada para el panel admin (filtra por estado, tipo, método, moneda y rango de fechas). */
export async function listAdminDonations(query: AdminDonationQuery): Promise<Paginated<AdminDonation>> {
  const where: Prisma.DonationWhereInput = {
    ...(query.status && { status: query.status }),
    ...(query.type && { type: query.type }),
    ...(query.method && { method: query.method }),
    ...(query.currency && { currency: query.currency }),
    ...donationDateRangeWhere(query),
  };

  const [rows, total] = await Promise.all([
    prisma.donation.findMany({
      where,
      include: withItems,
      orderBy: [{ status: "asc" }, { donatedAt: "desc" }, { createdAt: "desc" }],
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.donation.count({ where }),
  ]);

  return { data: rows.map(toAdminDonation), meta: buildMeta(query.page, query.limit, total) };
}

/** Donaciones verificadas para la cara pública, paginadas y filtrables. */
export async function listPublicVerifiedDonations(
  query: DonationQuery,
): Promise<Paginated<PublicDonation>> {
  const where: Prisma.DonationWhereInput = {
    status: "verified",
    ...(query.type && { type: query.type }),
    ...(query.method && { method: query.method }),
    ...(query.currency && { currency: query.currency }),
    ...donationDateRangeWhere(query),
  };

  const [rows, total] = await Promise.all([
    prisma.donation.findMany({
      where,
      orderBy: [{ donatedAt: "desc" }, { createdAt: "desc" }],
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      include: withItems,
    }),
    prisma.donation.count({ where }),
  ]);

  return { data: rows.map(toPublicDonation), meta: buildMeta(query.page, query.limit, total) };
}

/** Solo las financieras verificadas (para el cálculo de balance). */
export function getVerifiedFinancialForBalance() {
  return prisma.donation.findMany({
    where: { status: "verified", type: "financial" },
    select: { amount: true, currency: true, exchangeRate: true },
  });
}

/** Actualiza campos editables de una donación. El stock no se modifica. */
export async function updateDonation(
  id: string,
  input: Partial<AdminCreateDonationInput>,
  proofUrl?: string | null,
) {
  return prisma.$transaction(async (tx) => {
    const donation = await tx.donation.findUnique({ where: { id } });
    if (!donation) throw new ApiError(404, "Donación no encontrada.");

    const updated = await tx.donation.update({
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

    await recordAudit(tx, {
      actorId: null,
      actorRole: null,
      action: "UPDATE",
      entityType: "Donation",
      entityId: id,
      payload: null,
    });

    return toAdminDonation(updated);
  });
}

/** Elimina una donación permanentemente (InKindItems se borran por cascade). */
export async function deleteDonation(id: string) {
  await prisma.$transaction(async (tx) => {
    const donation = await tx.donation.findUnique({ where: { id } });
    if (!donation) throw new ApiError(404, "Donación no encontrada.");
    await tx.donation.delete({ where: { id } });
    await recordAudit(tx, {
      actorId: null,
      actorRole: null,
      action: "DELETE",
      entityType: "Donation",
      entityId: id,
      payload: { snapshot: donation },
    });
  });
}
