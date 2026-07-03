import { describe, it, expect, vi } from "vitest";

const { recordAudit, expenseRow } = vi.hoisted(() => ({
  recordAudit: vi.fn().mockResolvedValue(undefined),
  expenseRow: { id: "exp-1", description: "x", amount: 10, currency: "USD" },
}));

vi.mock("../audit/auditLog.js", () => ({ recordAudit }));

vi.mock("@nehemias/db", () => {
  const tx = {
    expense: {
      findUnique: vi.fn().mockResolvedValue(expenseRow),
      create: vi.fn().mockImplementation(({ data }: any) => ({ id: "exp-2", ...data })),
      delete: vi.fn().mockResolvedValue(expenseRow),
      update: vi.fn().mockImplementation(({ data }: any) => ({ ...expenseRow, ...data })),
    },
  };
  return {
    prisma: { $transaction: (fn: any) => fn(tx) },
    Prisma: { Decimal: class { constructor(public v: unknown) {} } },
  };
});

vi.mock("@nehemias/core", () => ({ toPublicExpense: (e: any) => e }));

import { createExpense, deleteExpense } from "./expenses.js";

describe("expense audit wiring", () => {
  it("createExpense records a CREATE audit entry", async () => {
    recordAudit.mockClear();
    await createExpense({ description: "x", amount: 10, currency: "USD", createsStock: false } as any, "admin-1");
    expect(recordAudit).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      actorId: "admin-1",
      action: "CREATE",
      entityType: "Expense",
    }));
  });

  it("deleteExpense records a DELETE audit entry with a snapshot", async () => {
    recordAudit.mockClear();
    await deleteExpense("exp-1");
    expect(recordAudit).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      action: "DELETE",
      entityType: "Expense",
      entityId: "exp-1",
      payload: expect.objectContaining({ snapshot: expenseRow }),
    }));
  });
});
