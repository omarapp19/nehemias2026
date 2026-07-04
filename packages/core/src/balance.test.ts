import { describe, it, expect } from "vitest";
import { computeBalances, nivelStock, esUrgente } from "./balance.js";

describe("computeBalances", () => {
  it("separates USD and VES, never mixing them", () => {
    const donaciones = [
      { currency: "USD" as const, amount: 100 },
      { currency: "VES" as const, amount: 500 },
    ];
    const egresos = [
      { currency: "USD" as const, amount: 40 },
      { currency: "VES" as const, amount: 200 },
    ];
    const result = computeBalances(donaciones, egresos);
    const usd = result.find((r) => r.currency === "USD")!;
    const ves = result.find((r) => r.currency === "VES")!;
    expect(usd).toEqual({ currency: "USD", recaudado: 100, invertido: 40, disponible: 60 });
    expect(ves).toEqual({ currency: "VES", recaudado: 500, invertido: 200, disponible: 300 });
  });

  it("handles negative disponible when egresos exceed donaciones", () => {
    const donaciones = [{ currency: "USD" as const, amount: 10 }];
    const egresos = [{ currency: "USD" as const, amount: 50 }];
    const result = computeBalances(donaciones, egresos);
    const usd = result.find((r) => r.currency === "USD")!;
    expect(usd.disponible).toBe(-40);
  });

  it("returns zeroed balances for empty input", () => {
    const result = computeBalances([], []);
    expect(result).toEqual([
      { currency: "USD", recaudado: 0, invertido: 0, disponible: 0 },
      { currency: "VES", recaudado: 0, invertido: 0, disponible: 0 },
    ]);
  });
});

describe("nivelStock", () => {
  it("returns agotado when stock is zero or negative", () => {
    expect(nivelStock(0, 10)).toBe("agotado");
    expect(nivelStock(-5, 10)).toBe("agotado");
  });

  it("returns bajo when stock is positive but under threshold", () => {
    expect(nivelStock(5, 10)).toBe("bajo");
  });

  it("returns normal when stock meets or exceeds threshold", () => {
    expect(nivelStock(10, 10)).toBe("normal");
    expect(nivelStock(20, 10)).toBe("normal");
  });
});

describe("esUrgente", () => {
  it("is true only when stock is strictly below threshold", () => {
    expect(esUrgente(5, 10)).toBe(true);
    expect(esUrgente(10, 10)).toBe(false);
  });
});
