"use client";

import { useEffect, useState } from "react";
import {
  Button,
  Card,
  Field,
  Input,
  Select,
  Textarea,
  Money,
  BadgeDonacion,
  formatDate,
  IconCheck,
  IconX,
} from "@nehemias/ui";
import type { AdminDonation } from "@nehemias/core";
import {
  apiDonaciones,
  apiRevisarDonacion,
  apiCrearDonacion,
} from "@/lib/admin-api";
import { metodoLabel } from "@/lib/labels";
import { fileUrl } from "@/lib/config";

type Tab = "pending" | "verified" | "rejected";

export default function AdminDonacionesPage() {
  const [tab, setTab] = useState<Tab>("pending");
  const [items, setItems] = useState<AdminDonation[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);

  function cargar(t: Tab) {
    setCargando(true);
    apiDonaciones(t)
      .then((r) => setItems(r.donaciones))
      .catch(() => setItems([]))
      .finally(() => setCargando(false));
  }

  useEffect(() => {
    cargar(tab);
  }, [tab]);

  async function revisar(id: string, action: "verify" | "reject") {
    setBusyId(id);
    try {
      await apiRevisarDonacion(id, action);
      cargar(tab);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-ink">Donaciones</h1>
          <p className="mt-1 text-ink-muted">
            Aprueba o rechaza. Solo las verificadas suman al balance.
          </p>
        </div>
        <Button variant="secondary" onClick={() => setMostrarForm((v) => !v)}>
          {mostrarForm ? "Cerrar" : "Registrar donación"}
        </Button>
      </div>

      {mostrarForm && <ManualForm onDone={() => cargar(tab)} />}

      {/* Pestañas */}
      <div className="inline-flex rounded-lg border border-border bg-surface p-1">
        {(
          [
            ["pending", "Por verificar"],
            ["verified", "Verificadas"],
            ["rejected", "Rechazadas"],
          ] as [Tab, string][]
        ).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              tab === t ? "bg-background text-ink shadow-sm" : "text-ink-muted"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {cargando ? (
        <p className="text-ink-muted">Cargando...</p>
      ) : items.length === 0 ? (
        <p className="rounded-lg border border-border bg-background p-8 text-center text-ink-muted">
          No hay donaciones {tab === "pending" ? "por verificar" : "aquí"}.
        </p>
      ) : (
        <div className="space-y-3">
          {items.map((d) => (
            <Card key={d.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <BadgeDonacion estado={d.status} />
                    {d.declaredByPublic && (
                      <span className="text-xs text-ink-subtle">declarada por el público</span>
                    )}
                  </div>
                  <p className="text-lg font-semibold text-ink">
                    {d.type === "financial" && d.amount !== null ? (
                      <Money amount={d.amount} currency={d.currency} />
                    ) : (
                      "Donación en especie"
                    )}
                  </p>
                  <p className="text-sm text-ink-muted">
                    {d.donorDisplay}
                    {d.type === "financial" && d.method ? ` · ${metodoLabel(d.method)}` : ""} ·{" "}
                    {formatDate(d.donatedAt)}
                  </p>
                  {d.message && <p className="text-sm italic text-ink-muted">“{d.message}”</p>}

                  {/* Datos privados, solo admin */}
                  {(d.donorContact || d.proofUrl) && (
                    <div className="mt-2 rounded-md bg-surface px-3 py-2 text-sm">
                      {d.donorContact && (
                        <p className="text-ink-muted">
                          Contacto (privado): <span className="text-ink">{d.donorContact}</span>
                        </p>
                      )}
                      {d.proofUrl && (
                        <a
                          href={fileUrl(d.proofUrl) ?? "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-brand hover:text-brand-strong"
                        >
                          Ver comprobante
                        </a>
                      )}
                    </div>
                  )}
                </div>

                {d.status === "pending" && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => revisar(d.id, "verify")}
                      disabled={busyId === d.id}
                    >
                      <IconCheck size={16} /> Aprobar
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => revisar(d.id, "reject")}
                      disabled={busyId === d.id}
                    >
                      <IconX size={16} /> Rechazar
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function ManualForm({ onDone }: { onDone: () => void }) {
  const [anon, setAnon] = useState(false);
  const [estado, setEstado] = useState<"idle" | "enviando">("idle");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEstado("enviando");
    setError("");
    const form = e.currentTarget;
    const data = new FormData(form);
    data.set("type", "financial");
    data.set("isAnonymous", anon ? "true" : "false");
    try {
      await apiCrearDonacion(data);
      form.reset();
      setEstado("idle");
      onDone();
    } catch {
      setError("No se pudo registrar. Revisa los datos.");
      setEstado("idle");
    }
  }

  return (
    <Card className="p-5">
      <h2 className="mb-4 font-serif text-lg font-semibold text-ink">
        Registrar una donación recibida
      </h2>
      <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
        <Field label="Monto" htmlFor="m-monto" required>
          <Input id="m-monto" name="amount" inputMode="decimal" required />
        </Field>
        <Field label="Moneda" htmlFor="m-moneda">
          <Select id="m-moneda" name="currency" defaultValue="USD">
            <option value="USD">Dólares (USD)</option>
            <option value="VES">Bolívares (Bs.)</option>
          </Select>
        </Field>
        <Field label="Método" htmlFor="m-metodo">
          <Select id="m-metodo" name="method" defaultValue="pago_movil">
            <option value="pago_movil">Pago Móvil</option>
            <option value="transfer">Transferencia</option>
            <option value="cash">Efectivo</option>
            <option value="other">Otro</option>
          </Select>
        </Field>
        <Field label="Fecha" htmlFor="m-fecha">
          <Input id="m-fecha" name="donatedAt" type="date" />
        </Field>
        {!anon && (
          <Field label="Nombre del donante" htmlFor="m-nombre">
            <Input id="m-nombre" name="donorName" placeholder="Nombre y apellido" />
          </Field>
        )}
        <Field label="Mensaje (opcional)" htmlFor="m-msg">
          <Textarea id="m-msg" name="message" maxLength={280} />
        </Field>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={anon}
            onChange={(e) => setAnon(e.target.checked)}
            className="h-4 w-4 accent-[color:rgb(var(--color-brand))]"
          />
          Donante anónimo
        </label>
        {error && <p className="text-sm text-danger sm:col-span-2">{error}</p>}
        <div className="sm:col-span-2">
          <Button type="submit" disabled={estado === "enviando"}>
            {estado === "enviando" ? "Guardando..." : "Guardar como verificada"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
