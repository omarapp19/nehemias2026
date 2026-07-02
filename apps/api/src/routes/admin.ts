import { Router } from "express";
import {
  adminCreateDonationSchema,
  adminUpdateDonationSchema,
  reviewDonationSchema,
  expenseSchema,
  expenseUpdateSchema,
  supplySchema,
  supplyUpdateSchema,
  paymentInfoSchema,
} from "@nehemias/core";
import { prisma } from "@nehemias/db";
import fs from "node:fs";
import path from "node:path";
import { resolveStoredPath } from "../uploads/storage.js";
import { asyncHandler, ApiError } from "../http.js";
import { requireAdmin } from "../auth/middleware.js";
import { upload } from "../uploads/middleware.js";
import { processAndStore } from "../uploads/images.js";
import {
  adminCreateDonation,
  reviewDonation,
  listAdminDonations,
  updateDonation,
  deleteDonation,
} from "../services/donations.js";
import { createExpense, listPublicExpenses, updateExpense, deleteExpense } from "../services/expenses.js";
import {
  listSupplies,
  createSupply,
  updateSupply,
  deleteSupply,
} from "../services/inventory.js";

import {
  listAllPaymentInfo,
  createPaymentInfo,
  updatePaymentInfo,
  deletePaymentInfo,
} from "../services/paymentInfo.js";
import { getSettings, updateSetting } from "../services/settings.js";
import { syncGoogleSheets } from "../services/sheets.js";

export const adminRouter = Router();

// Toda esta sección exige sesión admin.
adminRouter.use(requireAdmin);

function parseMaybeJson<T>(value: unknown): T | undefined {
  if (typeof value !== "string" || value.trim() === "") return undefined;
  try {
    return JSON.parse(value) as T;
  } catch {
    return undefined;
  }
}

function adminId(req: { admin?: { sub: string } }): string {
  if (!req.admin) throw new ApiError(401, "Necesitas iniciar sesión.");
  return req.admin.sub;
}

// ---------- DONACIONES ----------
adminRouter.get(
  "/donaciones",
  asyncHandler(async (req, res) => {
    const status = req.query.status as "pending" | "verified" | "rejected" | undefined;
    res.json({ donaciones: await listAdminDonations(status) });
  }),
);

adminRouter.post(
  "/donaciones",
  upload.single("proof"),
  asyncHandler(async (req, res) => {
    const input = adminCreateDonationSchema.parse({
      ...req.body,
      inKindItems: parseMaybeJson(req.body.inKindItems),
    });
    let proofUrl: string | undefined;
    if (req.file) proofUrl = await processAndStore("proofs", req.file);
    const donacion = await adminCreateDonation(input, adminId(req), proofUrl);
    res.status(201).json({ donacion });
  }),
);

adminRouter.post(
  "/donaciones/:id/revisar",
  asyncHandler(async (req, res) => {
    const { action } = reviewDonationSchema.parse(req.body);
    const donacion = await reviewDonation(req.params.id, action, adminId(req));
    res.json({ donacion });
  }),
);

adminRouter.put(
  "/donaciones/:id",
  upload.single("proof"),
  asyncHandler(async (req, res) => {
    const input = adminUpdateDonationSchema.parse({
      ...req.body,
      inKindItems: parseMaybeJson(req.body.inKindItems),
    });
    let proofUrl: string | undefined;
    if (req.file) proofUrl = await processAndStore("proofs", req.file);
    const donacion = await updateDonation(req.params.id, input, proofUrl);
    res.json({ donacion });
  }),
);

adminRouter.delete(
  "/donaciones/:id",
  asyncHandler(async (req, res) => {
    await deleteDonation(req.params.id);
    res.json({ ok: true });
  }),
);

// ---------- EGRESOS ----------
adminRouter.get(
  "/egresos",
  asyncHandler(async (_req, res) => res.json({ egresos: await listPublicExpenses(200) })),
);

adminRouter.post(
  "/egresos",
  upload.single("invoice"),
  asyncHandler(async (req, res) => {
    const input = expenseSchema.parse(req.body);
    let invoiceUrl: string | undefined;
    if (req.file) invoiceUrl = await processAndStore("invoices", req.file);
    const egreso = await createExpense(input, adminId(req), invoiceUrl);
    res.status(201).json({ egreso });
  }),
);

adminRouter.put(
  "/egresos/:id",
  upload.single("invoice"),
  asyncHandler(async (req, res) => {
    const input = expenseUpdateSchema.parse(req.body);
    let invoiceUrl: string | undefined;
    if (req.file) invoiceUrl = await processAndStore("invoices", req.file);
    const egreso = await updateExpense(req.params.id, input, invoiceUrl);
    res.json({ egreso });
  }),
);

