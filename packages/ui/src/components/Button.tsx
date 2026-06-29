import * as React from "react";
import { cn } from "../lib/cn.js";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 font-medium rounded-md " +
  "transition-colors duration-200 select-none " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-background " +
  "disabled:opacity-50 disabled:pointer-events-none";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-brand text-brand-contrast hover:bg-brand-strong shadow-sm",
  secondary: "bg-surface text-ink border border-border-strong hover:bg-surface-sunken",
  ghost: "bg-transparent text-brand hover:bg-brand-soft",
  danger: "bg-danger text-white hover:opacity-90 shadow-sm",
};

// Alturas con objetivo de toque cómodo (md y lg cumplen el mínimo de 48px).
const sizes: Record<ButtonSize, string> = {
  sm: "h-10 px-4 text-sm",
  md: "h-12 px-5 text-base",
  lg: "h-14 px-7 text-lg",
};

/** Devuelve solo las clases (útil para estilizar <Link> como botón). */
export function buttonClasses(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className?: string,
): string {
  return cn(base, variants[variant], sizes[size], className);
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", fullWidth, className, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(buttonClasses(variant, size), fullWidth && "w-full", className)}
      {...props}
    >
      {children}
    </button>
  );
});
