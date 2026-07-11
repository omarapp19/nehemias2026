import { prisma } from "@nehemias/db";
import { toPublicHelpPoint, type HelpPointInput, type HelpPointUpdateInput } from "@nehemias/core";

export async function listActiveHelpPoints() {
  const rows = await prisma.helpPoint.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toPublicHelpPoint);
}

export function listAllHelpPoints() {
  return prisma.helpPoint.findMany({ orderBy: { createdAt: "desc" } });
}

export function createHelpPoint(input: HelpPointInput) {
  return prisma.helpPoint.create({
    data: {
      name: input.name,
      type: input.type,
      description: input.description,
      contactPhone: input.contactPhone,
      contactEmail: input.contactEmail,
      lat: input.lat,
      lng: input.lng,
      isActive: input.isActive ?? true,
    },
  });
}

export function updateHelpPoint(id: string, input: HelpPointUpdateInput) {
  return prisma.helpPoint.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.contactPhone !== undefined && { contactPhone: input.contactPhone }),
      ...(input.contactEmail !== undefined && { contactEmail: input.contactEmail }),
      ...(input.lat !== undefined && { lat: input.lat }),
      ...(input.lng !== undefined && { lng: input.lng }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
    },
  });
}

export function deleteHelpPoint(id: string) {
  return prisma.helpPoint.delete({ where: { id } });
}
