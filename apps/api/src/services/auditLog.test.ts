import { describe, it, expect, vi } from "vitest";

const { rows } = vi.hoisted(() => ({
  rows: [
    { id: "1", actorId: "a", actorRole: "admin", action: "CREATE", entityType: "Donation", entityId: "d1", payload: null, createdAt: new Date("2026-01-01") },
  ],
}));

vi.mock("@nehemias/db", () => ({
  prisma: {
    auditLog: {
      findMany: vi.fn().mockResolvedValue(rows),
      count: vi.fn().mockResolvedValue(1),
    },
  },
}));

import { listAuditLogs } from "./auditLog.js";

describe("listAuditLogs", () => {
  it("filters by entityType and paginates", async () => {
    const result = await listAuditLogs({ entityType: "Donation" }, { page: 1, limit: 10 });
    expect(result.data).toHaveLength(1);
    expect(result.meta.total).toBe(1);
    expect(result.data[0].entityType).toBe("Donation");
  });
});
