import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import argon2 from "argon2";
import { prisma } from "@nehemias/db";
import { signAdminToken } from "../src/auth/jwt.js";
import { SESSION_COOKIE } from "../src/auth/cookies.js";
import { createTestApp, resetDb } from "./helpers.js";

async function createAdminSessionCookie(): Promise<string> {
  const admin = await prisma.adminUser.create({
    data: {
      email: "admin@test.local",
      name: "Test Admin",
      passwordHash: await argon2.hash("irrelevant", { type: argon2.argon2id }),
      role: "admin",
    },
  });
  const token = signAdminToken({ sub: admin.id, role: admin.role, name: admin.name });
  return `${SESSION_COOKIE}=${token}`;
}

beforeEach(async () => {
  await resetDb();
});

describe("donation flow: pending -> verify -> balance", () => {
  it("only counts a donation toward the public balance after it is verified", async () => {
    const app = createTestApp();
    const cookie = await createAdminSessionCookie();

    const declareRes = await request(app)
      .post("/public/donaciones")
      .field("type", "financial")
      .field("amount", "100")
      .field("currency", "USD")
      .field("donorContact", "donor@example.com")
      .field("isAnonymous", "true");
    expect(declareRes.status).toBe(201);

    const pendingBalance = await request(app).get("/public/balances");
    const usdBefore = pendingBalance.body.balances.find(
      (b: { currency: string }) => b.currency === "USD",
    );
    expect(usdBefore.disponible).toBe(0);

    const adminList = await request(app)
      .get("/admin/donaciones?status=pending")
      .set("Cookie", cookie);
    expect(adminList.status).toBe(200);
    const donationId = adminList.body.donaciones[0].id;

    const verifyRes = await request(app)
      .post(`/admin/donaciones/${donationId}/revisar`)
      .set("Cookie", cookie)
      .set("Origin", "http://localhost:3000")
      .send({ action: "verify" });
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.donacion.status).toBe("verified");

    const verifiedBalance = await request(app).get("/public/balances");
    const usdAfter = verifiedBalance.body.balances.find(
      (b: { currency: string }) => b.currency === "USD",
    );
    expect(usdAfter.disponible).toBe(100);
  });
});
