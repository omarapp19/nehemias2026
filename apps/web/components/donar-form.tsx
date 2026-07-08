"use client";

import { useState, useEffect, useRef } from "react";
import { Button, Field, Input, Select, Textarea, IconCheck, IconCamera } from "@nehemias/ui";
import { PUBLIC_API_BASE } from "@/lib/config";

type Estado = "idle" | "enviando" | "ok" | "error";

export function DonarForm() {
  const [estado, setEstado] = useState<Estado>("idle");
  const [anonimo, setAnonimo] = useState(false);
  const [error, setError] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [metodos, setMetodos] = useState<{ id: string; label: string; isActive: boolean; defaultCurrency?: "USD" | "VES" }[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isSubmittingRef = useRef(false);

  // Form states matching financial donations only
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

  useEffect(() => {
    fetch(`${PUBLIC_API_BASE}/public/captacion`)
      .then((r) => r.json())
      .then((data) => {
        if (data.captacion) {
          const activeMethods = data.captacion;
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

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
      setImagePreviewUrl(null);
    }

    if (file) {
      setFileName(file.name);
      if (file.type.startsWith("image/")) {
        const url = URL.createObjectURL(file);
        setImagePreviewUrl(url);
      }
    } else {
      setFileName("");
    }
  };

  const handleRemoveFile = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setFileName("");
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
      setImagePreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setEstado("enviando");
    setError("");

    const form = e.currentTarget;
    const data = new FormData(form);
    data.set("type", "financial");
    data.set("isAnonymous", anonimo ? "true" : "false");
    data.set("donatedAt", spentAt);

    const amt = parseFloat(montoOriginal);
    if (isNaN(amt) || amt <= 0) {
      setError("El monto debe ser mayor que cero.");
      setEstado("idle");
      isSubmittingRef.current = false;
      return;
    }
    data.set("amount", String(amt));
    data.set("currency", moneda);
    data.set("exchangeRate", rateInput);
    if (refNum) data.set("referenceNumber", refNum);

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
        setFileName("");
        setImagePreviewUrl(null);
        // No liberamos isSubmittingRef: la vista cambia a "ok" y el form ya no se reutiliza.
        return;
      }
      const body = await res.json().catch(() => ({}));
      setError(body?.error ?? "No pudimos registrar tu donación. Revisa los datos.");
      setEstado("error");
      isSubmittingRef.current = false;
    } catch {
      setError("No hay conexión. Intenta de nuevo en un momento.");
      setEstado("error");
      isSubmittingRef.current = false;
    }
  }

  if (estado === "ok") {
    return (
      <div className="rounded-xl border border-success/30 bg-success-soft p-8 text-center animate-in fade-in duration-300">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success text-white">
          <IconCheck size={24} />
        </div>
        <h3 className="mt-4 font-serif text-2xl font-semibold text-ink">¡Gracias de corazón!</h3>
        <p className="mt-2 text-ink-muted text-sm">
          Tu donación quedó registrada y la verificaremos pronto. Una vez confirmada,
          aparecerá en la transparencia pública.
        </p>
        <Button
          className="mt-6 font-semibold"
          variant="secondary"
          onClick={() => {
            isSubmittingRef.current = false;
            setEstado("idle");
          }}
        >
          Declarar otra donación
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Fecha de transferencia" htmlFor="fecha" required>
          <Input
            id="fecha"
            name="donatedAt"
            type="date"
            value={spentAt}
            onChange={(e) => setSpentAt(e.target.value)}
            required
          />
        </Field>

        <Field label="Medio de pago utilizado" htmlFor="metodo" required>
          <Select id="metodo" name="method" required onChange={(e) => handleMetodoChange(e.target.value)}>
            {metodos.map((m) => (
              <option key={m.id} value={m.label}>
                {m.label}
              </option>
            ))}
            {metodos.length === 0 && (
              <>
                <option value="Pago Móvil">Pago Móvil</option>
                <option value="Transferencia Bancaria">Transferencia Bancaria</option>
                <option value="Efectivo">Efectivo</option>
                <option value="Zelle">Zelle</option>
              </>
            )}
          </Select>
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Monto de la donación" htmlFor="monto" required>
          <div className="flex gap-2">
            <div className="relative flex-1">
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
                className="pl-9"
                required
              />
            </div>
            <div className="w-24 shrink-0">
              <Select
                id="moneda-select"
                value={moneda}
                onChange={(e) => handleMonedaChange(e.target.value as any)}
                className="font-bold"
              >
                <option value="USD">USD</option>
                <option value="VES">VES</option>
              </Select>
            </div>
          </div>
        </Field>

        <Field label="Número de referencia" htmlFor="ref" help="Opcional. Código del comprobante">
          <Input
            id="ref"
            name="referenceNumber"
            value={refNum}
            onChange={(e) => setRefNum(e.target.value)}
            placeholder="Ej: 981247"
          />
        </Field>
      </div>

      {moneda === "VES" && (
        <div className="grid gap-5 sm:grid-cols-2 animate-in fade-in duration-200">
          <Field label="Tasa BCV utilizada (VES/USD)" htmlFor="rate" required>
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
                  className="shrink-0 font-semibold text-xs"
                >
                  Restaurar ({defaultRate})
                </Button>
              )}
            </div>
          </Field>

          {/* Banner de Equivalente en dólares */}
          <div className="flex flex-col justify-center bg-brand-soft/40 border border-brand/10 rounded-xl px-4 py-2.5">
            <span className="text-[10px] font-bold text-brand uppercase tracking-wider">
              Equivalente contable
            </span>
            <span className="text-xl font-black text-brand font-mono mt-0.5">
              $ {equivalenteUsd || "0.00"} USD
            </span>
          </div>
        </div>
      )}

      {/* Identidad pública */}
      <fieldset className="rounded-xl border border-border bg-surface-sunken/15 p-5">
        <legend className="px-2 text-xs font-bold uppercase tracking-wider text-ink-muted">Visibilidad de tu aporte</legend>
        <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-center">
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-ink">
            <input
              type="radio"
              name="modo"
              checked={!anonimo}
              onChange={() => setAnonimo(false)}
              className="h-4 w-4 rounded-full border-border text-brand focus:ring-brand accent-[color:rgb(var(--color-brand))]"
            />
            Mostrar mi nombre públicamente
          </label>
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-ink">
            <input
              type="radio"
              name="modo"
              checked={anonimo}
              onChange={() => setAnonimo(true)}
              className="h-4 w-4 rounded-full border-border text-brand focus:ring-brand accent-[color:rgb(var(--color-brand))]"
            />
            Donar como Anónimo
          </label>
        </div>
        {!anonimo && (
          <div className="mt-4 border-t border-border/40 pt-4 animate-in slide-in-from-top-1.5 duration-200">
            <Field label="Nombre del donante" htmlFor="nombre" help="Aparecerá en el portal de transparencia.">
              <Input id="nombre" name="donorName" placeholder="Ej. María García" required={!anonimo} />
            </Field>
          </div>
        )}
      </fieldset>

      <Field
        label="Contacto para validación (Privado)"
        htmlFor="contacto"
        required
        help="Teléfono o correo. Únicamente para coordinar y verificar tu aporte. Nunca se publica."
      >
        <Input id="contacto" name="donorContact" placeholder="Ej. whatsapp +584121234567 o correo@ejemplo.com" required />
      </Field>

      <Field label="Mensaje de aliento (Opcional)" htmlFor="mensaje" help="Se mostrará públicamente junto a tu donación.">
        <Textarea id="mensaje" name="message" maxLength={280} placeholder="Escribe un mensaje de apoyo..." />
      </Field>

      {/* Comprobante / Capture con vista previa */}
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold text-ink">Comprobante de transferencia (Opcional)</span>
        <p className="text-xs text-ink-subtle leading-normal">
          Subir el capture acelera la verificación de tu donación.
        </p>

        <div className="relative group">
          <input
            id="proof"
            name="proof"
            type="file"
            accept="image/*,application/pdf"
            capture="environment"
            className="sr-only"
            onChange={handleFileChange}
            ref={fileInputRef}
          />

          <label
            htmlFor="proof"
            className="mt-1 flex flex-col items-center justify-center gap-2 cursor-pointer rounded-xl border border-dashed border-border-strong bg-background p-6 text-center text-ink-muted hover:bg-surface hover:border-brand/35 hover:text-brand transition-all duration-200 shadow-sm"
          >
            {imagePreviewUrl ? (
              <div className="relative flex flex-col items-center gap-2">
                <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-border shadow-sm bg-surface">
                  <img
                    src={imagePreviewUrl}
                    alt="Vista previa del comprobante"
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={handleRemoveFile}
                    type="button"
                    className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-danger text-white shadow-md hover:bg-danger/90 transition-colors"
                    title="Eliminar comprobante"
                  >
                    <span className="text-xs font-bold leading-none">×</span>
                  </button>
                </div>
                <span className="text-xs font-bold text-brand truncate max-w-xs">{fileName}</span>
              </div>
            ) : (
              <>
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-sunken text-ink-muted group-hover:bg-brand-soft group-hover:text-brand transition-colors">
                  <IconCamera size={18} />
                </span>
                <span className="text-sm font-semibold">{fileName || "Seleccionar capture o PDF"}</span>
                <span className="text-[10px] text-ink-subtle">Formatos de imagen o PDF de hasta 8MB</span>
              </>
            )}
          </label>
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-danger-soft px-4 py-3 text-sm text-danger font-semibold">
          {error}
        </p>
      )}

      <Button type="submit" size="lg" disabled={estado === "enviando"} fullWidth className="font-bold py-3.5">
        {estado === "enviando" ? "Enviando..." : "Declarar mi donación"}
      </Button>
    </form>
  );
}
