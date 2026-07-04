import { prisma } from "@nehemias/db";
import { recordAudit } from "../audit/auditLog.js";

const DEFAULT_SETTINGS: Record<string, string> = {
  contact_phone: "+58 (412) 555-0123",
  contact_email: "contacto@nehemias.org",
  contact_sede: "Caracas, Venezuela",
};

export async function getSettings() {
  const rows = await prisma.systemSetting.findMany();
  const settings: Record<string, string> = { ...DEFAULT_SETTINGS };
  for (const row of rows) {
    settings[row.key] = row.value;
  }
  return settings;
}

export async function updateSetting(key: string, value: string, adminId: string | null) {
  return prisma.$transaction(async (tx) => {
    const row = await tx.systemSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
    await recordAudit(tx, {
      actorId: adminId,
      actorRole: null,
      action: "UPDATE",
      entityType: "SystemSetting",
      entityId: key,
      payload: { value },
    });
    return row;
  });
}
