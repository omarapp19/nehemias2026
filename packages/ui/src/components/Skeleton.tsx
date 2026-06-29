import * as React from "react";
import { cn } from "../lib/cn.js";

/** Esqueleto de carga elegante (pulso suave; se detiene con prefers-reduced-motion). */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded-md bg-surface-sunken", className)} aria-hidden />
  );
}
