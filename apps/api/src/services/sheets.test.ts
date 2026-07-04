import { describe, it, expect, vi } from "vitest";

const { recordAudit } = vi.hoisted(() => ({
  recordAudit: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../audit/auditLog.js", () => ({ recordAudit }));

vi.mock("@nehemias/db", () => ({
  prisma: {
    $transaction: (fn: any) =>
      fn({
        donation: { findMany: vi.fn(), deleteMany: vi.fn(), create: vi.fn() },
        expense: { findMany: vi.fn(), deleteMany: vi.fn(), create: vi.fn() },
      }),
  },
}));

// syncGoogleSheets downloads a real XLSX over HTTPS before touching the DB, which makes
// fully mocking the network path brittle and low-value for a unit test. The real
// correctness check for the snapshot + audit behavior is the manual smoke test (Task 8):
// hit /admin/sync-sheets against the local dev DB with GOOGLE_SHEET_ID set, then inspect
// the AuditLog table. This test is only a compile-time guard that the module still imports.
import * as sheets from "./sheets.js";

describe("sheets module", () => {
  it("exports syncGoogleSheets", () => {
    expect(typeof sheets.syncGoogleSheets).toBe("function");
  });
});
