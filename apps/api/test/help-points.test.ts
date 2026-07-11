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

describe("help points: admin CRUD + public visibility", () => {
  it("only lists active help points on the public endpoint", async () => {
    const app = createTestApp();
    const cookie = await createAdminSessionCookie();

    const createRes = await request(app)
      .post("/admin/puntos-ayuda")
      .set("Cookie", cookie)
      .set("Origin", "http://localhost:3000")
      .send({
        name: "Cruz Roja La Guaira",
        type: "organization",
        description: "Entrega de agua potable y kits de higiene.",
        contactPhone: "+58 412 555 0000",
        contactEmail: "ayuda@cruzroja.org",
        lat: 10.6017,
        lng: -66.9308,
      });
    expect(createRes.status).toBe(201);
    const id = createRes.body.puntoAyuda.id;

    const publicListBefore = await request(app).get("/public/puntos-ayuda");
    expect(publicListBefore.body.puntosAyuda).toHaveLength(1);
    expect(publicListBefore.body.puntosAyuda[0]).not.toHaveProperty("isActive");

    const deactivateRes = await request(app)
      .put(`/admin/puntos-ayuda/${id}`)
      .set("Cookie", cookie)
      .set("Origin", "http://localhost:3000")
      .send({ isActive: false });
    expect(deactivateRes.status).toBe(200);

    const publicListAfter = await request(app).get("/public/puntos-ayuda");
    expect(publicListAfter.body.puntosAyuda).toHaveLength(0);

    const adminList = await request(app).get("/admin/puntos-ayuda").set("Cookie", cookie);
    expect(adminList.body.puntosAyuda).toHaveLength(1);
  });

  it("rejects invalid coordinates and type", async () => {
    const app = createTestApp();
    const cookie = await createAdminSessionCookie();

    const res = await request(app)
      .post("/admin/puntos-ayuda")
      .set("Cookie", cookie)
      .set("Origin", "http://localhost:3000")
      .send({
        name: "Punto inválido",
        type: "empresa",
        description: "x",
        lat: 200,
        lng: -66.93,
      });
    expect(res.status).toBe(422);
  });

  it("deletes a help point", async () => {
    const app = createTestApp();
    const cookie = await createAdminSessionCookie();

    const createRes = await request(app)
      .post("/admin/puntos-ayuda")
      .set("Cookie", cookie)
      .set("Origin", "http://localhost:3000")
      .send({
        name: "Juan Pérez",
        type: "person",
        description: "Refugio temporal con 3 habitaciones disponibles.",
        lat: 10.5,
        lng: -67.0,
      });
    const id = createRes.body.puntoAyuda.id;

    const deleteRes = await request(app)
      .delete(`/admin/puntos-ayuda/${id}`)
      .set("Cookie", cookie)
      .set("Origin", "http://localhost:3000");
    expect(deleteRes.status).toBe(200);

    const list = await request(app).get("/admin/puntos-ayuda").set("Cookie", cookie);
    expect(list.body.puntosAyuda).toHaveLength(0);
  });
});
