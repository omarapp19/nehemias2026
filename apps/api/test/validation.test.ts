import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { createTestApp, resetDb } from "./helpers.js";

const EXPECTED_STATUS = 422; // confirmed from apps/api/src/http.ts line 32

beforeEach(async () => {
  await resetDb();
});

describe("POST /public/donaciones validation", () => {
  it("rejects a non-numeric amount", async () => {
    const app = createTestApp();
    const res = await request(app)
      .post("/public/donaciones")
      .type("form")
      .send({ type: "financial", amount: "not-a-number", currency: "USD", donorContact: "d@e.com" });
    expect(res.status).toBe(EXPECTED_STATUS);
  });

  it("rejects an invalid currency", async () => {
    const app = createTestApp();
    const res = await request(app)
      .post("/public/donaciones")
      .type("form")
      .send({ type: "financial", amount: "10", currency: "EUR", donorContact: "d@e.com" });
    expect(res.status).toBe(EXPECTED_STATUS);
  });

  it("rejects a financial donation missing amount", async () => {
    const app = createTestApp();
    const res = await request(app)
      .post("/public/donaciones")
      .type("form")
      .send({ type: "financial", currency: "USD", donorContact: "d@e.com" });
    expect(res.status).toBe(EXPECTED_STATUS);
  });
});
