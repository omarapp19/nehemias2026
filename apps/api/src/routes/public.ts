import { Router } from "express";
import rateLimit from "express-rate-limit";
import { declareDonationSchema } from "@nehemias/core";
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
    const [{ balances, exchangeRate }, urgentes, donaciones, egresos, captacion, fotos] = await Promise.all([
      getBalances(),
      listUrgentSupplies(),
      listPublicVerifiedDonations(),
      listPublicExpenses(),
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
      ultimasDonaciones: donaciones,
      ultimosEgresos: egresos,
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
  asyncHandler(async (_req, res) =>
    res.json({ donaciones: await listPublicVerifiedDonations(100) }),
  ),
);

publicRouter.get(
  "/egresos",
  asyncHandler(async (_req, res) => res.json({ egresos: await listPublicExpenses(100) })),
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
  asyncHandler(async (_req, res) => {
    const fotos = await prisma.galleryPhoto.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.json({ fotos });
  }),
);

publicRouter.get(
  "/captacion",
  asyncHandler(async (_req, res) => res.json({ captacion: await listActivePaymentInfo() })),
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
