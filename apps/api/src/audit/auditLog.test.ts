import { describe, it, expect, vi } from "vitest";
import { recordAudit } from "./auditLog.js";

describe("recordAudit", () => {
  it("writes an AuditLog row with the given fields via the transaction client", async () => {
    const create = vi.fn().mockResolvedValue({});
    const tx = { auditLog: { create } } as any;

    await recordAudit(tx, {
      actorId: "admin-1",
      actorRole: "admin",
      action: "VERIFY",
      entityType: "Donation",
      entityId: "don-1",
      payload: { note: "ok" },
    });

    expect(create).toHaveBeenCalledWith({
      data: {
        actorId: "admin-1",
        actorRole: "admin",
        action: "VERIFY",
        entityType: "Donation",
        entityId: "don-1",
        payload: { note: "ok" },
      },
    });
  });

  it("defaults payload to null when omitted", async () => {
    const create = vi.fn().mockResolvedValue({});
    const tx = { auditLog: { create } } as any;

    await recordAudit(tx, {
      actorId: null,
      actorRole: null,
      action: "SYNC",
      entityType: "Expense",
      entityId: null,
    });

    expect(create).toHaveBeenCalledWith({
      data: {
        actorId: null,
        actorRole: null,
        action: "SYNC",
        entityType: "Expense",
        entityId: null,
        payload: null,
      },
    });
  });
});
