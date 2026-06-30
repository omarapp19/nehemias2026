import * as React from "react";
import { cn } from "../lib/cn.js";

export type ProgressTone = "brand" | "warning" | "danger";

const fills: Record<ProgressTone, string> = {
  brand: "bg-brand",
  warning: "bg-warning",
  danger: "bg-danger",
};

/** Barra de avance sobria. Anima el ancho (respeta prefers-reduced-motion vía CSS). */
export function ProgressBar({
  value,
  max,
  tone = "brand",
  label,
  className,
}: {
  value: number;
  max: number;
  tone?: ProgressTone;
  label?: string;
  className?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && <span className="text-sm text-ink-muted">{label}</span>}
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-surface-sunken"
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={cn("h-full rounded-full transition-[width] duration-500", fills[tone])}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
