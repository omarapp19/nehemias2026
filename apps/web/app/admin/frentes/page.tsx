"use client";

import { useEffect, useState } from "react";
import { Button, Card, Field, Input, Select, Textarea, IconMapPin } from "@nehemias/ui";
import type { PublicFrente } from "@nehemias/core";
import { apiFrentes, apiCrearFrente, apiActualizarFrente, apiEliminarFrente } from "@/lib/admin-api";
import { FRENTE_TIPO_LABEL } from "@/lib/labels";

export default function AdminFrentesPage() {
  const [items, setItems] = useState<PublicFrente[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function cargar() {
    apiFrentes()
      .then((r) => setItems(r.frentes))
      .catch(() => setItems([]));
  }
  useEffect(cargar, []);

  async function eliminar(id: string) {
    setBusyId(id);
    setError(null);
    try {
      await apiEliminarFrente(id);
      setConfirmDeleteId(null);
      cargar();
    } catch (err) {
      setError((err as Error).message || "No se pudo eliminar el frente.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl font-semibold text-ink">Frentes de atención</h1>
        <p className="mt-1 text-ink-muted">Comunidades, refugios y grupos de desplazados.</p>
      </div>

      {error && (
        <div className="bg-danger-soft/20 border border-danger/20 text-danger p-4 rounded-xl text-sm font-medium">
          {error}
        </div>
      )}

      <FrenteForm
        key={formKey}
        onDone={() => {
          setEditId(null);
          setFormKey((k) => k + 1);
          cargar();
        }}
      />

      <section className="space-y-3">
        {items.map((f) =>
          editId === f.id ? (
            <FrenteForm
              key={f.id}
              frente={f}
              onDone={() => {
                setEditId(null);
                cargar();
              }}
              onCancel={() => setEditId(null)}
            />
          ) : confirmDeleteId === f.id ? (
            <Card key={f.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-danger-soft/10 border border-danger/20 p-4">
              <div>
                <p className="text-sm font-bold text-danger">¿Eliminar el frente "{f.name}"?</p>
                <p className="text-xs text-ink-muted mt-0.5">Esta acción no se puede deshacer.</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button size="sm" variant="secondary" onClick={() => setConfirmDeleteId(null)} disabled={busyId === f.id}>
                  Cancelar
                </Button>
                <Button size="sm" variant="danger" onClick={() => eliminar(f.id)} disabled={busyId === f.id}>
                  {busyId === f.id ? "Eliminando..." : "Sí, eliminar"}
                </Button>
              </div>
            </Card>
          ) : (
            <Card key={f.id} className="flex items-center justify-between p-4">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 text-brand">
                  <IconMapPin size={20} />
                </span>
                <div>
                  <p className="font-medium text-ink">{f.name}</p>
                  <p className="text-sm text-ink-subtle">
                    {FRENTE_TIPO_LABEL[f.type] ?? f.type}
                    {f.location ? ` · ${f.location}` : ""}
                  </p>
                  {f.description && <p className="mt-1 text-sm text-ink-muted">{f.description}</p>}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setEditId(f.id)}>
                  Editar
                </Button>
                <Button variant="ghost" size="sm" className="text-danger hover:bg-danger-soft/20" onClick={() => setConfirmDeleteId(f.id)}>
                  Eliminar
                </Button>
              </div>
            </Card>
          ),
        )}
        {items.length === 0 && <p className="text-ink-muted">Aún no hay frentes.</p>}
      </section>
    </div>
  );
}

function FrenteForm({
  frente,
  onDone,
  onCancel,
}: {
  frente?: PublicFrente;
  onDone: () => void;
  onCancel?: () => void;
}) {
  const [estado, setEstado] = useState<"idle" | "enviando">("idle");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEstado("enviando");
    const data = Object.fromEntries(new FormData(e.currentTarget));
    try {
      if (frente) await apiActualizarFrente(frente.id, data);
      else await apiCrearFrente(data);
      onDone();
    } finally {
      setEstado("idle");
    }
  }

  return (
    <Card className="p-5">
      <h2 className="mb-4 font-serif text-lg font-semibold text-ink">
        {frente ? "Editar frente" : "Agregar frente"}
      </h2>
      <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre" htmlFor="f-name" required>
          <Input id="f-name" name="name" defaultValue={frente?.name} required />
        </Field>
        <Field label="Tipo" htmlFor="f-type">
          <Select id="f-type" name="type" defaultValue={frente?.type ?? "comunidad"}>
            <option value="comunidad">Comunidad</option>
            <option value="refugio">Refugio</option>
            <option value="desplazados">Desplazados</option>
          </Select>
        </Field>
        <Field label="Ubicación" htmlFor="f-loc">
          <Input id="f-loc" name="location" defaultValue={frente?.location ?? ""} />
        </Field>
        <Field label="Descripción" htmlFor="f-desc" className="sm:col-span-2">
          <Textarea id="f-desc" name="description" defaultValue={frente?.description ?? ""} />
        </Field>
        <div className="flex gap-2 sm:col-span-2">
          <Button type="submit" disabled={estado === "enviando"}>
            {estado === "enviando" ? "Guardando..." : frente ? "Guardar cambios" : "Agregar"}
          </Button>
          {onCancel && (
            <Button type="button" variant="secondary" onClick={onCancel}>
              Cancelar
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
}
