import * as React from "react";
import { cn } from "../lib/cn.js";

/** Tarjeta base: borde fino limpio + sombra suave y profesional. */
export function Card({
  className,
  children,
  as: As = "div",
  ...props
}: React.HTMLAttributes<HTMLElement> & { as?: React.ElementType }) {
  return (
    <As
      className={cn(
        "rounded-lg border border-border bg-surface shadow-sm hover:shadow-md transition-all duration-300 ease-in-out",
        className,
      )}
      {...props}
    >
      {children}
    </As>
  );
}

export function CardBody({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cn("p-5", className)}>{children}</div>;
}

/** Cabecera de sección editorial: ojillo + título serif + descripción. */
export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-end justify-between gap-4", className)}>
      <div>
        {eyebrow && (
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-brand">
            {eyebrow}
          </p>
        )}
        <h2 className="font-serif text-2xl font-semibold text-ink">{title}</h2>
        {description && <p className="mt-1.5 max-w-prose text-ink-muted">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
