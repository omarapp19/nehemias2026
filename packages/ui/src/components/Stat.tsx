import * as React from "react";
import { cn } from "../lib/cn.js";

/** Dato/cifra con etiqueta. Las cifras usan números tabulares y jerarquía fuerte. */
export function Stat({
  label,
  value,
  hint,
  tone = "ink",
  size = "md",
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: "ink" | "brand" | "danger";
  size?: "md" | "lg" | "xl";
  className?: string;
}) {
  const valueColor =
    tone === "brand" ? "text-brand" : tone === "danger" ? "text-danger" : "text-ink";
  const valueSize =
    size === "xl"
      ? "text-4xl sm:text-5xl"
      : size === "lg"
        ? "text-3xl"
        : "text-2xl";
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <span className="text-sm font-medium uppercase tracking-wide text-ink-subtle">
        {label}
      </span>
      <span className={cn("font-semibold tabular-nums leading-tight", valueSize, valueColor)}>
        {value}
      </span>
      {hint && <span className="text-sm text-ink-muted">{hint}</span>}
    </div>
  );
}
