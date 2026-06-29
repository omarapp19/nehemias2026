import type {
  CurrencyBalance,
  PublicDonation,
  PublicExpense,
  PublicSupply,
  PublicFrente,
  PublicDelivery,
  PublicPaymentInfo,
} from "@nehemias/core";
import { INTERNAL_API_BASE } from "./config";

/**
 * Fetchers de servidor (RSC) para la cara pública.
 * `cache: "no-store"` → siempre datos frescos: la transparencia es en tiempo real.
 */
async function getJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${INTERNAL_API_BASE}${path}`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`API ${path} respondió ${res.status}`);
  }
  return (await res.json()) as T;
}

export interface HomeSnapshot {
  balances: CurrencyBalance[];
  urgentes: PublicSupply[];
  ultimasDonaciones: PublicDonation[];
  ultimosEgresos: PublicExpense[];
  ultimasEntregas: PublicDelivery[];
  captacion: PublicPaymentInfo[];
}

export const getHome = () => getJSON<HomeSnapshot>("/public/home");

export const getBalances = () =>
  getJSON<{ balances: CurrencyBalance[] }>("/public/balances");

export const getDonaciones = () =>
  getJSON<{ donaciones: PublicDonation[] }>("/public/donaciones");

export const getEgresos = () => getJSON<{ egresos: PublicExpense[] }>("/public/egresos");

export const getInsumos = () => getJSON<{ insumos: PublicSupply[] }>("/public/insumos");

export const getNecesidades = () =>
  getJSON<{ necesidades: PublicSupply[] }>("/public/necesidades");

export const getFrentes = () => getJSON<{ frentes: PublicFrente[] }>("/public/frentes");

export const getEntregas = () =>
  getJSON<{ entregas: PublicDelivery[] }>("/public/entregas");

export const getEntrega = (id: string) =>
  getJSON<{ entrega: PublicDelivery }>(`/public/entregas/${id}`);

export const getCaptacion = () =>
  getJSON<{ captacion: PublicPaymentInfo[] }>("/public/captacion");
