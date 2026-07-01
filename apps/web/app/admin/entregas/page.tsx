"use client";

import { useEffect, useState } from "react";
import {
  Button,
  Card,
  Field,
  Input,
  Select,
  Textarea,
  formatDate,
  IconUpload,
  IconX,
  IconMapPin,
} from "@nehemias/ui";
import type { PublicFrente, PublicDelivery } from "@nehemias/core";
import {
  apiFrentes,
  apiInsumos,
  apiEntregas,
  apiCrearEntrega,
  apiEliminarEntrega,
} from "@/lib/admin-api";

interface SupplyOpt {
  id: string;
  name: string;
  unit: string;
}
interface ItemRow {
  supplyId: string;
  quantity: string;
}

export default function AdminEntregasPage() {
  const [frentes, setFrentes] = useState<PublicFrente[]>([]);
  const [supplies, setSupplies] = useState<SupplyOpt[]>([]);
  const [entregas, setEntregas] = useState<PublicDelivery[]>([]);
  const [rows, setRows] = useState<ItemRow[]>([{ supplyId: "", quantity: "" }]);
  const [files, setFiles] = useState<File[]>([]);
  const [estado, setEstado] = useState<"idle" | "enviando">("idle");
  const [error, setError] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function cargar() {
    apiEntregas()
      .then((r) => setEntregas(r.entregas))
      .catch(() => setEntregas([]));
  }
  useEffect(() => {
    apiFrentes().then((r) => setFrentes(r.frentes)).catch(() => {});
    apiInsumos().then((r) => setSupplies(r.insumos)).catch(() => {});
    cargar();
  }, []);

  async function eliminar(id: string) {
    setBusyId(id);
    setDeleteError(null);
    try {
      await apiEliminarEntrega(id);
      setConfirmDeleteId(null);
      cargar();
    } catch (err) {
      setDeleteError((err as Error).message || "No se pudo eliminar la entrega.");
    } finally {
      setBusyId(null);
    }
  }

  function setRow(i: number, patch: Partial<ItemRow>) {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const validRows = rows.filter((r) => r.supplyId && Number(r.quantity) > 0);
    if (validRows.length === 0) {
      setError("Agrega al menos un insumo entregado.");
      return;
    }
    setEstado("enviando");
    const form = e.currentTarget;
    const data = new FormData(form);
    const items = validRows.map((r) => {
      const s = supplies.find((x) => x.id === r.supplyId)!;
      return {
        supplyId: s.id,
        description: s.name,
        unit: s.unit,
        quantity: Number(r.quantity),
      };
    });
    data.set("items", JSON.stringify(items));
    for (const f of files) data.append("photos", f);
    try {
      await apiCrearEntrega(data);
      form.reset();
      setRows([{ supplyId: "", quantity: "" }]);
      setFiles([]);
      setEstado("idle");
      cargar();
    } catch (err) {
      setError((err as Error).message || "No se pudo registrar la entrega.");
      setEstado("idle");
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl font-semibold text-ink">Entregas</h1>
        <p className="mt-1 text-ink-muted">
          Registra una jornada con fotos. Descuenta del inventario automáticamente.
        </p>
      </div>

      <Card className="p-5">
        <h2 className="mb-4 font-serif text-lg font-semibold text-ink">Nueva entrega</h2>
        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Frente" htmlFor="frente" required>
              <Select id="frente" name="frenteId" defaultValue="" required>
                <option value="" disabled>
                  Elige un frente
                </option>
                {frentes.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Fecha" htmlFor="fecha">
              <Input id="fecha" name="deliveredAt" type="date" />
            </Field>
          </div>
          <Field label="Título de la jornada" htmlFor="title" required>
            <Input id="title" name="title" placeholder="Entrega de alimentos en La Guaira" required />
          </Field>
          <Field label="Notas" htmlFor="notes">
            <Textarea id="notes" name="notes" placeholder="A cuántas familias se atendió..." />
          </Field>

          {/* Insumos entregados */}
          <div>
            <span className="text-sm font-medium text-ink">Insumos entregados</span>
            <div className="mt-2 space-y-2">
              {rows.map((row, i) => (
                <div key={i} className="flex gap-2">
                  <Select
                    value={row.supplyId}
                    onChange={(e) => setRow(i, { supplyId: e.target.value })}
                    className="flex-1"
                  >
                    <option value="">Elige un insumo</option>
                    {supplies.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.unit})
                      </option>
                    ))}
                  </Select>
                  <Input
                    value={row.quantity}
                    onChange={(e) => setRow(i, { quantity: e.target.value })}
                    inputMode="decimal"
                    placeholder="Cant."
                    className="w-28"
                  />
                  {rows.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setRows((rs) => rs.filter((_, idx) => idx !== i))}
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-border text-ink-muted hover:bg-surface"
                      aria-label="Quitar"
                    >
                      <IconX size={18} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-2"
              onClick={() => setRows((rs) => [...rs, { supplyId: "", quantity: "" }])}
            >
              + Agregar insumo
            </Button>
          </div>

          {/* Fotos */}
          <div>
            <span className="text-sm font-medium text-ink">Fotos de la entrega</span>
            <label
              htmlFor="photos"
              className="mt-2 flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-border-strong bg-surface px-4 py-3 text-ink-muted hover:bg-surface-sunken"
            >
              <IconUpload size={20} />
              <span className="text-sm">
                {files.length > 0 ? `${files.length} foto(s) seleccionada(s)` : "Tomar o subir fotos"}
              </span>
              <input
                id="photos"
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                className="sr-only"
                onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
              />
            </label>
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}
          <div>
            <Button type="submit" size="lg" disabled={estado === "enviando"}>
              {estado === "enviando" ? "Guardando..." : "Registrar entrega"}
            </Button>
          </div>
        </form>
      </Card>

      <section className="space-y-3">
        <h2 className="font-serif text-lg font-semibold text-ink">Entregas registradas</h2>
        {entregas.map((e) =>
          confirmDeleteId === e.id ? (
            <Card key={e.id} className="flex flex-col gap-3 bg-danger-soft/10 border border-danger/20 p-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-danger">¿Eliminar la entrega "{e.title}"?</p>
                  <p className="text-xs text-ink-muted mt-0.5">Esta acción no se puede deshacer y restaurará el stock de los insumos en el inventario.</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" variant="secondary" onClick={() => { setConfirmDeleteId(null); setDeleteError(null); }} disabled={busyId === e.id}>
                    Cancelar
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => eliminar(e.id)} disabled={busyId === e.id}>
                    {busyId === e.id ? "Eliminando..." : "Sí, eliminar"}
                  </Button>
                </div>
              </div>
              {deleteError && (
                <div className="bg-danger-soft/20 border border-danger/20 text-danger p-3 rounded-lg text-xs font-semibold">
                  {deleteError}
                </div>
              )}
            </Card>
          ) : (
            <Card key={e.id} className="flex items-center justify-between p-4">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 text-brand">
                  <IconMapPin size={18} />
                </span>
                <div>
                  <p className="font-medium text-ink">{e.title}</p>
                  <p className="text-sm text-ink-subtle">
                    {e.frente.name} · {formatDate(e.deliveredAt)} · {e.items.length} insumos ·{" "}
                    {e.photos.length} fotos
                  </p>
                </div>
              </div>
              <div>
                <Button variant="ghost" size="sm" className="text-danger hover:bg-danger-soft/20" onClick={() => setConfirmDeleteId(e.id)}>
                  Eliminar
                </Button>
              </div>
            </Card>
          )
        )}
        {entregas.length === 0 && <p className="text-ink-muted">Aún no hay entregas.</p>}
      </section>
    </div>
  );
}
