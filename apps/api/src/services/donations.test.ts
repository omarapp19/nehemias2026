import { describe, it, expect, vi } from "vitest";

const { recordAudit, donationRow } = vi.hoisted(() => ({
  recordAudit: vi.fn().mockResolvedValue(undefined),
  donationRow: {
    id: "don-1",
    status: "pending",
    type: "financial",
    inKindItems: [] as unknown[],
  },
}));

vi.mock("../audit/auditLog.js", () => ({ recordAudit }));

vi.mock("@nehemias/db", () => {
  const tx = {
    donation: {
      findUnique: vi.fn().mockResolvedValue(donationRow),
      update: vi.fn().mockImplementation(({ data }: any) => ({ ...donationRow, ...data })),
      create: vi.fn().mockImplementation(({ data }: any) => ({ id: "don-2", inKindItems: [], ...data })),
    },
  };
  return {
    prisma: { $transaction: (fn: any) => fn(tx) },
    Prisma: { Decimal: class { constructor(public v: unknown) {} } },
  };
});

vi.mock("@nehemias/core", () => ({
  toAdminDonation: (d: any) => d,
}));

import { reviewDonation } from "./donations.js";

describe("reviewDonation", () => {
  it("records a VERIFY audit entry with the reviewing admin as actor", async () => {
    recordAudit.mockClear();
    await reviewDonation("don-1", "verify", "admin-1");
    expect(recordAudit).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      actorId: "admin-1",
      action: "VERIFY",
      entityType: "Donation",
      entityId: "don-1",
    }));
  });

  it("records a REJECT audit entry", async () => {
    recordAudit.mockClear();
    await reviewDonation("don-1", "reject", "admin-1");
    expect(recordAudit).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      actorId: "admin-1",
      action: "REJECT",
      entityType: "Donation",
      entityId: "don-1",
    }));
  });
});
