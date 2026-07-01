"use client";

import { useState, useEffect } from "react";
import { Button, Field, Input, Select, Textarea, IconCheck, IconCamera } from "@nehemias/ui";
import { PUBLIC_API_BASE } from "@/lib/config";

type Estado = "idle" | "enviando" | "ok" | "error";

export function DonarForm() {
  const [estado, setEstado] = useState<Estado>("idle");
  const [anonimo, setAnonimo] = useState(false);
  const [error, setError] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const [metodos, setMetodos] = useState<{ id: string; label: string; isActive: boolean; defaultCurrency?: "USD" | "VES" }[]>([]);

  // Form states matching user request
  const [tipoAporte, setTipoAporte] = useState<"financial" | "in_kind">("financial");
  const [montoOriginal, setMontoOriginal] = useState("");
  const [moneda, setMoneda] = useState<"USD" | "VES">("USD");
  const [rateInput, setRateInput] = useState("36.00");
  const [defaultRate, setDefaultRate] = useState("36.00");
  const [equivalenteUsd, setEquivalenteUsd] = useState("");
  const [refNum, setRefNum] = useState("");
  const [spentAt, setSpentAt] = useState<string>(() => {
    const d = new Date();
    const offset = d.getTimezoneOffset();
    const localDate = new Date(d.getTime() - offset * 60 * 1000);
    return localDate.toISOString().split("T")[0];
  });

  // For in_kind
  const [inKindDesc, setInKindDesc] = useState("");
  const [inKindQty, setInKindQty] = useState("1");
  const [inKindUnit, setInKindUnit] = useState("unidades");

  useEffect(() => {
    fetch(`${PUBLIC_API_BASE}/public/captacion`)
      .then((r) => r.json())
      .then((data) => {
        if (data.captacion) {
          const activeMethods = data.captacion.filter((m: any) => m.isActive);
          setMetodos(activeMethods);
          if (activeMethods.length > 0 && activeMethods[0].defaultCurrency) {
            handleMonedaChange(activeMethods[0].defaultCurrency);
          }
        }
      })
      .catch(() => {});

    fetch(`${PUBLIC_API_BASE}/public/balances`)
      .then((r) => r.json())
      .then((data) => {
        if (data.exchangeRate) {
          const rateStr = String(data.exchangeRate);
          setRateInput(rateStr);
          setDefaultRate(rateStr);
        }
      })
      .catch(() => {});
  }, []);

  const updateEquivalente = (monto: string, curr: "USD" | "VES", rate: string) => {
    const numMonto = parseFloat(monto);
    const numRate = parseFloat(rate);
    if (!isNaN(numMonto)) {
      if (curr === "USD") {
        setEquivalenteUsd(numMonto.toFixed(2));
      } else if (!isNaN(numRate) && numRate > 0) {
        setEquivalenteUsd((numMonto / numRate).toFixed(2));
      } else {
        setEquivalenteUsd("");
      }
    } else {
      setEquivalenteUsd("");
    }
  };

  const handleMontoChange = (val: string) => {
    setMontoOriginal(val);
    updateEquivalente(val, moneda, rateInput);
  };

  const handleMonedaChange = (val: "USD" | "VES") => {
    setMoneda(val);
    updateEquivalente(montoOriginal, val, rateInput);
  };

  const handleRateChange = (val: string) => {
    setRateInput(val);
    updateEquivalente(montoOriginal, moneda, val);
  };

  const handleMetodoChange = (methodLabel: string) => {
    const found = metodos.find((m) => m.label === methodLabel);
    if (found && found.defaultCurrency) {
      handleMonedaChange(found.defaultCurrency);
    }
  };

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEstado("enviando");
    setError("");

    const form = e.currentTarget;
    const data = new FormData(form);
    data.set("type", tipoAporte);
    data.set("isAnonymous", anonimo ? "true" : "false");
    data.set("donatedAt", spentAt);

    if (tipoAporte === "financial") {
      const amt = parseFloat(montoOriginal);
      if (isNaN(amt) || amt <= 0) {
        setError("El monto debe ser mayor que cero.");
        setEstado("idle");
        return;
      }
      data.set("amount", String(amt));
      data.set("currency", moneda);
      data.set("exchangeRate", rateInput);
      if (refNum) data.set("referenceNumber", refNum);
    } else {
      // in_kind
      if (!inKindDesc.trim()) {
        setError("Indica la descripción del insumo.");
        setEstado("idle");
        return;
      }
      const qty = parseFloat(inKindQty);
      if (isNaN(qty) || qty <= 0) {
        setError("La cantidad debe ser mayor que cero.");
        setEstado("idle");
        return;
      }
      const items = [{ description: inKindDesc, quantity: qty, unit: inKindUnit }];
      data.set("inKindItems", JSON.stringify(items));
    }

    try {
      const res = await fetch(`${PUBLIC_API_BASE}/public/donaciones`, {
        method: "POST",
        body: data,
      });
      if (res.status === 201) {
        setEstado("ok");
        form.reset();
        setMontoOriginal("");
        setEquivalenteUsd("");
        setRefNum("");
        setInKindDesc("");
        setInKindQty("1");
        setInKindUnit("unidades");
        setFileName("");
        return;
      }
      const body = await res.json().catch(() => ({}));
      setError(body?.error ?? "No pudimos registrar tu donación. Revisa los datos.");
      setEstado("error");
    } catch {
      setError("No hay conexión. Intenta de nuevo en un momento.");
      setEstado("error");
    }
  }

  if (estado === "ok") {
    return (
      <div className="rounded-xl border border-success/30 bg-success-soft p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success text-white">
          <IconCheck size={24} />
        </div>
        <h3 className="mt-4 font-serif text-2xl font-semibold text-ink">¡Gracias de corazón!</h3>
        <p className="mt-2 text-ink-muted">
          Tu donación quedó registrada y la verificaremos pronto. Una vez confirmada,
          aparecerá en la transparencia pública.
        </p>
        <Button className="mt-6" variant="secondary" onClick={() => setEstado("idle")}>
          Declarar otra donación
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Tipo de Aporte" htmlFor="tipo" required>
          <Select
            id="tipo"
            name="type"
            value={tipoAporte}
            onChange={(e) => setTipoAporte(e.target.value as any)}
            required
          >
            <option value="financial">Monetario (Financiero)</option>
            <option value="in_kind">En especie (Insumos)</option>
          </Select>
        </Field>

        <Field label="Fecha" htmlFor="fecha" required>
          <Input
            id="fecha"
            name="donatedAt"
            type="date"
            value={spentAt}
            onChange={(e) => setSpentAt(e.target.value)}
            required
          />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="# Referencia (Opcional)" htmlFor="ref">
          <Input
            id="ref"
            name="referenceNumber"
            value={refNum}
            onChange={(e) => setRefNum(e.target.value)}
            placeholder="Ej: 981247"
          />
        </Field>

        <Field label="¿Cómo donaste?" htmlFor="metodo">
          <Select id="metodo" name="method" required onChange={(e) => handleMetodoChange(e.target.value)}>
            {metodos.map((m) => (
              <option key={m.id} value={m.label}>
                {m.label}
              </option>
            ))}
            {metodos.length === 0 && (
              <>
                <option value="Pago Móvil">Pago Móvil</option>
                <option value="Transferencia">Transferencia</option>
                <option value="Efectivo">Efectivo</option>
                <option value="Otro">Otro</option>
              </>
            )}
          </Select>
        </Field>
      </div>

      {tipoAporte === "financial" ? (
        <>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Monto Original" htmlFor="monto" required>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-ink-subtle text-sm font-semibold select-none">
                  {moneda === "USD" ? "$" : "Bs."}
                </span>
                <Input
                  id="monto"
                  type="number"
                  step="any"
                  inputMode="decimal"
                  value={montoOriginal}
                  onChange={(e) => handleMontoChange(e.target.value)}
                  placeholder="0.00"
                  className="pl-10"
                  required
                />
              </div>
            </Field>

            <Field label="Tasa BCV del día (VES/USD)" htmlFor="rate" required>
              <div className="flex gap-2 items-center">
                <Input
                  id="rate"
                  type="number"
                  step="any"
                  inputMode="decimal"
                  value={rateInput}
                  onChange={(e) => handleRateChange(e.target.value)}
                  placeholder="36.00"
                  className="flex-1"
                  required
                />
                {rateInput !== defaultRate && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => handleRateChange(defaultRate)}
                    className="shrink-0 font-semibold"
                  >
                    Restaurar ({defaultRate})
                  </Button>
                )}
              </div>
            </Field>
          </div>

          {/* Banner para Equivalente USD */}
          <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-brand/20 rounded-2xl p-5 flex flex-col justify-center items-center text-center shadow-inner relative overflow-hidden my-4">
            <span className="text-[10px] font-bold text-brand uppercase tracking-widest">
              Equivalente Contable en USD
            </span>
            <span className="text-3xl font-black text-brand font-mono mt-1.5">
              $ {equivalenteUsd || "0.00"}
            </span>
            <span className="text-[10px] text-ink-subtle mt-1">
              Calculado automáticamente en base a la tasa oficial del Banco Central de Venezuela.
            </span>
          </div>
        </>
      ) : (
        <>
          <Field label="Descripción de Insumo" htmlFor="ik-desc" required>
            <Input
              id="ik-desc"
              value={inKindDesc}
              onChange={(e) => setInKindDesc(e.target.value)}
              placeholder="Ej: Frazadas, Alimentos"
              required
            />
          </Field>

          <div className="grid grid-cols-2 gap-5">
            <Field label="Cantidad" htmlFor="ik-qty" required>
              <Input
                id="ik-qty"
                type="number"
                step="any"
                value={inKindQty}
                onChange={(e) => setInKindQty(e.target.value)}
                required
              />
            </Field>

            <Field label="Unidad" htmlFor="ik-unit" required>
              <Input
                id="ik-unit"
                value={inKindUnit}
                onChange={(e) => setInKindUnit(e.target.value)}
                placeholder="Ej: unidades, kg"
                required
              />
            </Field>
          </div>
        </>
      )}

      {/* Identidad pública */}
      <fieldset className="rounded-lg border border-border bg-surface/30 p-5">
        <legend className="px-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">¿Cómo quieres aparecer?</legend>
        <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-center">
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-ink">
            <input
              type="radio"
              name="modo"
              checked={!anonimo}
              onChange={() => setAnonimo(false)}
              className="h-4 w-4 rounded-full border-border text-brand focus:ring-brand accent-[color:rgb(var(--color-brand))]"
            />
            Con mi nombre público
          </label>
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-ink">
            <input
              type="radio"
              name="modo"
              checked={anonimo}
              onChange={() => setAnonimo(true)}
              className="h-4 w-4 rounded-full border-border text-brand focus:ring-brand accent-[color:rgb(var(--color-brand))]"
            />
            Como Anónimo
          </label>
        </div>
        {!anonimo && (
          <div className="mt-5 border-t border-border/40 pt-4">
            <Field label="Tu nombre" htmlFor="nombre" help="Aparecerá junto a tu aporte en la lista de transparencia.">
              <Input id="nombre" name="donorName" placeholder="Ej. María García" />
            </Field>
          </div>
        )}
      </fieldset>

      <Field
        label="Contacto (privado)"
        htmlFor="contacto"
        help="Solo para confirmarte. NUNCA se muestra públicamente."
      >
        <Input id="contacto" name="donorContact" placeholder="Teléfono o correo" />
      </Field>

      <Field label="Mensaje (opcional)" htmlFor="mensaje" help="Se muestra públicamente.">
        <Textarea id="mensaje" name="message" maxLength={280} placeholder="Un mensaje de aliento..." />
      </Field>

      {/* Comprobante */}
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink">Comprobante de transferencia (opcional)</span>
        <p className="text-xs text-ink-subtle leading-normal">
          Una foto del comprobante acelera la verificación. NUNCA se mostrará de forma pública.
        </p>
        <label
          htmlFor="proof"
          className="mt-1 flex flex-col items-center justify-center gap-2 cursor-pointer rounded-lg border-2 border-dashed border-border-strong bg-background p-6 text-center text-ink-muted hover:bg-surface hover:border-brand/35 hover:text-brand transition-all duration-200 shadow-sm"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-sunken text-ink-muted group-hover:text-brand transition-colors">
            <IconCamera size={20} />
          </span>
          <span className="text-sm font-semibold">{fileName || "Haz clic para tomar foto o subir archivo"}</span>
          <span className="text-[11px] text-ink-subtle">Formatos de imagen o PDF de hasta 8MB</span>
          <input
            id="proof"
            name="proof"
            type="file"
            accept="image/*,application/pdf"
            capture="environment"
            className="sr-only"
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
          />
        </label>
      </div>

      {estado === "error" && (
        <p role="alert" className="rounded-md bg-danger-soft px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      <Button type="submit" size="lg" disabled={estado === "enviando"} fullWidth>
        {estado === "enviando" ? "Enviando..." : "Declarar mi donación"}
      </Button>
    </form>
  );
}
