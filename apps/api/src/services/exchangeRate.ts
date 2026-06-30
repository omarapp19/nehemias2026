let cachedRate = 623.03; // tasa por defecto (fallback oficial)
let lastFetchedAt = 0;
const CACHE_TTL = 1000 * 60 * 60 * 2; // 2 horas de cache en memoria

export async function getExchangeRate(): Promise<number> {
  const now = Date.now();
  if (now - lastFetchedAt < CACHE_TTL) {
    return cachedRate;
  }

  try {
    const res = await fetch("https://ve.dolarapi.com/v1/dolares/oficial");
    if (!res.ok) {
      throw new Error(`DolarApi respondió ${res.status}`);
    }
    const data = (await res.json()) as { promedio?: number; venta?: number };
    const rate = data.promedio ?? data.venta;
    if (rate && typeof rate === "number" && rate > 0) {
      cachedRate = Math.round(rate * 100) / 100;
      lastFetchedAt = now;
      console.log(`[api] Tasa de cambio actualizada desde DolarApi: 1 USD = ${cachedRate} VES`);
    }
  } catch (err) {
    console.error("[api] Error al consultar tasa en DolarApi, usando fallback:", err);
    // Reintentar en 5 minutos en lugar de inundar el log o ralentizar cada request
    lastFetchedAt = now - CACHE_TTL + 1000 * 60 * 5;
  }

  return cachedRate;
}
