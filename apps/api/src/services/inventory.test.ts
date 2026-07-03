import { describe, it, expect, vi } from "vitest";

const { recordAudit, supplyRow } = vi.hoisted(() => ({
  recordAudit: vi.fn().mockResolvedValue(undefined),
  supplyRow: { id: "sup-1", name: "Arroz", currentStock: 0, minThreshold: 0 },
}));

vi.mock("../audit/auditLog.js", () => ({ recordAudit }));

vi.mock("@nehemias/db", () => {
  const tx = {
    supply: {
      create: vi.fn().mockResolvedValue(supplyRow),
      findUnique: vi.fn().mockResolvedValue(supplyRow),
      update: vi.fn().mockResolvedValue(supplyRow),
      delete: vi.fn().mockResolvedValue(supplyRow),
    },
  };
  return {
    prisma: {
      supply: {
        findUnique: vi.fn().mockResolvedValue(supplyRow),
      },
      $transaction: (fn: any) => fn(tx),
    },
    Prisma: { Decimal: class { constructor(public v: unknown) {} } },
  };
});

vi.mock("@nehemias/core", () => ({ esUrgente: () => false }));

import { createSupply, deleteSupply } from "./inventory.js";

describe("inventory audit wiring", () => {
  it("createSupply records a CREATE audit entry", async () => {
    recordAudit.mockClear();
    await createSupply({ name: "Arroz", unit: "kg" } as any, "admin-1");
    expect(recordAudit).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      actorId: "admin-1",
      action: "CREATE",
      entityType: "Supply",
    }));
  });

  it("deleteSupply records a DELETE audit entry", async () => {
    recordAudit.mockClear();
    await deleteSupply("sup-1", "admin-1");
    expect(recordAudit).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      actorId: "admin-1",
      action: "DELETE",
      entityType: "Supply",
      entityId: "sup-1",
    }));
  });
});
