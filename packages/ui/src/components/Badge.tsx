import * as React from "react";
import { cn } from "../lib/cn.js";
import { IconCheck, IconClock, IconX, IconAlert } from "./icons.js";

export type BadgeTone = "neutral" | "brand" | "success" | "warning" | "danger";

const tones: Record<BadgeTone, string> = {
  neutral: "bg-surface-sunken text-ink-muted",
  brand: "bg-brand-soft text-brand-strong",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
};

/**
 * Etiqueta de estado. Distingue por color + TEXTO + FORMA (icono),
 * nunca solo por color (accesibilidad).
 */
export function Badge({
  tone = "neutral",
  icon,
  children,
  className,
}: {
  tone?: BadgeTone;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        tones[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}

export type EstadoDonacion = "pending" | "verified" | "rejected";

const DONACION: Record<
  EstadoDonacion,
  { tone: BadgeTone; label: string; icon: React.ReactNode }
> = {
  pending: { tone: "warning", label: "Pendiente", icon: <IconClock size={14} /> },
  verified: { tone: "success", label: "Verificada", icon: <IconCheck size={14} /> },
  rejected: { tone: "danger", label: "Rechazada", icon: <IconX size={14} /> },
};

export function BadgeDonacion({ estado }: { estado: EstadoDonacion }) {
  const d = DONACION[estado];
  return (
    <Badge tone={d.tone} icon={d.icon}>
      {d.label}
    </Badge>
  );
}

export type EstadoStock = "normal" | "bajo" | "agotado";

export function nivelStock(currentStock: number, minThreshold: number): EstadoStock {
  if (currentStock <= 0) return "agotado";
  if (currentStock < minThreshold) return "bajo";
  return "normal";
}

const STOCK: Record<EstadoStock, { tone: BadgeTone; label: string; icon: React.ReactNode }> = {
  normal: { tone: "success", label: "En existencia", icon: <IconCheck size={14} /> },
  bajo: { tone: "warning", label: "Stock bajo", icon: <IconAlert size={14} /> },
  agotado: { tone: "danger", label: "Agotado", icon: <IconAlert size={14} /> },
};

export function BadgeStock({ estado }: { estado: EstadoStock }) {
  const s = STOCK[estado];
  return (
    <Badge tone={s.tone} icon={s.icon}>
      {s.label}
    </Badge>
  );
}
