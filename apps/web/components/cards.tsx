"use client";

import { useState, useEffect } from "react";
import {
  Card,
  Money,
  ProgressBar,
  BadgeStock,
  nivelStock,
  IconReceipt,
  IconTrendingUp,
  IconX,
  formatDate,
  formatNumber,
  type Currency,
} from "@nehemias/ui";

/** Tarjeta de transacción: un ingreso (donación) o un egreso (compra). */
export function TransaccionCard({
  direccion,
  titulo,
  subtitulo,
  amount,
  currency,
  fecha,
  comprobanteUrl,
  comprobanteLabel,
  exchangeRate,
}: {
  direccion: "ingreso" | "egreso";
  titulo: string;
  subtitulo?: string | null;
  amount: number;
  currency: Currency;
  fecha: string;
  comprobanteUrl?: string | null;
  comprobanteLabel?: string;
  exchangeRate?: number;
}) {
  const esIngreso = direccion === "ingreso";
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (showModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [showModal]);

  const lowerUrl = comprobanteUrl?.toLowerCase() ?? "";
  const isDrive = lowerUrl.includes("drive.google.com") || lowerUrl.endsWith("/files/ver") || lowerUrl === "ver";
  const googleDriveFolder = process.env.NEXT_PUBLIC_GOOGLE_DRIVE_FOLDER || "https://drive.google.com";
  const targetUrl = (isDrive && (lowerUrl.endsWith("/files/ver") || lowerUrl === "ver"))
    ? googleDriveFolder
    : (comprobanteUrl ?? googleDriveFolder);
  const isPdf = (comprobanteUrl?.toLowerCase().endsWith(".pdf") ?? false) || isDrive;
  const displayUrl = isDrive && comprobanteUrl && !lowerUrl.endsWith("/files/ver") && lowerUrl !== "ver" ? (() => {
    const match = comprobanteUrl.match(/\/d\/([a-zA-Z0-9-_]+)/) || comprobanteUrl.match(/[?&]id=([a-zA-Z0-9-_]+)/);
    return match ? `https://drive.google.com/file/d/${match[1]}/preview` : comprobanteUrl;
  })() : comprobanteUrl;


  return (
    <>
      <Card
        className={`flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between border-l-4 transition-all duration-200 hover:translate-x-0.5 ${
          esIngreso ? "border-l-brand hover:border-l-brand-strong" : "border-l-ink-subtle hover:border-l-ink"
        }`}
      >
        <div className="flex items-start gap-3">
          <span
            className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
              esIngreso ? "bg-brand-soft text-brand border border-brand/10" : "bg-surface-sunken text-ink-muted border border-border"
            }`}
          >
            {esIngreso ? <IconTrendingUp size={18} /> : <IconReceipt size={18} />}
          </span>
          <div>
            <p className="font-semibold text-ink leading-tight">{titulo}</p>
            {subtitulo && <p className="text-xs text-ink-muted mt-0.5">{subtitulo}</p>}
            <p className="mt-1 text-[11px] font-medium tracking-wide uppercase text-ink-subtle">{formatDate(fecha)}</p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
          <div className="flex flex-col items-end">
            <Money
              amount={amount}
              currency={currency}
              className={`text-lg font-bold tabular-nums ${esIngreso ? "text-brand" : "text-ink"}`}
            />
            {exchangeRate && exchangeRate > 0 && (
              <span className="text-[10px] font-semibold text-ink-subtle mt-0.5 tabular-nums">
                {currency === "USD" ? (
                  <>~ <Money amount={amount * exchangeRate} currency="VES" /></>
                ) : (
                  <>~ <Money amount={amount / exchangeRate} currency="USD" /></>
                )}
              </span>
            )}
          </div>
          {comprobanteUrl && (
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-1.5 rounded-md bg-surface px-2.5 py-1 text-xs font-semibold text-brand-strong border border-border-strong hover:bg-surface-sunken hover:text-brand transition-colors cursor-pointer"
            >
              <IconReceipt size={14} />
              {comprobanteLabel ?? "Ver factura"}
            </button>
          )}
        </div>
      </Card>

      {/* Modal para visualizar el comprobante */}
      {showModal && comprobanteUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 sm:p-6 transition-opacity animate-in fade-in duration-200">
          <div className="relative max-w-3xl w-full bg-surface rounded-xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            {/* Cabecera del Modal */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-surface-sunken/30">
              <div>
                <h3 className="font-bold text-ink leading-tight">{comprobanteLabel ?? "Factura / Comprobante"}</h3>
                <p className="text-xs text-ink-muted mt-0.5">{titulo}</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
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
                  <h3 className="font-serif text-lg font-bold text-ink">Soporte en Google Drive</h3>
                  <p className="text-sm text-ink-muted leading-relaxed">
                    Este documento está almacenado en Google Drive. Debido a las restricciones de seguridad del navegador y de Google Drive (como la protección contra hotlinking y el bloqueo de marcos iFrame), no se puede previsualizar directamente aquí.
                  </p>
                  <a
                    href={targetUrl ?? undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg bg-brand text-brand-contrast hover:bg-brand-strong px-5 py-2.5 text-sm font-semibold shadow-md transition-all cursor-pointer"
                  >
                    Abrir en pestaña nueva
                  </a>
                </div>
              ) : isPdf ? (
                <iframe
                  src={displayUrl ?? undefined}
                  title="Comprobante / Factura PDF"
                  className="w-full h-[60vh] border-0 rounded-md shadow-sm bg-background"
                />
              ) : (
                <img
                  src={displayUrl ?? undefined}
                  alt="Comprobante / Factura"
                  className="max-h-[60vh] max-w-full object-contain rounded-md shadow-md border border-border/50 bg-background"
                />
              )}
            </div>

            {/* Pie del Modal */}
            <div className="flex items-center justify-between gap-3 p-4 border-t border-border bg-surface-sunken/30">
              <a
                href={targetUrl ?? undefined}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md bg-background text-ink border border-border-strong hover:bg-surface px-3 py-1.5 text-xs font-semibold shadow-sm transition-colors"
              >
                Abrir en pestaña nueva
              </a>
              <button
                onClick={() => setShowModal(false)}
                className="inline-flex items-center gap-1.5 rounded-md bg-brand text-brand-contrast hover:bg-brand-strong px-4 py-1.5 text-xs font-semibold shadow-sm transition-colors cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/** Tarjeta de insumo (inventario / necesidades). */
export function InsumoCard({
  name,
  category,
  unit,
  currentStock,
  minThreshold,
}: {
  name: string;
  category?: string | null;
  unit: string;
  currentStock: number;
  minThreshold: number;
}) {
  const nivel = nivelStock(currentStock, minThreshold);
  const tone = nivel === "agotado" ? "danger" : nivel === "bajo" ? "warning" : "brand";
  const faltante = Math.max(0, minThreshold - currentStock);

  return (
    <Card className="flex flex-col gap-3 p-5 border border-border/80 hover:border-brand/20 bg-surface transition-all duration-300">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-bold text-ink leading-tight">{name}</p>
          {category && <p className="text-xs text-ink-subtle mt-1 font-medium uppercase tracking-wider">{category}</p>}
        </div>
        <BadgeStock estado={nivel} />
      </div>

      <div className="my-1">
        <ProgressBar value={currentStock} max={Math.max(minThreshold, currentStock, 1)} tone={tone} />
      </div>

      <div className="flex items-center justify-between text-xs font-medium pt-1">
        <span className="text-ink-muted">
          <span className="font-bold text-ink tabular-nums">
            {formatNumber(currentStock)}
          </span>{" "}
          {unit} en existencia
        </span>
      </div>
    </Card>
  );
}
