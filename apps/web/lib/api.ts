import type {
  CurrencyBalance,
  PublicDonation,
  PublicExpense,
  PublicSupply,
  PublicPaymentInfo,
  PaginationMeta,
} from "@nehemias/core";
import { INTERNAL_API_BASE } from "./config";

/**
 * Fetchers de servidor (RSC) para la cara pública.
 * `cache: "no-store"` → siempre datos frescos: la transparencia es en tiempo real.
 */
async function getJSON<T>(path: string, params?: object): Promise<T> {
  const qs = buildQueryString(params);
  const res = await fetch(`${INTERNAL_API_BASE}${path}${qs}`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`API ${path} respondió ${res.status}`);
  }
  return (await res.json()) as T;
}

/** Arma un querystring omitiendo valores undefined/vacíos. */
export function buildQueryString(params?: object): string {
  if (!params) return "";
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params as Record<string, unknown>)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export interface DonationListParams {
  page?: number;
  limit?: number;
  type?: "financial" | "in_kind";
  method?: string;
  currency?: "USD" | "VES";
  from?: string;
  to?: string;
}

export interface ExpenseListParams {
  page?: number;
  limit?: number;
  category?: string;
  currency?: "USD" | "VES";
  from?: string;
  to?: string;
}

export interface GalleryListParams {
  page?: number;
  limit?: number;
}

export interface HomeSnapshot {
  balances: CurrencyBalance[];
  exchangeRate: number;
  urgentes: PublicSupply[];
  ultimasDonaciones: PublicDonation[];
  ultimosEgresos: PublicExpense[];
  captacion: PublicPaymentInfo[];
  ultimasFotos: { id: string; url: string; title: string | null; createdAt: string }[];
}

export const getHome = () => getJSON<HomeSnapshot>("/public/home");

export const getBalances = () =>
  getJSON<{ balances: CurrencyBalance[]; exchangeRate: number }>("/public/balances");

export const getDonaciones = (params?: DonationListParams) =>
  getJSON<{ donaciones: PublicDonation[]; meta: PaginationMeta }>("/public/donaciones", params);

export const getEgresos = (params?: ExpenseListParams) =>
  getJSON<{ egresos: PublicExpense[]; meta: PaginationMeta }>("/public/egresos", params);

export const getInsumos = () => getJSON<{ insumos: PublicSupply[] }>("/public/insumos");

export const getNecesidades = () =>
  getJSON<{ necesidades: PublicSupply[] }>("/public/necesidades");

export const getGaleria = (params?: GalleryListParams) =>
  getJSON<{
    fotos: { id: string; url: string; title: string | null; createdAt: string }[];
    meta: PaginationMeta;
  }>("/public/galeria", params);

export const getCaptacion = () =>
  getJSON<{ captacion: PublicPaymentInfo[] }>("/public/captacion");

export const getSettings = () =>
  getJSON<{ settings: Record<string, string> }>("/public/settings");
