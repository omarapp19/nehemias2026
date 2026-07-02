"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Button,
  Card,
  Field,
  Input,
  Select,
  Textarea,
  Money,
  BadgeDonacion,
  formatDate,
  IconCheck,
  IconX,
  IconCamera,
  IconEdit,
  IconTrash,
} from "@nehemias/ui";
import type { AdminDonation } from "@nehemias/core";
import {
  apiDonaciones,
  apiRevisarDonacion,
  apiCrearDonacion,
  apiActualizarDonacion,
  apiEliminarDonacion,
  apiCaptacion,
  apiGet,
} from "@/lib/admin-api";
import { BrandMark } from "@/components/brand";
import { metodoLabel } from "@/lib/labels";
import { fileUrl } from "@/lib/config";

type Tab = "pending" | "verified" | "rejected";

function useAuthenticatedUrl(url: string | null) {
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!url) {
      setResolvedUrl(null);
      return;
    }

    if (url.includes("drive.google.com") || !url.includes("/files/proofs/")) {
      setResolvedUrl(url);
      return;
    }

    let active = true;
    let objectUrl: string | null = null;

    async function loadSecureFile(fileUrl: string) {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(fileUrl, { credentials: "include" });
        if (!res.ok) {
          throw new Error(`Error: ${res.status}`);
        }
        const blob = await res.blob();
        if (active) {
          objectUrl = URL.createObjectURL(blob);
          setResolvedUrl(objectUrl);
        }
      } catch (err: any) {
        if (active) {
          setError(err.message || "Error al cargar el comprobante.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadSecureFile(url);

    return () => {
      active = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [url]);

  return { url: resolvedUrl, loading, error };
}

export default function AdminDonacionesPage() {
  const [tab, setTab] = useState<Tab>("pending");
  const [items, setItems] = useState<AdminDonation[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [editando, setEditando] = useState<AdminDonation | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [modalUrl, setModalUrl] = useState<string | null>(null);
  const [modalLabel, setModalLabel] = useState<string>("");
  const { url: secureModalUrl, loading: secureLoading, error: secureError } = useAuthenticatedUrl(modalUrl);
  const [mounted, setMounted] = useState(false);

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
  }, [modalUrl]);

  function cargar(t: Tab) {
    setCargando(true);
    apiDonaciones(t)
      .then((r) => setItems(r.donaciones))
      .catch(() => setItems([]))
      .finally(() => setCargando(false));
  }

  useEffect(() => {
    cargar(tab);
  }, [tab]);

  async function revisar(id: string, action: "verify" | "reject") {
    setBusyId(id);
    try {
      await apiRevisarDonacion(id, action);
      cargar(tab);
    } finally {
      setBusyId(null);
    }
  }

  async function eliminar(id: string) {
    setBusyId(id);
    try {
      await apiEliminarDonacion(id);
      setConfirmDelete(null);
      cargar(tab);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-border/80 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-brand animate-pulse"></span>
            <span className="text-xs font-bold text-brand uppercase tracking-wider">Gestión de Fondos</span>
          </div>
          <h1 className="font-serif text-3xl font-extrabold tracking-tight text-ink">Donaciones Recibidas</h1>
          <p className="text-sm text-ink-muted leading-relaxed">
            Verifica y aprueba las declaraciones del público o registra aportes directos.
          </p>
        </div>
        <Button
          variant={mostrarForm ? "secondary" : "primary"}
          onClick={() => {
            if (!mostrarForm) setFormKey((k) => k + 1);
            setMostrarForm((v) => !v);
          }}
          className="shrink-0 shadow-sm transition-all duration-300 hover:scale-[1.02]"
        >
          {mostrarForm ? "Ocultar Formulario" : "Registrar Donación"}
        </Button>
      </div>

      {/* Modal de creación */}
      {mounted && mostrarForm && createPortal(
        <div className="fixed inset-0 z-50 flex justify-center items-start overflow-y-auto bg-black/60 backdrop-blur-sm p-4 sm:p-6 md:p-8">
          <div className="relative max-w-2xl w-full bg-white rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-border/60 bg-surface-sunken/30">
              <h3 className="font-serif text-lg font-bold text-ink leading-tight">Registrar una donación recibida</h3>
              <button onClick={() => setMostrarForm(false)} className="p-1.5 rounded-full text-ink-muted hover:bg-surface-sunken hover:text-ink transition-colors cursor-pointer" aria-label="Cerrar">
                <IconX size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
              <ManualForm key={formKey} onDone={() => { setMostrarForm(false); cargar(tab); }} onCancel={() => setMostrarForm(false)} />
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
                <h3 className="font-serif text-lg font-bold text-ink leading-tight mt-1">Modificar donación</h3>
              </div>
              <button onClick={() => setEditando(null)} className="p-1.5 rounded-full text-ink-muted hover:bg-surface-sunken hover:text-ink transition-colors cursor-pointer" aria-label="Cerrar">
                <IconX size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
              <ManualForm
                key={`edit-${editando.id}`}
                initialData={editando}
                onDone={() => { setEditando(null); cargar(tab); }}
                onCancel={() => setEditando(null)}
              />
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Pestañas y estadísticas resumidas */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="inline-flex rounded-xl bg-surface-sunken p-1 border border-border/50">
          {(
            [
              ["pending", "Por verificar"],
              ["verified", "Verificadas"],
              ["rejected", "Rechazadas"],
            ] as [Tab, string][]
          ).map(([t, label]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-lg px-4 py-2 text-xs md:text-sm font-semibold transition-all duration-200 cursor-pointer ${
                tab === t
                  ? "bg-white text-ink shadow-sm ring-1 ring-black/5"
                  : "text-ink-subtle hover:text-ink"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="text-xs text-ink-subtle font-medium">
          Mostrando <span className="text-ink font-bold">{items.length}</span> registros en esta sección
        </div>
      </div>

      {cargando ? (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-28 w-full bg-surface-sunken rounded-2xl animate-pulse border border-border/50" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border-strong bg-white p-12 text-center text-ink-muted">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-surface-sunken text-ink-subtle mb-4">
            <IconX size={24} />
          </div>
          <h3 className="font-serif text-lg font-bold text-ink">No se encontraron registros</h3>
          <p className="text-sm text-ink-subtle mt-1">
            No hay donaciones {tab === "pending" ? "pendientes de aprobación" : "en este listado"}.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((d) => (
            <Card key={d.id} className="p-6 bg-white hover:-translate-y-0.5 hover:shadow-md transition-all duration-300 border border-border/80">
              {/* Confirmación de eliminación inline */}
              {confirmDelete === d.id ? (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-danger-soft/20 border border-danger/20 rounded-xl p-4">
                  <div>
                    <p className="text-sm font-bold text-danger">¿Eliminar esta donación?</p>
                    <p className="text-xs text-ink-muted mt-0.5">Esta acción no se puede deshacer.</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" variant="secondary" onClick={() => setConfirmDelete(null)} disabled={busyId === d.id}>Cancelar</Button>
                    <Button size="sm" variant="danger" onClick={() => eliminar(d.id)} disabled={busyId === d.id}>
                      {busyId === d.id ? "Eliminando..." : "Sí, eliminar"}
                    </Button>
                  </div>
                </div>
              ) : (
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <BadgeDonacion estado={d.status} />
                    {d.declaredByPublic && (
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-brand-soft/20 text-brand px-2 py-0.5 rounded-full">
                        declarada por el público
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-baseline gap-2">
                    <p className="text-2xl font-black tracking-tight text-ink font-mono">
                      {d.type === "financial" && d.amount !== null ? (
                        <Money amount={d.amount} currency={d.currency} />
                      ) : (
                        "Donación en especie"
                      )}
                    </p>
                    {d.type === "financial" && d.currency === "VES" && d.exchangeRate && (
                      <span className="text-xs text-brand font-bold bg-brand-soft/10 px-2 py-0.5 rounded border border-brand/10 font-mono">
                        Tasa: {Number(d.exchangeRate).toFixed(2)} VES/USD
                      </span>
                    )}
                  </div>

                  <div className="text-sm text-ink-muted flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-bold text-ink">{d.donorDisplay}</span>
                    <span className="text-ink-subtle/40">•</span>
                    {d.type === "financial" && d.method && (
                      <>
                        <span className="bg-surface-sunken px-2.5 py-0.5 rounded text-xs font-semibold text-ink-muted border border-border/50">{metodoLabel(d.method)}</span>
                        <span className="text-ink-subtle/40">•</span>
                      </>
                    )}
                    {d.referenceNumber && (
                      <>
                        <span className="font-mono text-xs text-ink-subtle bg-slate-100 px-2 py-0.5 rounded">Ref: #{d.referenceNumber}</span>
                        <span className="text-ink-subtle/40">•</span>
                      </>
                    )}
                    <span className="text-xs">{formatDate(d.donatedAt)}</span>
                  </div>

                  {d.message && (
                    <div className="mt-2 text-sm italic text-ink-muted bg-surface-sunken/40 border-l-2 border-border p-3.5 rounded-r-lg">
                      "{d.message}"
                    </div>
                  )}

                  {(d.donorContact || d.proofUrl) && (
                    <div className="mt-4 rounded-xl bg-surface-sunken/60 p-4 text-sm border border-border/40 grid sm:grid-cols-2 gap-3">
                      {d.donorContact && (
                        <div>
                          <span className="text-xs font-semibold text-ink-subtle block uppercase tracking-wider">Contacto Donante</span>
                          <span className="text-ink font-medium mt-0.5 block">{d.donorContact}</span>
                        </div>
                      )}
                      {d.proofUrl && (
                        <div className="flex items-end">
                          <button
                            onClick={() => { setModalUrl(fileUrl(d.proofUrl)); setModalLabel(`Comprobante de ${d.donorDisplay}`); }}
                            className="inline-flex items-center gap-1.5 font-bold text-xs text-brand hover:text-brand-strong cursor-pointer bg-white border border-brand/20 hover:border-brand px-3 py-1.5 rounded-lg shadow-sm transition-all"
                          >
                            <IconCamera size={14} />
                            Ver comprobante adjunto
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex md:flex-col lg:flex-row gap-2.5 shrink-0 self-stretch md:self-center justify-end">
                  {d.status === "pending" && (
                    <>
                      <Button size="sm" onClick={() => revisar(d.id, "verify")} disabled={busyId === d.id} className="flex-1 shadow-sm">
                        <IconCheck size={14} className="mr-1.5" /> Aprobar
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => revisar(d.id, "reject")} disabled={busyId === d.id} className="flex-1 shadow-sm">
                        <IconX size={14} className="mr-1.5" /> Rechazar
                      </Button>
                    </>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => setEditando(d)} disabled={busyId === d.id} className="shrink-0">
                    <IconEdit size={14} className="mr-1" /> Editar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(d.id)} disabled={busyId === d.id} className="shrink-0 text-danger hover:bg-danger-soft/20">
                    <IconTrash size={14} className="mr-1" /> Eliminar
                  </Button>
                </div>
              </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Modal para visualizar el comprobante */}
      {mounted && modalUrl && createPortal(
        <div className="fixed inset-0 z-50 flex justify-center items-start overflow-y-auto bg-black/75 backdrop-blur-sm p-4 sm:p-6 transition-opacity animate-in fade-in duration-200">
          <div className="relative max-w-3xl w-full bg-surface rounded-xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto animate-in zoom-in-95 duration-200">
            {/* Cabecera del Modal */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-surface-sunken/30">
              <div>
                <h3 className="font-bold text-ink leading-tight">{modalLabel || "Comprobante"}</h3>
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
              {secureLoading ? (
                <div className="text-sm font-semibold text-ink-subtle animate-pulse">Cargando comprobante...</div>
              ) : secureError ? (
                <div className="text-sm font-semibold text-danger bg-danger-soft/30 border border-danger/10 p-4 rounded-xl">{secureError}</div>
              ) : modalUrl.includes("drive.google.com") ? (
                <div className="text-center p-8 space-y-4 max-w-md bg-white border border-border/80 rounded-2xl shadow-sm flex flex-col items-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft/50 text-brand">
                    <IconCamera size={24} />
                  </div>
                  <h3 className="font-serif text-lg font-bold text-ink">Comprobante en Google Drive</h3>
                  <p className="text-sm text-ink-muted leading-relaxed">
                    Este comprobante está almacenado de forma segura en Google Drive y no se puede previsualizar directamente aquí debido a políticas de seguridad.
                  </p>
                  <a
                    href={modalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg bg-brand text-brand-contrast hover:bg-brand-strong px-5 py-2.5 text-sm font-semibold shadow-md transition-all cursor-pointer"
                  >
                    Abrir en pestaña nueva
                  </a>
                </div>
              ) : modalUrl.toLowerCase().endsWith(".pdf") ? (
                <iframe
                  src={secureModalUrl || ""}
                  title="Comprobante PDF"
                  className="w-full h-[60vh] border-0 rounded-md shadow-sm bg-background"
                />
              ) : (
                <img
                  src={secureModalUrl || ""}
                  alt="Comprobante"
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
        </div>,
        document.body
      )}
    </div>
  );
}

function ManualForm({
  onDone,
  onCancel,
  initialData,
}: {
  onDone: () => void;
  onCancel: () => void;
  initialData?: AdminDonation;
}) {
  const isEditing = !!initialData;
  const [anon, setAnon] = useState(initialData?.isAnonymous ?? false);
  const [estado, setEstado] = useState<"idle" | "enviando">("idle");
  const [error, setError] = useState("");
  const [step, setStep] = useState(1);
  const [metodos, setMetodos] = useState<{ id: string; label: string; isActive: boolean; defaultCurrency: "USD" | "VES" }[]>([]);
  const [proofFile, setProofFile] = useState<File | null>(null);

  // Form states matching user request
  const [tipoAporte, setTipoAporte] = useState<"financial" | "in_kind">(initialData?.type ?? "financial");
  const [montoOriginal, setMontoOriginal] = useState(initialData?.amount != null ? String(initialData.amount) : "");
  const [moneda, setMoneda] = useState<"USD" | "VES">((initialData?.currency as "USD" | "VES") ?? "USD");
  const [rateInput, setRateInput] = useState(initialData?.exchangeRate != null ? String(initialData.exchangeRate) : "36.00");
  const [defaultRate, setDefaultRate] = useState("36.00");
  const [equivalenteUsd, setEquivalenteUsd] = useState("");
  const [refNum, setRefNum] = useState(initialData?.referenceNumber ?? "");
  const [spentAt, setSpentAt] = useState<string>(() => {
    if (initialData?.donatedAt) return new Date(initialData.donatedAt).toISOString().split("T")[0];
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
    // Load payment methods
    apiCaptacion()
      .then((r) => {
        if (r.captacion) {
          const activeMethods = r.captacion.filter((m: any) => m.isActive);
          setMetodos(activeMethods);
          if (activeMethods.length > 0 && activeMethods[0].defaultCurrency) {
            handleMonedaChange(activeMethods[0].defaultCurrency);
          }
        }
      })
      .catch(() => {});

    // Load default rate
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
    data.set("isAnonymous", anon ? "true" : "false");
    data.set("donatedAt", spentAt);
    // Adjuntar comprobante explícitamente (evita bugs con DataTransfer en drag-and-drop)
    if (proofFile) data.set("proof", proofFile, proofFile.name);
    else data.delete("proof");
    // markVerified solo al crear
    if (!isEditing) data.set("markVerified", "true");

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
      data.delete("method");
      data.delete("referenceNumber");
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
      if (isEditing) {
        await apiActualizarDonacion(initialData!.id, data);
      } else {
        await apiCrearDonacion(data);
      }
      form.reset();
      setStep(1);
      setMontoOriginal("");
      setEquivalenteUsd("");
      setRefNum("");
      setInKindDesc("");
      setInKindQty("1");
      setInKindUnit("unidades");
      setEstado("idle");
      onDone();
    } catch (err: any) {
      console.error("[ManualForm] Error:", err);
      setError(err?.message ?? "No se pudo guardar. Revisa los datos.");
      setEstado("idle");
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">

      {/* Paso 1: Tipo, Fecha, Referencia, Método y Monto */}
      <div className={step === 1 ? "space-y-6" : "hidden"}>
        <div className="space-y-4">
          <div className="flex justify-between items-center border-b border-border/60 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-brand/85">
              Paso 1: Datos del Aporte
            </h3>
            <span className="text-[10px] font-bold bg-brand-soft/20 text-brand px-2 py-0.5 rounded-full">Paso 1 de 2</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tipo de Aporte" htmlFor="m-tipo" required>
              <Select
                id="m-tipo"
                name="type"
                value={tipoAporte}
                onChange={(e) => setTipoAporte(e.target.value as any)}
                required
              >
                <option value="financial">Monetario (Financiero)</option>
                <option value="in_kind">En especie (Insumos)</option>
              </Select>
            </Field>

            <Field label="Fecha de Recepción" htmlFor="m-fecha" required>
              <Input
                id="m-fecha"
                name="donatedAt"
                type="date"
                value={spentAt}
                onChange={(e) => setSpentAt(e.target.value)}
                required
              />
            </Field>

            {tipoAporte === "financial" && (
              <>
                <Field label="# Referencia (Opcional)" htmlFor="m-ref">
                  <Input
                    id="m-ref"
                    name="referenceNumber"
                    value={refNum}
                    onChange={(e) => setRefNum(e.target.value)}
                    placeholder="Ej: 981247"
                  />
                </Field>

                <Field label="Método de Pago / Recepción" htmlFor="m-metodo" required>
                  <Select id="m-metodo" name="method" required onChange={(e) => handleMetodoChange(e.target.value)}>
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

                <Field label="Monto Original" htmlFor="m-monto" required>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-ink-subtle text-sm font-semibold select-none">
                      {moneda === "USD" ? "$" : "Bs."}
                    </span>
                    <Input
                      id="m-monto"
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

                <Field label="Tasa BCV de cambio (VES/USD)" htmlFor="m-rate" required>
                  <div className="flex gap-2 items-center">
                    <Input
                      id="m-rate"
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

                {equivalenteUsd && (
                  <div className="sm:col-span-2 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-brand/20 rounded-2xl p-4 flex flex-col justify-center items-center text-center shadow-inner relative overflow-hidden">
                    <div className="absolute right-3 top-3 opacity-10">
                      <BrandMark size={40} />
                    </div>
                    <span className="text-[10px] font-bold text-brand uppercase tracking-widest">
                      Equivalente Contable
                    </span>
                    <span className="text-2xl font-black text-brand font-mono mt-1">
                      $ {equivalenteUsd}
                    </span>
                    <span className="text-[10px] text-ink-subtle mt-0.5">
                      Calculado en base a la tasa BCV.
                    </span>
                  </div>
                )}
              </>
            )}

            {tipoAporte === "in_kind" && (
              <>
                <Field label="Descripción del Insumo" htmlFor="m-ik-desc" required className="sm:col-span-2">
                  <Input
                    id="m-ik-desc"
                    value={inKindDesc}
                    onChange={(e) => setInKindDesc(e.target.value)}
                    placeholder="Ej: Frazadas térmicas, Harina de maíz"
                    required
                  />
                </Field>

                <Field label="Cantidad Donada" htmlFor="m-ik-qty" required>
                  <Input
                    id="m-ik-qty"
                    type="number"
                    step="any"
                    value={inKindQty}
                    onChange={(e) => setInKindQty(e.target.value)}
                    required
                  />
                </Field>

                <Field label="Unidad de Medida" htmlFor="m-ik-unit" required>
                  <Input
                    id="m-ik-unit"
                    value={inKindUnit}
                    onChange={(e) => setInKindUnit(e.target.value)}
                    placeholder="Ej: unidades, bultos, kg"
                    required
                  />
                </Field>
              </>
            )}
          </div>
        </div>

        {error && (
          <p role="alert" className="text-sm font-semibold text-danger bg-danger-soft/30 border border-danger/10 p-3 rounded-lg">
            {error}
          </p>
        )}

        <div className="pt-4 border-t border-border/40 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={estado === "enviando"}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={() => {
              if (tipoAporte === "financial") {
                const amt = parseFloat(montoOriginal);
                if (isNaN(amt) || amt <= 0) {
                  setError("El monto debe ser mayor que cero.");
                  return;
                }
              }
              if (tipoAporte === "in_kind" && !inKindDesc.trim()) {
                setError("Indica la descripción del insumo.");
                return;
              }
              setError("");
              setStep(2);
            }}
            className="shadow-md"
          >
            Siguiente
          </Button>
        </div>
      </div>

      {/* Paso 2: Nombre y Descripción del Donante */}
      <div className={step === 2 ? "space-y-6" : "hidden"}>
        <div className="space-y-4">
          <div className="flex justify-between items-center border-b border-border/60 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-brand/85">
              Paso 2: Identidad del Donante
            </h3>
            <span className="text-[10px] font-bold bg-brand-soft/20 text-brand px-2 py-0.5 rounded-full">Paso 2 de 2</span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {!anon && (
              <Field label="Nombre Completo del Donante" htmlFor="m-nombre" className="sm:col-span-2">
                <Input id="m-nombre" name="donorName" placeholder="Ej: Juan Pérez o Empresa C.A." />
              </Field>
            )}

            <Field label="Descripción / Mensaje (Opcional)" htmlFor="m-msg" className="sm:col-span-2">
              <Textarea
                id="m-msg"
                name="message"
                maxLength={280}
                placeholder="Mensaje corto de agradecimiento o aliento para la comunidad..."
              />
            </Field>

            {/* Comprobante de pago */}
            <div className="sm:col-span-2">
              <ProofUpload onFileChange={setProofFile} />
            </div>

            <div className="sm:col-span-2 flex items-center gap-2 py-1">
              <label className="inline-flex cursor-pointer items-center gap-2.5 text-sm font-semibold text-ink select-none">
                <input
                  type="checkbox"
                  checked={anon}
                  onChange={(e) => setAnon(e.target.checked)}
                  className="h-4.5 w-4.5 rounded border-border text-brand focus:ring-brand accent-[color:rgb(var(--color-brand))]"
                />
                Registrar como Aporte Anónimo
              </label>
            </div>
          </div>
        </div>

        {error && (
          <p role="alert" className="text-sm font-semibold text-danger bg-danger-soft/30 border border-danger/10 p-3 rounded-lg">
            {error}
          </p>
        )}

        <div className="pt-4 border-t border-border/40 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => setStep(1)} disabled={estado === "enviando"}>
            Atrás
          </Button>
          <Button type="submit" disabled={estado === "enviando"} className="shadow-md">
            {estado === "enviando" ? "Registrando..." : "Guardar como Verificada"}
          </Button>
        </div>
      </div>
    </form>
  );
}
function ProofUpload({ onFileChange }: { onFileChange: (f: File | null) => void }) {
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
        Comprobante de Pago{" "}
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
                <IconCamera size={15} className="text-brand" />
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
            <IconCamera
              size={20}
              className={`transition-colors duration-200 ${dragging ? "text-brand" : "text-ink-subtle"}`}
            />
          </div>
          <div className="text-center">
            <span className={`text-xs font-semibold block ${dragging ? "text-brand" : ""}`}>
              {dragging ? "Suelta aquí el archivo" : "Arrastra o haz clic para adjuntar"}
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

