import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { createTestApp, resetDb } from "./helpers.js";

beforeEach(async () => {
  await resetDb();
});

describe("POST /public/donaciones rate limiting", () => {
  it("returns 429 after exceeding the configured max (10) requests in the window", async () => {
    const app = createTestApp();
    const payload = {
      type: "financial",
      amount: "10",
      currency: "USD",
      donorContact: "donor@example.com",
      isAnonymous: "true",
    };

    let lastStatus = 0;
    for (let i = 0; i < 11; i++) {
      const res = await request(app)
        .post("/public/donaciones")
        .type("form")
        .send(payload);
      lastStatus = res.status;
    }
    expect(lastStatus).toBe(429);
  }, 20000);
});
