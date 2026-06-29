import * as React from "react";
import { cn } from "../lib/cn.js";

/** Campo con etiqueta, ayuda y error, accesible. */
export function Field({
  label,
  htmlFor,
  help,
  error,
  required,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  help?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-sm font-medium text-ink">
        {label}
        {required && <span className="text-danger"> *</span>}
      </label>
      {children}
      {help && !error && <p className="text-sm text-ink-subtle">{help}</p>}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

// 16px base evita el zoom automático en iOS; alto cómodo para el dedo.
const controlBase =
  "w-full min-h-12 rounded-md border border-border bg-background px-3.5 py-2.5 text-base text-ink " +
  "placeholder:text-ink-subtle transition-colors " +
  "focus:outline-none focus:ring-2 focus:ring-focus focus:border-brand " +
  "disabled:opacity-60 disabled:bg-surface-sunken";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn(controlBase, className)} {...props} />;
});

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea ref={ref} className={cn(controlBase, "min-h-24 py-3", className)} {...props} />
  );
});

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, children, ...props }, ref) {
  return (
    <select ref={ref} className={cn(controlBase, "appearance-none pr-10", className)} {...props}>
      {children}
    </select>
  );
});
