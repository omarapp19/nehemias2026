import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { createTestApp, resetDb } from "./helpers.js";

beforeEach(async () => {
  await resetDb();
});

describe("GET /files/:category/:filename public access", () => {
  it("allows unauthenticated access to invoices files (404 if missing)", async () => {
    const app = createTestApp();
    const res = await request(app).get("/files/invoices/does-not-exist.png");
    expect(res.status).toBe(404); // invoices are public; no auth needed, straight to not-found
  });

  it("allows unauthenticated access to deliveries files (404 if missing)", async () => {
    const app = createTestApp();
    const res = await request(app).get("/files/deliveries/does-not-exist.png");
    expect(res.status).toBe(404); // deliveries are public; no auth needed, straight to not-found
  });
});
