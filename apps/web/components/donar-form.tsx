"use client";

import { useState } from "react";
import { Button, Field, Input, Select, Textarea, IconCheck, IconCamera } from "@nehemias/ui";
import { PUBLIC_API_BASE } from "@/lib/config";

type Estado = "idle" | "enviando" | "ok" | "error";

export function DonarForm() {
  const [estado, setEstado] = useState<Estado>("idle");
  const [anonimo, setAnonimo] = useState(false);
  const [error, setError] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEstado("enviando");
    setError("");

    const form = e.currentTarget;
    const data = new FormData(form);
    data.set("type", "financial");
    data.set("isAnonymous", anonimo ? "true" : "false");

    try {
      const res = await fetch(`${PUBLIC_API_BASE}/public/donaciones`, {
        method: "POST",
        body: data,
      });
      if (res.status === 201) {
        setEstado("ok");
        form.reset();
        setFileName("");
        return;
      }
      const body = await res.json().catch(() => ({}));
      setError(body?.error ?? "No pudimos registrar tu donación. Revisa los datos.");
      setEstado("error");
    } catch {
      setError("No hay conexión. Intenta de nuevo en un momento.");
      setEstado("error");
    }
  }

  if (estado === "ok") {
    return (
      <div className="rounded-xl border border-success/30 bg-success-soft p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success text-white">
          <IconCheck size={24} />
        </div>
        <h3 className="mt-4 font-serif text-2xl font-semibold text-ink">¡Gracias de corazón!</h3>
        <p className="mt-2 text-ink-muted">
          Tu donación quedó registrada y la verificaremos pronto. Una vez confirmada,
          aparecerá en la transparencia pública.
        </p>
        <Button className="mt-6" variant="secondary" onClick={() => setEstado("idle")}>
          Declarar otra donación
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Monto donado" htmlFor="monto" required help="Solo el número.">
          <Input id="monto" name="amount" inputMode="decimal" placeholder="100.00" required />
        </Field>
        <Field label="Moneda" htmlFor="moneda" required>
          <Select id="moneda" name="currency" defaultValue="USD" required>
            <option value="USD">Dólares (USD)</option>
            <option value="VES">Bolívares (Bs.)</option>
          </Select>
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="¿Cómo donaste?" htmlFor="metodo">
          <Select id="metodo" name="method" defaultValue="pago_movil">
            <option value="pago_movil">Pago Móvil</option>
            <option value="transfer">Transferencia</option>
            <option value="cash">Efectivo</option>
            <option value="other">Otro</option>
          </Select>
        </Field>
        <Field label="Fecha" htmlFor="fecha">
          <Input id="fecha" name="donatedAt" type="date" />
        </Field>
      </div>

      {/* Identidad pública */}
      <fieldset className="rounded-lg border border-border p-4">
        <legend className="px-1 text-sm font-medium text-ink">¿Cómo quieres aparecer?</legend>
        <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="inline-flex items-center gap-2 text-base">
            <input
              type="radio"
              name="modo"
              checked={!anonimo}
              onChange={() => setAnonimo(false)}
              className="h-4 w-4 accent-[color:rgb(var(--color-brand))]"
            />
            Con mi nombre
          </label>
          <label className="inline-flex items-center gap-2 text-base">
            <input
              type="radio"
              name="modo"
              checked={anonimo}
              onChange={() => setAnonimo(true)}
              className="h-4 w-4 accent-[color:rgb(var(--color-brand))]"
            />
            Anónimo
          </label>
        </div>
        {!anonimo && (
          <div className="mt-4">
            <Field label="Tu nombre" htmlFor="nombre" help="Aparecerá junto a tu aporte.">
              <Input id="nombre" name="donorName" placeholder="Nombre y apellido" />
            </Field>
          </div>
        )}
      </fieldset>

      <Field
        label="Contacto (privado)"
        htmlFor="contacto"
        help="Solo para confirmarte. NUNCA se muestra públicamente."
      >
        <Input id="contacto" name="donorContact" placeholder="Teléfono o correo" />
      </Field>

      <Field label="Mensaje (opcional)" htmlFor="mensaje" help="Se muestra públicamente.">
        <Textarea id="mensaje" name="message" maxLength={280} placeholder="Un mensaje de aliento..." />
      </Field>

      {/* Comprobante */}
      <div>
        <span className="text-sm font-medium text-ink">Comprobante (opcional)</span>
        <p className="mb-2 text-sm text-ink-subtle">
          Una foto del comprobante nos ayuda a verificar más rápido. Es privado.
        </p>
        <label
          htmlFor="proof"
          className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-border-strong bg-surface px-4 py-3 text-ink-muted hover:bg-surface-sunken"
        >
          <IconCamera size={22} />
          <span className="text-sm">{fileName || "Tomar foto o subir archivo"}</span>
          <input
            id="proof"
            name="proof"
            type="file"
            accept="image/*,application/pdf"
            capture="environment"
            className="sr-only"
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
          />
        </label>
      </div>

      {estado === "error" && (
        <p role="alert" className="rounded-md bg-danger-soft px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      <Button type="submit" size="lg" disabled={estado === "enviando"} fullWidth>
        {estado === "enviando" ? "Enviando..." : "Declarar mi donación"}
      </Button>
    </form>
  );
}
