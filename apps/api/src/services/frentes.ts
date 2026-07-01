import { prisma } from "@nehemias/db";

export function listFrentes() {
  return prisma.frente.findMany();
}
