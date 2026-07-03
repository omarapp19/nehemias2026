"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  IconEdit,
  IconTrash,
} from "@nehemias/ui";
import type { PublicExpense } from "@nehemias/core";
import { apiEgresos, apiCrearEgreso, apiActualizarEgreso, apiEliminarEgreso, apiGet } from "@/lib/admin-api";
import { fileUrl } from "@/lib/config";

export default function AdminEgresosPage() {
  const [items, setItems] = useState<PublicExpense[]>([]);
  const [modalUrl, setModalUrl] = useState<string | null>(null);
  const [modalLabel, setModalLabel] = useState<string>("");
  const [mostrarForm, setMostrarForm] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [editando, setEditando] = useState<PublicExpense | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const lowerModalUrl = modalUrl?.toLowerCase() ?? "";
  const isDrive = lowerModalUrl.includes("drive.google.com") || lowerModalUrl.endsWith("/files/ver") || lowerModalUrl === "ver";
  const googleDriveFolder = process.env.NEXT_PUBLIC_GOOGLE_DRIVE_FOLDER || "https://drive.google.com";
  const targetUrl = (isDrive && (lowerModalUrl.endsWith("/files/ver") || lowerModalUrl === "ver"))
    ? googleDriveFolder
    : (modalUrl ?? googleDriveFolder);


  useEffect(() => {
    setMounted(true);
  }, []);

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

  async function eliminar(id: string) {
    setBusyId(id);
    try {
      await apiEliminarEgreso(id);
      setConfirmDelete(null);
      cargar();
    } finally {
      setBusyId(null);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

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

      {/* Modal de creación */}
      {mounted && mostrarForm && createPortal(
        <div className="fixed inset-0 z-50 flex justify-center items-start overflow-y-auto bg-black/60 backdrop-blur-sm p-4 sm:p-6 md:p-8">
          <div className="relative max-w-2xl w-full bg-white rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-border/60 bg-surface-sunken/30">
              <h3 className="font-serif text-lg font-bold text-ink leading-tight">Registrar una compra (Egreso)</h3>
              <button onClick={() => setMostrarForm(false)} className="p-1.5 rounded-full text-ink-muted hover:bg-surface-sunken hover:text-ink transition-colors cursor-pointer" aria-label="Cerrar">
                <IconX size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
              <EgresoForm onDone={() => { setMostrarForm(false); cargar(); }} onCancel={() => setMostrarForm(false)} />
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal de edición */}
      {mounted && editando && createPortal(
        <div className="fixed inset-0 z-50 flex justify-center items-start overflow-y-auto bg-black/60 backdrop-blur-sm p-4 sm:p-6 md:p-8">
          <div className="relative max-w-2xl w-full bg-white rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-border/60 bg-surface-sunken/30">
              <div>
                <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">Editando</span>
                <h3 className="font-serif text-lg font-bold text-ink leading-tight mt-1">Modificar egreso</h3>
              </div>
              <button onClick={() => setEditando(null)} className="p-1.5 rounded-full text-ink-muted hover:bg-surface-sunken hover:text-ink transition-colors cursor-pointer" aria-label="Cerrar">
                <IconX size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
              <EgresoForm
                key={`edit-${editando.id}`}
                initialData={editando}
                onDone={() => { setEditando(null); cargar(); }}
                onCancel={() => setEditando(null)}
              />
            </div>
          </div>
        </div>,
        document.body
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
            <Card key={e.id} className="flex flex-col p-5 bg-white border border-border/80 hover:-translate-y-0.5 hover:shadow-md transition-all duration-300 gap-3">
              {/* Confirmación de eliminación inline */}
              {confirmDelete === e.id ? (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-danger-soft/20 border border-danger/20 rounded-xl p-4">
                  <div>
                    <p className="text-sm font-bold text-danger">¿Eliminar este egreso?</p>
                    <p className="text-xs text-ink-muted mt-0.5">Esta acción no se puede deshacer.</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" variant="secondary" onClick={() => setConfirmDelete(null)} disabled={busyId === e.id}>Cancelar</Button>
                    <Button size="sm" variant="danger" onClick={() => eliminar(e.id)} disabled={busyId === e.id}>
                      {busyId === e.id ? "Eliminando..." : "Sí, eliminar"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2.5">
                      <p className="font-bold text-ink text-base truncate">{e.description}</p>
                      {e.invoiceNumber && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 border border-border/60 text-ink-subtle font-mono font-semibold">
                          Factura #{e.invoiceNumber}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-ink-subtle">Registrado el {formatDate(e.spentAt)}</p>
                  </div>
                  <div className="flex items-center justify-end gap-3 shrink-0 flex-wrap">
                    <Money amount={e.amount} currency={e.currency} className="font-mono text-lg font-black text-ink" />
                    {fileUrl(e.invoiceUrl) && (
                      <button
                        onClick={() => { setModalUrl(fileUrl(e.invoiceUrl)); setModalLabel(`Factura: ${e.description}`); }}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-brand hover:text-brand-strong cursor-pointer bg-brand-soft/10 border border-brand/20 px-3 py-1.5 rounded-lg shadow-sm transition-all"
                      >
                        <IconReceipt size={14} /> Ver Factura
                      </button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => setEditando(e)} disabled={busyId === e.id}>
                      <IconEdit size={14} className="mr-1" /> Editar
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(e.id)} disabled={busyId === e.id} className="text-danger hover:bg-danger-soft/20">
                      <IconTrash size={14} className="mr-1" /> Eliminar
                    </Button>
                  </div>
                </div>
              )}
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
      {mounted && modalUrl && createPortal(
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
              {isDrive ? (
                <div className="text-center p-8 space-y-4 max-w-md bg-white border border-border/80 rounded-2xl shadow-sm flex flex-col items-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft/50 text-brand">
                    <IconReceipt size={24} />
                  </div>
                  <h3 className="font-serif text-lg font-bold text-ink">Factura en Google Drive</h3>
                  <p className="text-sm text-ink-muted leading-relaxed">
                    Este documento está almacenado en Google Drive. Debido a las restricciones de seguridad del navegador y de Google Drive (como la protección contra hotlinking y el bloqueo de marcos iFrame), no se puede previsualizar directamente aquí.
                  </p>
                  <a
                    href={targetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg bg-brand text-brand-contrast hover:bg-brand-strong px-5 py-2.5 text-sm font-semibold shadow-md transition-all cursor-pointer"
                  >
                    Abrir en pestaña nueva
                  </a>
                </div>
              ) : modalUrl.toLowerCase().endsWith(".pdf") ? (
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
                href={targetUrl}
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
        </div>,
        document.body
      )}
    </div>
  );
}

function EgresoForm({
  onDone,
  onCancel,
  initialData,
}: {
  onDone: () => void;
  onCancel: () => void;
  initialData?: PublicExpense;
}) {
  const isEditing = !!initialData;
  const [estado, setEstado] = useState<"idle" | "enviando">("idle");
  const [error, setError] = useState("");
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [step, setStep] = useState(1);

  // States for currency calculator
  const [usdVal, setUsdVal] = useState<string>(() => {
    if (initialData && initialData.currency === "USD") {
      return String(initialData.amount);
    }
    return "";
  });
  const [vesVal, setVesVal] = useState<string>(() => {
    if (initialData && initialData.currency === "VES") {
      return String(initialData.amount);
    }
    return "";
  });
  const [rateInput, setRateInput] = useState<string>("36.00");
  const [defaultRate, setDefaultRate] = useState<string>("36.00");
  const [primaryCurrency, setPrimaryCurrency] = useState<"USD" | "VES">(() => {
    return (initialData?.currency as "USD" | "VES") ?? "USD";
  });
  const [spentAt, setSpentAt] = useState<string>(() => {
    if (initialData?.spentAt) {
      return new Date(initialData.spentAt).toISOString().split("T")[0];
    }
    const d = new Date();
    const offset = d.getTimezoneOffset();
    const localDate = new Date(d.getTime() - offset * 60 * 1000);
    return localDate.toISOString().split("T")[0];
  });

  useEffect(() => {
    apiGet("/public/balances")
      .then((r) => {
        if (r.exchangeRate) {
          const rateStr = String(r.exchangeRate);
          setRateInput(rateStr);
          setDefaultRate(rateStr);

          // Calculate initial counter currency if editing
          if (initialData) {
            const rate = parseFloat(rateStr);
            if (!isNaN(rate) && rate > 0) {
              if (initialData.currency === "USD") {
                setVesVal((initialData.amount * rate).toFixed(2));
              } else {
                setUsdVal((initialData.amount / rate).toFixed(2));
              }
            }
          }
        }
      })
      .catch(() => {});
  }, [initialData]);

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
    data.set("exchangeRate", rateInput);

    // Adjuntar factura explícitamente (evita bugs con DataTransfer en drag-and-drop)
    if (invoiceFile) data.set("invoice", invoiceFile, invoiceFile.name);
    else data.delete("invoice");

    try {
      if (isEditing) {
        await apiActualizarEgreso(initialData.id, data);
      } else {
        await apiCrearEgreso(data);
      }
      form.reset();
      setStep(1);
      setUsdVal("");
      setVesVal("");
      setInvoiceFile(null);
      setEstado("idle");
      onDone();
    } catch (err) {
      setError((err as Error).message || "No se pudo guardar la compra.");
      setEstado("idle");
    }
  }

  return (
    <form onSubmit={onSubmit}>
      {/* Paso 1: Detalles de la Compra */}
      <div className={step === 1 ? "grid gap-5 sm:grid-cols-2" : "hidden"}>
        <div className="sm:col-span-2 flex justify-between items-center border-b border-border/60 pb-2 mb-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-brand/85">
            Paso 1: Identificación del Egreso
          </h4>
          <span className="text-[10px] font-bold bg-brand-soft/20 text-brand px-2 py-0.5 rounded-full">Paso 1 de 2</span>
        </div>

        <Field label="Descripción / Rubro" htmlFor="desc" required className="sm:col-span-2">
          <Input id="desc" name="description" placeholder="Ej: Compra de medicinas para sector B" defaultValue={initialData?.description || ""} required />
        </Field>

        <Field label="# Factura (Nro.)" htmlFor="invoiceNum">
          <Input id="invoiceNum" name="invoiceNumber" placeholder="Ej: 004812" defaultValue={initialData?.invoiceNumber || ""} />
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

        <div className="sm:col-span-2 pt-4 border-t border-border/40 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="button" onClick={() => setStep(2)} className="shadow-md">
            Siguiente
          </Button>
        </div>
      </div>

      {/* Paso 2: Montos y Factura */}
      <div className={step === 2 ? "grid gap-5 sm:grid-cols-2" : "hidden"}>
        <div className="sm:col-span-2 flex justify-between items-center border-b border-border/60 pb-2 mb-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-brand/85">
            Paso 2: Monto y Comprobante
          </h4>
          <span className="text-[10px] font-bold bg-brand-soft/20 text-brand px-2 py-0.5 rounded-full">Paso 2 de 2</span>
        </div>

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
          <InvoiceUpload onFileChange={setInvoiceFile} />
        </div>

        {error && <p className="text-sm text-danger sm:col-span-2 font-medium">{error}</p>}
        <div className="sm:col-span-2 pt-4 border-t border-border/45 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => setStep(1)} disabled={estado === "enviando"}>
            Atrás
          </Button>
          <Button type="submit" disabled={estado === "enviando"} className="shadow-md">
            {estado === "enviando" ? "Guardando..." : (isEditing ? "Guardar Cambios" : "Registrar Compra")}
          </Button>
        </div>
      </div>
    </form>
  );
}

function InvoiceUpload({ onFileChange }: { onFileChange: (f: File | null) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];

  const applyFile = (f: File) => {
    if (!ALLOWED.includes(f.type)) return;
    setFile(f);
    onFileChange(f);
    if (f.type.startsWith("image/")) {
      setPreview(URL.createObjectURL(f));
    } else {
      setPreview(null);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) applyFile(f);
  };

  const handleClear = () => {
    setFile(null);
    setPreview(null);
    onFileChange(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) applyFile(f);
  };

  const fmt = (bytes: number) =>
    bytes < 1024 * 1024
      ? `${(bytes / 1024).toFixed(0)} KB`
      : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

  return (
    <div className="space-y-1.5">
      <span className="text-xs font-semibold text-ink-subtle block">
        Factura o Comprobante{" "}
        <span className="font-normal text-ink-subtle/70">(opcional · imagen o PDF)</span>
      </span>

      {/* Input oculto solo para clic — el archivo se pasa via onFileChange */}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
        onChange={handleChange}
        className="sr-only"
      />

      {file ? (
        <div className="rounded-xl border border-brand/30 bg-brand-soft/10 overflow-hidden">
          {preview && (
            <div className="relative w-full bg-surface-sunken/60 flex items-center justify-center max-h-48 overflow-hidden border-b border-brand/10">
              <img src={preview} alt="Vista previa" className="max-h-48 max-w-full object-contain" />
            </div>
          )}
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-8 w-8 rounded-lg bg-brand/15 flex items-center justify-center shrink-0">
                <IconReceipt size={15} className="text-brand" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink truncate">{file.name}</p>
                <p className="text-xs text-ink-subtle">{fmt(file.size)}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClear}
              className="shrink-0 p-1 rounded-full text-ink-muted hover:text-danger hover:bg-danger-soft/20 transition-colors cursor-pointer"
              aria-label="Quitar archivo"
            >
              <IconX size={16} />
            </button>
          </div>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`w-full flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed transition-all duration-200 py-8 cursor-pointer select-none ${
            dragging
              ? "border-brand bg-brand-soft/15 scale-[1.01] shadow-md shadow-brand/10"
              : "border-border hover:border-brand/40 hover:bg-brand-soft/5 text-ink-muted hover:text-ink"
          }`}
        >
          <div
            className={`h-10 w-10 rounded-full flex items-center justify-center transition-all duration-200 ${
              dragging ? "bg-brand/20 scale-110" : "bg-surface-sunken"
            }`}
          >
            <IconUpload
              size={20}
              className={`transition-colors duration-200 ${dragging ? "text-brand" : "text-ink-subtle"}`}
            />
          </div>
          <div className="text-center">
            <span className={`text-xs font-semibold block ${dragging ? "text-brand" : ""}`}>
              {dragging ? "Suelta aquí el archivo" : "Arrastra o haz clic para adjuntar factura"}
            </span>
            <span className="text-[10px] text-ink-subtle mt-0.5 block">
              JPG, PNG, WEBP, GIF o PDF · máx. 8 MB
            </span>
          </div>
        </div>
      )}
    </div>
  );
}


