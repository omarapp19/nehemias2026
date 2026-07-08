import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { createTestApp, resetDb } from "./helpers.js";

beforeEach(async () => {
  await resetDb();
});

describe("GET /health", () => {
  it("responds ok", async () => {
    const app = createTestApp();
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, service: "nehemias-api" });
  });
});
