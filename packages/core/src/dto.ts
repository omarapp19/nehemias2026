import type { Currency } from "./currency.js";
import { nivelStock, type NivelStock } from "./balance.js";
import { money, num, type DecimalLike } from "./num.js";

/**
 * ──────────────────────────────────────────────────────────────────────────
 *  DTOs PÚBLICOS — la única forma en que la API pública serializa datos.
 *  Por construcción NO incluyen campos privados (donorContact, proofUrl,
 *  passwordHash, etc.). Si un dato sensible no se mapea aquí, no puede
 *  filtrarse a la cara pública.
 * ──────────────────────────────────────────────────────────────────────────
 */

function iso(d: Date | string): string {
  return typeof d === "string" ? d : d.toISOString();
}

// ---------- DONACIONES ----------
export interface DonationRow {
  id: string;
  type: "financial" | "in_kind";
  status: "pending" | "verified" | "rejected";
  amount: DecimalLike;
  currency: Currency;
  method: string | null;
  referenceNumber: string | null;
  exchangeRate: DecimalLike | null;
  donorName: string | null;
  isAnonymous: boolean;
  donorContact: string | null; // PRIVADO
  message: string | null;
  proofUrl: string | null; // PRIVADO
  declaredByPublic: boolean;
  verifiedAt: Date | string | null;
  donatedAt: Date | string;
  createdAt: Date | string;
}

export interface PublicDonation {
  id: string;
  type: "financial" | "in_kind";
  amount: number | null;
  currency: Currency;
  method: string | null;
  referenceNumber: string | null;
  exchangeRate: number | null;
  donorDisplay: string; // nombre o "Anónimo" — jamás el contacto
  message: string | null;
  donatedAt: string;
  proofUrl: string | null;
}

/** Nombre a mostrar respetando el anonimato de punta a punta. */
export function donorDisplay(d: Pick<DonationRow, "isAnonymous" | "donorName">): string {
  if (d.isAnonymous) return "Anónimo";
  return d.donorName?.trim() || "Donante";
}

/** Mapea una donación a su forma PÚBLICA (omite contacto). */
export function toPublicDonation(d: DonationRow): PublicDonation {
  return {
    id: d.id,
    type: d.type,
    amount: d.type === "financial" ? money(d.amount) : null,
    currency: d.currency,
    method: d.method,
    referenceNumber: d.referenceNumber,
    exchangeRate: money(d.exchangeRate),
    donorDisplay: donorDisplay(d),
    message: d.message,
    donatedAt: iso(d.donatedAt),
    proofUrl: d.proofUrl,
  };
}

export interface AdminDonation extends PublicDonation {
  status: "pending" | "verified" | "rejected";
  donorName: string | null;
  isAnonymous: boolean;
  donorContact: string | null;
  proofUrl: string | null;
  declaredByPublic: boolean;
  verifiedAt: string | null;
  createdAt: string;
}

/** Forma completa para el panel admin (incluye campos privados; solo tras auth). */
export function toAdminDonation(d: DonationRow): AdminDonation {
  return {
    ...toPublicDonation(d),
    status: d.status,
    donorName: d.donorName,
    isAnonymous: d.isAnonymous,
    donorContact: d.donorContact,
    proofUrl: d.proofUrl,
    declaredByPublic: d.declaredByPublic,
    verifiedAt: d.verifiedAt ? iso(d.verifiedAt) : null,
    createdAt: iso(d.createdAt),
  };
}

// ---------- EGRESOS ----------
export interface ExpenseRow {
  id: string;
  description: string;
  amount: DecimalLike;
  currency: Currency;
  category: string | null;
  supplier: string | null;
  invoiceUrl: string | null; // PÚBLICA (prueba de auditoría)
  invoiceNumber?: string | null;
  createsStock: boolean;
  spentAt: Date | string;
  exchangeRate?: DecimalLike | null;
}

export interface PublicExpense {
  id: string;
  description: string;
  amount: number;
  currency: Currency;
  category: string | null;
  supplier: string | null;
  invoiceUrl: string | null; // sí pública
  invoiceNumber?: string | null;
  spentAt: string;
  exchangeRate: number | null;
}

export function toPublicExpense(e: ExpenseRow): PublicExpense {
  return {
    id: e.id,
    description: e.description,
    amount: money(e.amount),
    currency: e.currency,
    category: e.category,
    supplier: e.supplier,
    invoiceUrl: e.invoiceUrl,
    invoiceNumber: e.invoiceNumber,
    spentAt: iso(e.spentAt),
    exchangeRate: money(e.exchangeRate),
  };
}

// ---------- INVENTARIO ----------
export interface SupplyRow {
  id: string;
  name: string;
  category: string | null;
  unit: string;
  currentStock: DecimalLike;
  minThreshold: DecimalLike;
  isUrgent: boolean;
  origin: string | null;
}

export interface PublicSupply {
  id: string;
  name: string;
  category: string | null;
  unit: string;
  currentStock: number;
  minThreshold: number;
  isUrgent: boolean;
  nivel: NivelStock;
}

export function toPublicSupply(s: SupplyRow): PublicSupply {
  return {
    id: s.id,
    name: s.name,
    category: s.category,
    unit: s.unit,
    currentStock: money(s.currentStock),
    minThreshold: money(s.minThreshold),
    isUrgent: s.isUrgent,
    nivel: nivelStock(s.currentStock, s.minThreshold),
  };
}

// ---------- FRENTES ----------
export interface FrenteRow {
  id: string;
  name: string;
  type: string;
  location: string | null;
  description: string | null;
}
export type PublicFrente = FrenteRow;
export function toPublicFrente(f: FrenteRow): PublicFrente {
  return {
    id: f.id,
    name: f.name,
    type: f.type,
    location: f.location,
    description: f.description,
  };
}

// ---------- ENTREGAS ----------
export interface DeliveryItemRow {
  id: string;
  description: string;
  quantity: DecimalLike;
  unit: string;
}
export interface DeliveryPhotoRow {
  id: string;
  url: string;
  caption: string | null;
}
export interface DeliveryRow {
  id: string;
  title: string;
  notes: string | null;
  deliveredAt: Date | string;
  frente: FrenteRow;
  items: DeliveryItemRow[];
  photos: DeliveryPhotoRow[];
}

export interface PublicDelivery {
  id: string;
  title: string;
  notes: string | null;
  deliveredAt: string;
  frente: PublicFrente;
  items: { id: string; description: string; quantity: number; unit: string }[];
  photos: DeliveryPhotoRow[];
}

export function toPublicDelivery(d: DeliveryRow): PublicDelivery {
  return {
    id: d.id,
    title: d.title,
    notes: d.notes,
    deliveredAt: iso(d.deliveredAt),
    frente: toPublicFrente(d.frente),
    items: d.items.map((i) => ({
      id: i.id,
      description: i.description,
      quantity: num(i.quantity),
      unit: i.unit,
    })),
    photos: d.photos,
  };
}

// ---------- CAPTACIÓN ----------
export interface PaymentInfoRow {
  id: string;
  label: string;
  details: string;
  sortOrder: number;
  defaultCurrency: "USD" | "VES";
}
export type PublicPaymentInfo = PaymentInfoRow;
export function toPublicPaymentInfo(p: PaymentInfoRow): PublicPaymentInfo {
  return {
    id: p.id,
    label: p.label,
    details: p.details,
    sortOrder: p.sortOrder,
    defaultCurrency: p.defaultCurrency,
  };
}
