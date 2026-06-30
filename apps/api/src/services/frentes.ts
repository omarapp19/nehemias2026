import { prisma } from "@nehemias/db";
import { toPublicFrente, type FrenteInput } from "@nehemias/core";
import { ApiError } from "../http.js";

export async function listFrentes() {
  const rows = await prisma.frente.findMany({ orderBy: { name: "asc" } });
  return rows.map(toPublicFrente);
}

export async function createFrente(input: FrenteInput) {
  const f = await prisma.frente.create({
    data: {
      name: input.name,
      type: input.type,
      location: input.location ?? null,
      description: input.description ?? null,
    },
  });
  return toPublicFrente(f);
}

export async function updateFrente(id: string, input: FrenteInput) {
  const f = await prisma.frente.update({
    where: { id },
    data: {
      name: input.name,
      type: input.type,
      location: input.location ?? null,
      description: input.description ?? null,
    },
  });
  return toPublicFrente(f);
}

export async function deleteFrente(id: string) {
  const hasDeliveries = await prisma.delivery.findFirst({ where: { frenteId: id } });
  if (hasDeliveries) {
    throw new ApiError(400, "No se puede eliminar un frente que tiene entregas registradas.");
  }
  await prisma.frente.delete({ where: { id } });
}

