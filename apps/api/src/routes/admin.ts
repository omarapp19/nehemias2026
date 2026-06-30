import { Router } from "express";
import {
  adminCreateDonationSchema,
  adminUpdateDonationSchema,
  reviewDonationSchema,
  expenseSchema,
  expenseUpdateSchema,
  supplySchema,
  supplyUpdateSchema,
  frenteSchema,
  deliverySchema,
  paymentInfoSchema,
} from "@nehemias/core";
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
import { listFrentes, createFrente, updateFrente, deleteFrente } from "../services/frentes.js";
import { createDelivery, listPublicDeliveries } from "../services/deliveries.js";
import {
  listAllPaymentInfo,
  createPaymentInfo,
  updatePaymentInfo,
  deletePaymentInfo,
} from "../services/paymentInfo.js";

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

// ---------- FRENTES ----------
adminRouter.get(
  "/frentes",
  asyncHandler(async (_req, res) => res.json({ frentes: await listFrentes() })),
);

adminRouter.post(
  "/frentes",
  asyncHandler(async (req, res) => {
    const input = frenteSchema.parse(req.body);
    res.status(201).json({ frente: await createFrente(input) });
  }),
);

adminRouter.put(
  "/frentes/:id",
  asyncHandler(async (req, res) => {
    const input = frenteSchema.parse(req.body);
    res.json({ frente: await updateFrente(req.params.id, input) });
  }),
);

adminRouter.delete(
  "/frentes/:id",
  asyncHandler(async (req, res) => {
    await deleteFrente(req.params.id);
    res.json({ ok: true });
  }),
);

// ---------- ENTREGAS ----------
adminRouter.get(
  "/entregas",
  asyncHandler(async (_req, res) => res.json({ entregas: await listPublicDeliveries(200) })),
);

adminRouter.post(
  "/entregas",
  upload.array("photos", 12),
  asyncHandler(async (req, res) => {
    const input = deliverySchema.parse({
      ...req.body,
      items: parseMaybeJson(req.body.items) ?? [],
    });
    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    const photoUrls: string[] = [];
    for (const f of files) {
      photoUrls.push(await processAndStore("deliveries", f));
    }
    const entrega = await createDelivery(input, adminId(req), photoUrls);
    res.status(201).json({ entrega });
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
