import { prisma } from "@nehemias/db";
import { toPublicFrente, type FrenteInput } from "@nehemias/core";

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
