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
  const [mostrarForm, setMostrarForm] = useState(false);

  // States for currency calculator
  const [usdVal, setUsdVal] = useState<string>("");
  const [vesVal, setVesVal] = useState<string>("");
  const [rateInput, setRateInput] = useState<string>("36.00");
  const [defaultRate, setDefaultRate] = useState<string>("36.00");
  const [primaryCurrency, setPrimaryCurrency] = useState<"USD" | "VES">("USD");
  const [spentAt, setSpentAt] = useState<string>(() => {
    const d = new Date();
    const offset = d.getTimezoneOffset();
    const localDate = new Date(d.getTime() - offset * 60 * 1000);
    return localDate.toISOString().split("T")[0];
  });

  useEffect(() => {
    if (modalUrl || mostrarForm) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [modalUrl, mostrarForm]);

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
          const rateStr = String(r.exchangeRate);
          setRateInput(rateStr);
          setDefaultRate(rateStr);
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
      setMostrarForm(false);
      cargar();
    } catch (err) {
      setError((err as Error).message || "No se pudo registrar la compra.");
      setEstado("idle");
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-border/80 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-danger animate-pulse"></span>
            <span className="text-xs font-bold text-danger uppercase tracking-wider">Salidas de Caja</span>
          </div>
          <h1 className="font-serif text-3xl font-extrabold tracking-tight text-ink">Egresos y Compras</h1>
          <p className="text-sm text-ink-muted leading-relaxed">
            Registra egresos financieros, compras operativas y adjunta facturas oficiales para transparencia.
          </p>
        </div>
        <Button
          variant={mostrarForm ? "secondary" : "primary"}
          onClick={() => setMostrarForm((v) => !v)}
          className="shrink-0 shadow-sm transition-all duration-300 hover:scale-[1.02]"
        >
          {mostrarForm ? "Ocultar Formulario" : "Registrar Compra"}
        </Button>
      </div>

      {mostrarForm && (
        <div className="fixed inset-0 z-50 flex justify-center items-start overflow-y-auto bg-black/60 backdrop-blur-sm p-4 sm:p-6 md:p-8">
          <div className="relative max-w-2xl w-full bg-white rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto animate-in zoom-in-95 duration-200">
            {/* Cabecera del Modal */}
            <div className="flex items-center justify-between p-5 border-b border-border/60 bg-surface-sunken/30">
              <div>
                <h3 className="font-serif text-lg font-bold text-ink leading-tight">Registrar una compra (Egreso)</h3>
              </div>
              <button
                onClick={() => setMostrarForm(false)}
                className="p-1.5 rounded-full text-ink-muted hover:bg-surface-sunken hover:text-ink transition-colors cursor-pointer"
                aria-label="Cerrar"
              >
                <IconX size={20} />
              </button>
            </div>

            {/* Contenido del Modal (scrollable) */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
              <form onSubmit={onSubmit} className="grid gap-5 sm:grid-cols-2">
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
                      <span className="absolute right-3 top-2.5 text-[9px] bg-brand text-brand-contrast px-2 py-0.5 rounded-full font-bold select-none uppercase tracking-wider">
                        Registro USD
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
                      <span className="absolute right-3 top-2.5 text-[9px] bg-brand text-brand-contrast px-2 py-0.5 rounded-full font-bold select-none uppercase tracking-wider">
                        Registro Bs.
                      </span>
                    )}
                  </div>
                </Field>

                <Field label="Tasa BCV del día (VES/USD)" htmlFor="rate" className="sm:col-span-2">
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
                    />
                    {rateInput !== defaultRate && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => handleRateChange(defaultRate)}
                        className="shrink-0 font-bold"
                      >
                        Restaurar ({defaultRate})
                      </Button>
                    )}
                  </div>
                </Field>

                {/* Factura Upload area */}
                <div className="sm:col-span-2">
                  <span className="text-sm font-semibold text-ink block mb-2">Archivo de Factura o Comprobante (Público)</span>
                  <label
                    htmlFor="invoice"
                    className="mt-1 flex flex-col items-center justify-center gap-2 cursor-pointer rounded-xl border-2 border-dashed border-border-strong bg-background p-6 text-center text-ink-muted hover:bg-surface hover:border-brand/35 hover:text-brand transition-all duration-200 shadow-sm"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-sunken text-ink-muted group-hover:text-brand transition-colors">
                      <IconUpload size={18} />
                    </span>
                    <span className="text-sm font-semibold">{fileName || "Haz clic para subir foto o PDF de la factura"}</span>
                    <span className="text-[10px] text-ink-subtle">Soporta imágenes y archivos PDF de hasta 8MB</span>
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

                {error && <p className="text-sm text-danger sm:col-span-2 font-medium">{error}</p>}
                <div className="sm:col-span-2 pt-2 border-t border-border/45 flex justify-end gap-3">
                  <Button type="button" variant="secondary" onClick={() => setMostrarForm(false)} disabled={estado === "enviando"}>
                    Cancelar
                  </Button>
                  <Button type="submit" size="lg" disabled={estado === "enviando"} className="shadow-sm">
                    {estado === "enviando" ? "Guardando..." : "Registrar Compra"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h2 className="font-serif text-xl font-bold tracking-tight text-ink flex items-center gap-2">
            <span className="w-1.5 h-6 bg-danger rounded-full"></span>
            Historial de Compras Registradas
          </h2>
          <div className="text-xs text-ink-subtle font-medium">
            Total: <span className="text-ink font-bold">{items.length}</span> compras
          </div>
        </div>

        <div className="space-y-4">
          {items.map((e) => (
            <Card key={e.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-white border border-border/80 hover:-translate-y-0.5 hover:shadow-md transition-all duration-300 gap-4">
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2.5">
                  <p className="font-bold text-ink text-base truncate">
                    {e.description}
                  </p>
                  {e.invoiceNumber && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 border border-border/60 text-ink-subtle font-mono font-semibold">
                      Factura #{e.invoiceNumber}
                    </span>
                  )}
                </div>
                <p className="text-xs text-ink-subtle">
                  Registrado el {formatDate(e.spentAt)}
                </p>
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-5 shrink-0">
                <Money amount={e.amount} currency={e.currency} className="font-mono text-lg font-black text-ink" />
                {fileUrl(e.invoiceUrl) && (
                  <button
                    onClick={() => {
                      setModalUrl(fileUrl(e.invoiceUrl));
                      setModalLabel(`Factura: ${e.description}`);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-brand hover:text-brand-strong cursor-pointer bg-brand-soft/10 border border-brand/20 px-3 py-1.5 rounded-lg shadow-sm transition-all"
                  >
                    <IconReceipt size={14} /> Ver Factura
                  </button>
                )}
              </div>
            </Card>
          ))}
          {items.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border-strong bg-white p-12 text-center text-ink-muted">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-surface-sunken text-ink-subtle mb-4">
                <IconReceipt size={24} />
              </div>
              <h3 className="font-serif text-lg font-bold text-ink">Sin transacciones</h3>
              <p className="text-sm text-ink-subtle mt-1">Aún no hay compras registradas en el sistema.</p>
            </div>
          )}
        </div>
      </section>

      {/* Modal para visualizar el comprobante */}
      {modalUrl && (
        <div className="fixed inset-0 z-50 flex justify-center items-start overflow-y-auto bg-black/75 backdrop-blur-sm p-4 sm:p-6 transition-opacity animate-in fade-in duration-200">
          <div className="relative max-w-3xl w-full bg-surface rounded-xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto animate-in zoom-in-95 duration-200">
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
