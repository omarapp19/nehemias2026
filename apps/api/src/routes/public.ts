import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  declareDonationSchema,
  donationQuerySchema,
  expenseQuerySchema,
  galleryQuerySchema,
  buildMeta,
} from "@nehemias/core";
import { prisma } from "@nehemias/db";
import { asyncHandler, ApiError } from "../http.js";
import { upload } from "../uploads/middleware.js";
import { processAndStore } from "../uploads/images.js";
import {
  declareDonation,
  listPublicVerifiedDonations,
} from "../services/donations.js";
import { listPublicExpenses } from "../services/expenses.js";
import { listSupplies, listUrgentSupplies } from "../services/inventory.js";
import { getBalances } from "../services/transparency.js";
import { listActivePaymentInfo } from "../services/paymentInfo.js";
import { getSettings } from "../services/settings.js";
import { toPublicSupply } from "@nehemias/core";

export const publicRouter = Router();

// Limita el endpoint público de escritura (declarar donación): anti-spam.
const declareLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiados intentos. Espera unos minutos e inténtalo de nuevo." },
});

function parseMaybeJson<T>(value: unknown): T | undefined {
  if (typeof value !== "string" || value.trim() === "") return undefined;
  try {
    return JSON.parse(value) as T;
  } catch {
    return undefined;
  }
}

publicRouter.get(
  "/home",
  asyncHandler(async (_req, res) => {
    const homeListQuery = { page: 1, limit: 20 } as const;
    const [{ balances, exchangeRate }, urgentes, donaciones, egresos, captacion, fotos] = await Promise.all([
      getBalances(),
      listUrgentSupplies(),
      listPublicVerifiedDonations(homeListQuery),
      listPublicExpenses(homeListQuery),
      listActivePaymentInfo(),
      prisma.galleryPhoto.findMany({
        take: 8,
        orderBy: { createdAt: "desc" },
      }),
    ]);
    res.json({
      balances,
      exchangeRate,
      urgentes: urgentes.map(toPublicSupply),
      ultimasDonaciones: donaciones.data,
      ultimosEgresos: egresos.data,
      captacion,
      ultimasFotos: fotos,
    });
  }),
);

publicRouter.get(
  "/balances",
  asyncHandler(async (_req, res) => {
    const result = await getBalances();
    res.json(result);
  }),
);

publicRouter.get(
  "/donaciones",
  asyncHandler(async (req, res) => {
    const query = donationQuerySchema.parse(req.query);
    const { data, meta } = await listPublicVerifiedDonations(query);
    res.json({ donaciones: data, meta });
  }),
);

publicRouter.get(
  "/egresos",
  asyncHandler(async (req, res) => {
    const query = expenseQuerySchema.parse(req.query);
    const { data, meta } = await listPublicExpenses(query);
    res.json({ egresos: data, meta });
  }),
);

publicRouter.get(
  "/insumos",
  asyncHandler(async (_req, res) => {
    const supplies = await listSupplies();
    res.json({ insumos: supplies.map(toPublicSupply) });
  }),
);

publicRouter.get(
  "/necesidades",
  asyncHandler(async (_req, res) => {
    const urgentes = await listUrgentSupplies();
    res.json({ necesidades: urgentes.map(toPublicSupply) });
  }),
);


publicRouter.get(
  "/galeria",
  asyncHandler(async (req, res) => {
    const { page, limit } = galleryQuerySchema.parse(req.query);
    const [fotos, total] = await Promise.all([
      prisma.galleryPhoto.findMany({
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.galleryPhoto.count(),
    ]);
    res.json({ fotos, meta: buildMeta(page, limit, total) });
  }),
);

publicRouter.get(
  "/captacion",
  asyncHandler(async (_req, res) => res.json({ captacion: await listActivePaymentInfo() })),
);

publicRouter.get(
  "/settings",
  asyncHandler(async (_req, res) => res.json({ settings: await getSettings() })),
);

// ---------- Camino B: el público declara su donación ----------
publicRouter.post(
  "/donaciones",
  declareLimiter,
  upload.single("proof"),
  asyncHandler(async (req, res) => {
    const body = {
      ...req.body,
      inKindItems: parseMaybeJson(req.body.inKindItems),
    };
    const input = declareDonationSchema.parse(body);

    let proofUrl: string | undefined;
    if (req.file) {
      proofUrl = await processAndStore("proofs", req.file);
    }

    await declareDonation(input, proofUrl);
    // No devolvemos datos sensibles; solo confirmamos.
    res.status(201).json({
      ok: true,
      mensaje: "¡Gracias! Tu donación quedó registrada y será verificada pronto.",
    });
  }),
);