adminRouter.delete(
  "/egresos/:id",
  asyncHandler(async (req, res) => {
    await deleteExpense(req.params.id);
    res.json({ ok: true });
  }),
);

// ---------- INVENTARIO ----------
adminRouter.get(
  "/insumos",
  asyncHandler(async (_req, res) => res.json({ insumos: await listSupplies() })),
);

adminRouter.post(
  "/insumos",
  asyncHandler(async (req, res) => {
    const input = supplySchema.parse(req.body);
    res.status(201).json({ insumo: await createSupply(input) });
  }),
);

adminRouter.patch(
  "/insumos/:id",
  asyncHandler(async (req, res) => {
    const input = supplyUpdateSchema.parse(req.body);
    res.json({ insumo: await updateSupply(req.params.id, input) });
  }),
);

adminRouter.delete(
  "/insumos/:id",
  asyncHandler(async (req, res) => {
    await deleteSupply(req.params.id);
    res.json({ ok: true });
  }),
);


// ---------- GALERÍA ----------
adminRouter.get(
  "/galeria",
  asyncHandler(async (_req, res) => {
    const fotos = await prisma.galleryPhoto.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.json({ fotos });
  }),
);

adminRouter.post(
  "/galeria",
  upload.array("photos", 24),
  asyncHandler(async (req, res) => {
    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    const created = [];
    for (const f of files) {
      const url = await processAndStore("gallery", f);
      const title = f.originalname
        .replace(/\.[^/.]+$/, "")
        .replace(/^#/, "")
        .trim();
      const photo = await prisma.galleryPhoto.create({
        data: {
          url,
          title: title || null,
        },
      });
      created.push(photo);
    }
    res.status(201).json({ fotos: created });
  }),
);

adminRouter.delete(
  "/galeria/:id",
  asyncHandler(async (req, res) => {
    const photo = await prisma.galleryPhoto.findUnique({
      where: { id: req.params.id },
    });
    if (!photo) throw new ApiError(404, "Foto no encontrada.");

    const absPath = resolveStoredPath("gallery", path.basename(photo.url));
    if (absPath && fs.existsSync(absPath)) {
      fs.unlinkSync(absPath);
    }

    await prisma.galleryPhoto.delete({
      where: { id: req.params.id },
    });
    res.json({ ok: true });
  }),
);


// ---------- CAPTACIÓN ----------
adminRouter.get(
  "/captacion",
  asyncHandler(async (_req, res) => res.json({ captacion: await listAllPaymentInfo() })),
);

adminRouter.post(
  "/captacion",
  asyncHandler(async (req, res) => {
    const input = paymentInfoSchema.parse(req.body);
    res.status(201).json({ captacion: await createPaymentInfo(input) });
  }),
);

adminRouter.put(
  "/captacion/:id",
  asyncHandler(async (req, res) => {
    const input = paymentInfoSchema.parse(req.body);
    res.json({ captacion: await updatePaymentInfo(req.params.id, input) });
  }),
);

adminRouter.delete(
  "/captacion/:id",
  asyncHandler(async (req, res) => {
    await deletePaymentInfo(req.params.id);
    res.json({ ok: true });
  }),
);

// ---------- SYSTEM SETTINGS ----------
adminRouter.get(
  "/settings",
  asyncHandler(async (_req, res) => {
    res.json({ settings: await getSettings() });
  }),
);

adminRouter.put(
  "/settings",
  asyncHandler(async (req, res) => {
    const { contact_phone, contact_email, contact_sede } = req.body;
    if (typeof contact_phone === "string") await updateSetting("contact_phone", contact_phone);
    if (typeof contact_email === "string") await updateSetting("contact_email", contact_email);
    if (typeof contact_sede === "string") await updateSetting("contact_sede", contact_sede);
    res.json({ settings: await getSettings() });
  }),
);

// ---------- SINCRONIZACIÓN GOOGLE SHEETS ----------
adminRouter.post(
  "/sync-sheets",
  asyncHandler(async (_req, res) => {
    const sheetId = process.env.GOOGLE_SHEET_ID?.trim();
    const donationsGid = process.env.GOOGLE_SHEET_DONATIONS_GID?.trim() ?? "616098203";
    const expensesGid = process.env.GOOGLE_SHEET_EXPENSES_GID?.trim() ?? "0";

    if (!sheetId) {
      throw new ApiError(400, "GOOGLE_SHEET_ID no está configurado en las variables de entorno.");
    }

    const result = await syncGoogleSheets(sheetId, donationsGid, expensesGid);
    res.json({
      success: true,
      message: "Sincronización exitosa con Google Sheets.",
      ...result,
    });
  }),
);
