import { describe, it, expect } from "vitest";
import { donorDisplay, toPublicDonation, toAdminDonation, type DonationRow } from "./dto.js";

const baseDonation: DonationRow = {
  id: "d1",
  type: "financial",
  status: "verified",
  amount: 100,
  currency: "USD",
  method: "Zelle",
  referenceNumber: "REF1",
  exchangeRate: null,
  donorName: "María García",
  isAnonymous: false,
  donorContact: "maria@example.com",
  message: "Con cariño",
  proofUrl: "proofs/abc.png",
  declaredByPublic: true,
  verifiedAt: new Date("2026-01-01T00:00:00.000Z"),
  donatedAt: new Date("2025-12-31T00:00:00.000Z"),
  createdAt: new Date("2025-12-31T00:00:00.000Z"),
};

describe("donorDisplay", () => {
  it("shows Anónimo when isAnonymous is true, regardless of donorName", () => {
    expect(donorDisplay({ isAnonymous: true, donorName: "María" })).toBe("Anónimo");
  });

  it("shows the donor name when not anonymous", () => {
    expect(donorDisplay({ isAnonymous: false, donorName: "María" })).toBe("María");
  });

  it("falls back to Donante when name is missing and not anonymous", () => {
    expect(donorDisplay({ isAnonymous: false, donorName: null })).toBe("Donante");
  });
});

describe("toPublicDonation", () => {
  it("never includes donorContact", () => {
    const pub = toPublicDonation(baseDonation);
    expect(pub).not.toHaveProperty("donorContact");
  });

  it("computes donorDisplay instead of raw donorName", () => {
    const pub = toPublicDonation(baseDonation);
    expect(pub.donorDisplay).toBe("María García");
    expect(pub).not.toHaveProperty("donorName");
  });

  it("respects anonymity", () => {
    const anon = toPublicDonation({ ...baseDonation, isAnonymous: true });
    expect(anon.donorDisplay).toBe("Anónimo");
  });
});

describe("toAdminDonation", () => {
  it("includes donorContact for the admin view", () => {
    const admin = toAdminDonation(baseDonation);
    expect(admin.donorContact).toBe("maria@example.com");
  });

  it("never has a passwordHash field (not part of DonationRow)", () => {
    const admin = toAdminDonation(baseDonation);
    expect(admin).not.toHaveProperty("passwordHash");
  });
});
