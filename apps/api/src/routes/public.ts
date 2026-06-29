import { Router } from "express";
import rateLimit from "express-rate-limit";
import { declareDonationSchema } from "@nehemias/core";
import { asyncHandler, ApiError } from "../http.js";
import { upload } from "../uploads/middleware.js";
import { processAndStore } from "../uploads/images.js";
import {
  declareDonation,
  listPublicVerifiedDonations,
} from "../services/donations.js";
import { listPublicExpenses } from "../services/expenses.js";
import { listSupplies, listUrgentSupplies } from "../services/inventory.js";
import { listFrentes } from "../services/frentes.js";
import { listPublicDeliveries, getPublicDelivery } from "../services/deliveries.js";
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

// ---------- Lecturas públicas ----------
publicRouter.get(
  "/home",
  asyncHandler(async (_req, res) => {
    const [balances, urgentes, donaciones, egresos, entregas, captacion] = await Promise.all([
      getBalances(),
      listUrgentSupplies(),
      listPublicVerifiedDonations(6),
      listPublicExpenses(6),
      listPublicDeliveries(4),
      listActivePaymentInfo(),
    ]);
    res.json({
      balances,
      urgentes: urgentes.map(toPublicSupply),
      ultimasDonaciones: donaciones,
      ultimosEgresos: egresos,
      ultimasEntregas: entregas,
      captacion,
    });
  }),
);

publicRouter.get(
  "/balances",
  asyncHandler(async (_req, res) => res.json({ balances: await getBalances() })),
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
  "/frentes",
  asyncHandler(async (_req, res) => res.json({ frentes: await listFrentes() })),
);

publicRouter.get(
  "/entregas",
  asyncHandler(async (_req, res) =>
    res.json({ entregas: await listPublicDeliveries(100) }),
  ),
);

publicRouter.get(
  "/entregas/:id",
  asyncHandler(async (req, res) => {
    const entrega = await getPublicDelivery(req.params.id);
    if (!entrega) throw new ApiError(404, "Entrega no encontrada.");
    res.json({ entrega });
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
