"use client";

import { useEffect, useState } from "react";
import {
  Button,
  Card,
  Field,
  Input,
  Select,
  Money,
  formatDate,
  IconReceipt,
  IconUpload,
  IconX,
} from "@nehemias/ui";
import type { PublicExpense } from "@nehemias/core";
import { apiEgresos, apiCrearEgreso, apiGet } from "@/lib/admin-api";
import { fileUrl } from "@/lib/config";

export default function AdminEgresosPage() {
  const [items, setItems] = useState<PublicExpense[]>([]);
  const [estado, setEstado] = useState<"idle" | "enviando">("idle");
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const [modalUrl, setModalUrl] = useState<string | null>(null);
  const [modalLabel, setModalLabel] = useState<string>("");

  // States for currency calculator
  const [usdVal, setUsdVal] = useState<string>("");
  const [vesVal, setVesVal] = useState<string>("");
  const [rateInput, setRateInput] = useState<string>("36.00");
  const [primaryCurrency, setPrimaryCurrency] = useState<"USD" | "VES">("USD");
  const [spentAt, setSpentAt] = useState<string>(() => {
    const d = new Date();
    const offset = d.getTimezoneOffset();
    const localDate = new Date(d.getTime() - offset * 60 * 1000);
    return localDate.toISOString().split("T")[0];
  });

  useEffect(() => {
    if (modalUrl) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [modalUrl]);

  function cargar() {
    apiEgresos()
      .then((r) => setItems(r.egresos))
      .catch(() => setItems([]));
  }

  useEffect(() => {
    cargar();
    apiGet("/public/balances")
      .then((r) => {
        if (r.exchangeRate) {
          setRateInput(String(r.exchangeRate));
        }
      })
      .catch(() => {});
  }, []);

  const handleUsdChange = (val: string) => {
    setUsdVal(val);
    setPrimaryCurrency("USD");
    const numUsd = parseFloat(val);
    const rate = parseFloat(rateInput);
    if (!isNaN(numUsd) && !isNaN(rate) && rate > 0) {
      setVesVal((numUsd * rate).toFixed(2));
    } else {
      setVesVal("");
    }
  };

  const handleVesChange = (val: string) => {
    setVesVal(val);
    setPrimaryCurrency("VES");
    const numVes = parseFloat(val);
    const rate = parseFloat(rateInput);
    if (!isNaN(numVes) && !isNaN(rate) && rate > 0) {
      setUsdVal((numVes / rate).toFixed(2));
    } else {
      setUsdVal("");
    }
  };

  const handleRateChange = (val: string) => {
    setRateInput(val);
    const rate = parseFloat(val);
    if (!isNaN(rate) && rate > 0) {
      if (primaryCurrency === "USD" && usdVal) {
        const numUsd = parseFloat(usdVal);
        if (!isNaN(numUsd)) {
          setVesVal((numUsd * rate).toFixed(2));
        }
      } else if (primaryCurrency === "VES" && vesVal) {
        const numVes = parseFloat(vesVal);
        if (!isNaN(numVes)) {
          setUsdVal((numVes / rate).toFixed(2));
        }
      }
    }
  };

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEstado("enviando");
    setError("");
    const form = e.currentTarget;
    const data = new FormData(form);

    const usdValNum = parseFloat(usdVal);
    const vesValNum = parseFloat(vesVal);

    if (primaryCurrency === "USD") {
      if (isNaN(usdValNum) || usdValNum <= 0) {
        setError("Debes ingresar un monto válido en USD.");
        setEstado("idle");
        return;
      }
      data.set("amount", String(usdValNum));
      data.set("currency", "USD");
    } else {
      if (isNaN(vesValNum) || vesValNum <= 0) {
        setError("Debes ingresar un monto válido en Bs.");
        setEstado("idle");
        return;
      }
      data.set("amount", String(vesValNum));
      data.set("currency", "VES");
    }

    data.set("createsStock", "false");

    try {
      await apiCrearEgreso(data);
      form.reset();
      setUsdVal("");
      setVesVal("");
      setFileName("");
      setEstado("idle");
      const d = new Date();
      const offset = d.getTimezoneOffset();
      const localDate = new Date(d.getTime() - offset * 60 * 1000);
      setSpentAt(localDate.toISOString().split("T")[0]);
      cargar();
    } catch (err) {
      setError((err as Error).message || "No se pudo registrar la compra.");
      setEstado("idle");
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl font-semibold text-ink">Egresos</h1>
        <p className="mt-1 text-ink-muted">
          Registra una compra y sube su factura. Baja del balance y queda pública.
        </p>
      </div>

      <Card className="p-5">
        <h2 className="mb-4 font-serif text-lg font-semibold text-ink">Registrar una compra</h2>
        <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
          <Field label="Descripción / Rubro" htmlFor="desc" required className="sm:col-span-2">
            <Input id="desc" name="description" placeholder="Ej: Compra de medicinas para sector B" required />
          </Field>

          <Field label="# Factura (Nro.)" htmlFor="invoiceNum">
            <Input id="invoiceNum" name="invoiceNumber" placeholder="Ej: 004812" />
          </Field>

          <Field label="Fecha" htmlFor="fecha" required>
            <Input
              id="fecha"
              name="spentAt"
              type="date"
              value={spentAt}
              onChange={(e) => setSpentAt(e.target.value)}
              required
            />
          </Field>

          <Field label="Monto en Dólares ($)" htmlFor="amountUsd">
            <div className="relative">
              <Input
                id="amountUsd"
                type="number"
                step="any"
                inputMode="decimal"
                value={usdVal}
                onChange={(e) => handleUsdChange(e.target.value)}
                placeholder="0.00"
                className={primaryCurrency === "USD" && usdVal ? "border-brand ring-1 ring-brand" : ""}
              />
              {primaryCurrency === "USD" && usdVal && (
                <span className="absolute right-3 top-2 text-[10px] bg-brand text-brand-contrast px-1.5 py-0.5 rounded-full font-bold select-none">
                  Moneda de Registro
                </span>
              )}
            </div>
          </Field>

          <Field label="Monto en Bolívares (Bs.)" htmlFor="amountVes">
            <div className="relative">
              <Input
                id="amountVes"
                type="number"
                step="any"
                inputMode="decimal"
                value={vesVal}
                onChange={(e) => handleVesChange(e.target.value)}
                placeholder="0.00"
                className={primaryCurrency === "VES" && vesVal ? "border-brand ring-1 ring-brand" : ""}
              />
              {primaryCurrency === "VES" && vesVal && (
                <span className="absolute right-3 top-2 text-[10px] bg-brand text-brand-contrast px-1.5 py-0.5 rounded-full font-bold select-none">
                  Moneda de Registro
                </span>
              )}
            </div>
          </Field>

          <Field label="Tasa BCV del día (VES/USD)" htmlFor="rate" className="sm:col-span-2">
            <Input
              id="rate"
              type="number"
              step="any"
              inputMode="decimal"
              value={rateInput}
              onChange={(e) => handleRateChange(e.target.value)}
              placeholder="36.00"
            />
          </Field>

          {/* Factura */}
          <div className="sm:col-span-2">
            <span className="text-sm font-medium text-ink">Archivo de Factura (Público)</span>
            <label
              htmlFor="invoice"
              className="mt-2 flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-border-strong bg-surface px-4 py-3 text-ink-muted hover:bg-surface-sunken"
            >
              <IconUpload size={20} />
              <span className="text-sm">{fileName || "Subir foto o PDF de la factura"}</span>
              <input
                id="invoice"
                name="invoice"
                type="file"
                accept="image/*,application/pdf"
                capture="environment"
                className="sr-only"
                onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
              />
            </label>
          </div>

          {error && <p className="text-sm text-danger sm:col-span-2">{error}</p>}
          <div className="sm:col-span-2">
            <Button type="submit" size="lg" disabled={estado === "enviando"}>
              {estado === "enviando" ? "Guardando..." : "Registrar compra"}
            </Button>
          </div>
        </form>
      </Card>

      <section>
        <h2 className="mb-4 font-serif text-lg font-semibold text-ink">Compras registradas</h2>
        <div className="space-y-3">
          {items.map((e) => (
            <Card key={e.id} className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium text-ink">
                  {e.description}
                  {e.invoiceNumber && (
                    <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-surface-sunken border border-border text-ink-muted font-mono">
                      #{e.invoiceNumber}
                    </span>
                  )}
                </p>
                <p className="text-sm text-ink-muted">
                  {formatDate(e.spentAt)}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <Money amount={e.amount} currency={e.currency} className="font-semibold text-ink" />
                {fileUrl(e.invoiceUrl) && (
                  <button
                    onClick={() => {
                      setModalUrl(fileUrl(e.invoiceUrl));
                      setModalLabel(`Factura: ${e.description}`);
                    }}
                    className="inline-flex items-center gap-1 text-sm font-medium text-brand cursor-pointer bg-transparent border-0 p-0"
                  >
                    <IconReceipt size={15} /> Factura
                  </button>
                )}
              </div>
            </Card>
          ))}
          {items.length === 0 && <p className="text-ink-muted">Aún no hay compras registradas.</p>}
        </div>
      </section>

      {/* Modal para visualizar el comprobante */}
      {modalUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 sm:p-6 transition-opacity animate-in fade-in duration-200">
          <div className="relative max-w-3xl w-full bg-surface rounded-xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            {/* Cabecera del Modal */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-surface-sunken/30">
              <div>
                <h3 className="font-bold text-ink leading-tight">{modalLabel || "Factura"}</h3>
              </div>
              <button
                onClick={() => setModalUrl(null)}
                className="p-1.5 rounded-full text-ink-muted hover:bg-surface-sunken hover:text-ink transition-colors cursor-pointer"
                aria-label="Cerrar"
              >
                <IconX size={20} />
              </button>
            </div>

            {/* Contenido del Modal */}
            <div className="flex-1 overflow-auto bg-muted/10 p-4 flex items-center justify-center min-h-[300px]">
              {modalUrl.toLowerCase().endsWith(".pdf") ? (
                <iframe
                  src={modalUrl}
                  title="Factura PDF"
                  className="w-full h-[60vh] border-0 rounded-md shadow-sm bg-background"
                />
              ) : (
                <img
                  src={modalUrl}
                  alt="Factura"
                  className="max-h-[60vh] max-w-full object-contain rounded-md shadow-md border border-border/50 bg-background"
                />
              )}
            </div>

            {/* Pie del Modal */}
            <div className="flex items-center justify-between gap-3 p-4 border-t border-border bg-surface-sunken/30">
              <a
                href={modalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md bg-background text-ink border border-border-strong hover:bg-surface px-3 py-1.5 text-xs font-semibold shadow-sm transition-colors"
              >
                Abrir en pestaña nueva
              </a>
              <button
                onClick={() => setModalUrl(null)}
                className="inline-flex items-center gap-1.5 rounded-md bg-brand text-brand-contrast hover:bg-brand-strong px-4 py-1.5 text-xs font-semibold shadow-sm transition-colors cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
