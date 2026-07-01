"use client";

import { useState } from "react";
import { Card, IconCopy, IconCheck } from "@nehemias/ui";

interface PaymentMethodCardProps {
  method: {
    id: string;
    label: string;
    details: string;
  };
}

export function PaymentMethodCard({ method }: PaymentMethodCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(method.details);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Error al copiar al portapapeles:", err);
    }
  };

  return (
    <Card className="relative overflow-hidden p-5 border border-border/80 hover:border-brand/35 transition-all duration-300 shadow-sm bg-white group">
      <div className="flex justify-between items-start gap-4">
        <div className="space-y-2 flex-1">
          <p className="text-xs font-bold uppercase tracking-widest text-brand">
            {method.label}
          </p>
          <p className="text-sm font-semibold text-ink leading-relaxed font-sans whitespace-pre-line select-all">
            {method.details}
          </p>
        </div>
        
        <button
          onClick={handleCopy}
          type="button"
          aria-label={`Copiar datos de ${method.label}`}
          className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-all duration-200 ${
            copied
              ? "bg-success/10 border-success/30 text-success"
              : "bg-surface border-border text-ink-muted hover:bg-brand hover:border-brand hover:text-white"
          }`}
        >
          {copied ? (
            <IconCheck size={16} className="animate-scale" />
          ) : (
            <IconCopy size={16} />
          )}
        </button>
      </div>

      {/* Indicador de copiado flotante (subtil) */}
      {copied && (
        <div className="absolute top-2 right-12 bg-success text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm animate-in fade-in slide-in-from-right-1 duration-200">
          ¡Copiado!
        </div>
      )}
    </Card>
  );
}
