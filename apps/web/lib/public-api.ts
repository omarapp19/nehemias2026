import type { PublicDonation, PublicExpense, PaginationMeta } from "@nehemias/core";
import { PUBLIC_API_BASE } from "./config";
import { buildQueryString } from "./api";

/**
 * Fetchers de navegador para la cara pública (paginación/filtros interactivos).
 * A diferencia de `lib/api.ts` (RSC, `INTERNAL_API_BASE`), estos corren en el cliente.
 */
async function getPublicJSON<T>(
  path: string,
  params?: Record<string, string | number | undefined>,
): Promise<T> {
  const res = await fetch(`${PUBLIC_API_BASE}${path}${buildQueryString(params)}`);
  if (!res.ok) {
    throw new Error(`API ${path} respondió ${res.status}`);
  }
  return (await res.json()) as T;
}

export const fetchDonacionesPublicas = (params?: {
  page?: number;
  limit?: number;
  type?: "financial" | "in_kind";
  method?: string;
  currency?: "USD" | "VES";
}) => getPublicJSON<{ donaciones: PublicDonation[]; meta: PaginationMeta }>("/public/donaciones", params);

export const fetchEgresosPublicos = (params?: {
  page?: number;
  limit?: number;
  category?: string;
  currency?: "USD" | "VES";
}) => getPublicJSON<{ egresos: PublicExpense[]; meta: PaginationMeta }>("/public/egresos", params);

export const fetchGaleriaPublica = (params?: { page?: number; limit?: number }) =>
  getPublicJSON<{
    fotos: { id: string; url: string; title: string | null; createdAt: string }[];
    meta: PaginationMeta;
  }>("/public/galeria", params);
