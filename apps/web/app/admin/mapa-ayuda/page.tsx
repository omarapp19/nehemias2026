"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { createPortal } from "react-dom";
import { Button, Card, Field, Input, Textarea, Select, Badge, IconX, IconTrash, IconEdit } from "@nehemias/ui";
import {
  apiPuntosAyuda,
  apiCrearPuntoAyuda,
  apiActualizarPuntoAyuda,
  apiEliminarPuntoAyuda,
  apiSettings,
  apiActualizarSettings,
} from "@/lib/admin-api";
import { DEFAULT_ZONE_COORDS, parseZoneCoords } from "@/lib/impact-zone";

const AdminHelpMap = dynamic(() => import("@/components/admin-help-map"), {
  ssr: false,
  loading: () => <div className="h-[480px] w-full animate-pulse rounded-2xl bg-surface-sunken" />,
});

interface PuntoAyudaRow {
  id: string;
  name: string;
  type: "person" | "organization";
  description: string;
  contactPhone: string | null;
  contactEmail: string | null;
  lat: number | string;
  lng: number | string;
  isActive: boolean;
}

export default function AdminMapaAyudaPage() {
  const [puntos, setPuntos] = useState<PuntoAyudaRow[]>([]);
  const [mode, setMode] = useState<"puntos" | "traza">("puntos");
  const [pendingCoord, setPendingCoord] = useState<{ lat: number; lng: number } | null>(null);
  const [editingPoint, setEditingPoint] = useState<PuntoAyudaRow | null>(null);
  const [zoneCoords, setZoneCoords] = useState<[number, number][]>(DEFAULT_ZONE_COORDS);
  const [zoneSaving, setZoneSaving] = useState(false);
  const [zoneMessage, setZoneMessage] = useState("");
  const [mounted, setMounted] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  function cargarPuntos() {
    apiPuntosAyuda()
      .then((r) => setPuntos(r.puntosAyuda))
      .catch(() => setPuntos([]));
  }
  useEffect(cargarPuntos, []);

  useEffect(() => {
    apiSettings()
      .then((r) => {
        const parsed = parseZoneCoords(r.settings?.impact_zone_coords);
        if (parsed) setZoneCoords(parsed);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    document.body.style.overflow = (pendingCoord || editingPoint) ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [pendingCoord, editingPoint]);

  function onMapClick(lat: number, lng: number) {
    if (mode === "puntos") {
      setPendingCoord({ lat, lng });
    } else {
      setZoneCoords((prev) => [...prev, [lat, lng]]);
    }
  }

  async function eliminar(id: string) {
    setBusyId(id);
    setDeleteError(null);
    try {
      await apiEliminarPuntoAyuda(id);
      setConfirmDeleteId(null);
      cargarPuntos();
    } catch (err) {
      setDeleteError((err as Error).message || "No se pudo eliminar el punto.");
    } finally {
      setBusyId(null);
    }
  }

  async function guardarTraza() {
    setZoneSaving(true);
    setZoneMessage("");
    try {
      await apiActualizarSettings({ impact_zone_coords: JSON.stringify(zoneCoords) });
      setZoneMessage("Traza guardada. Ya se ve en el mapa público.");
    } catch {
      setZoneMessage("Error al guardar la traza.");
    } finally {
      setZoneSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl font-semibold text-ink">Mapa de ayuda</h1>
        <p className="mt-1 text-ink-muted">
          Gestiona los puntos de personas y organizaciones que brindan ayuda, y la traza de la zona
          de mayor impacto que se muestra en el inicio.
        </p>
      </div>

      <Card className="p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            <Button variant={mode === "puntos" ? "primary" : "secondary"} size="sm" onClick={() => setMode("puntos")}>
              Agregar puntos
            </Button>
            {mode === "puntos" && (
              <Button variant="secondary" size="sm" onClick={() => setPendingCoord({ lat: 10.55, lng: -67.4 })}>
                Agregar por coordenadas
              </Button>
            )}
            <Button variant={mode === "traza" ? "primary" : "secondary"} size="sm" onClick={() => setMode("traza")}>
              Editar traza de impacto
            </Button>
          </div>
          {mode === "puntos" ? (
            <p className="text-sm text-ink-subtle">Haz clic en el mapa para agregar un punto.</p>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setZoneCoords((prev) => prev.slice(0, -1))}
                disabled={zoneCoords.length === 0}
              >
                Deshacer último punto
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setZoneCoords([])} disabled={zoneCoords.length === 0}>
                Limpiar
              </Button>
              <Button size="sm" onClick={guardarTraza} disabled={zoneSaving || zoneCoords.length < 2}>
                {zoneSaving ? "Guardando..." : "Guardar traza"}
              </Button>
            </div>
          )}
        </div>
        {mode === "traza" && zoneMessage && (
          <p className={`text-sm font-semibold ${zoneMessage.includes("Error") ? "text-danger" : "text-success"}`}>
            {zoneMessage}
          </p>
        )}

        <AdminHelpMap
          points={puntos.map((p) => ({ ...p, lat: Number(p.lat), lng: Number(p.lng) }))}
          zoneCoords={zoneCoords}
          mode={mode}
          onMapClick={onMapClick}
        />
      </Card>

      {mounted &&
        (pendingCoord || editingPoint) &&
        createPortal(
          <div className="fixed inset-0 z-50 flex justify-center items-start overflow-y-auto bg-black/60 backdrop-blur-sm p-4 sm:p-6 md:p-8">
            <div className="relative max-w-lg w-full bg-white rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between p-5 border-b border-border/60 bg-surface-sunken/30">
                <h3 className="font-serif text-lg font-bold text-ink leading-tight">
                  {editingPoint ? "Editar punto de ayuda" : "Nuevo punto de ayuda"}
                </h3>
                <button
                  onClick={() => {
                    setPendingCoord(null);
                    setEditingPoint(null);
                  }}
                  className="p-1.5 rounded-full text-ink-muted hover:bg-surface-sunken hover:text-ink transition-colors cursor-pointer"
                  aria-label="Cerrar"
                >
                  <IconX size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
                <PuntoAyudaForm
                  coord={pendingCoord || undefined}
                  point={editingPoint || undefined}
                  onDone={() => {
                    setPendingCoord(null);
                    setEditingPoint(null);
                    cargarPuntos();
                  }}
                  onCancel={() => {
                    setPendingCoord(null);
                    setEditingPoint(null);
                  }}
                />
              </div>
            </div>
          </div>,
          document.body,
        )}

      <section className="space-y-4">
        <h2 className="font-serif text-xl font-semibold text-ink">Puntos registrados ({puntos.length})</h2>

        {deleteError && (
          <div className="bg-danger-soft border border-danger/20 text-danger p-3 rounded-lg text-xs font-semibold">
            {deleteError}
          </div>
        )}

        {puntos.map((p) => (
          <Card key={p.id} className="flex items-center justify-between p-5 bg-white border border-border/80">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <p className="font-bold text-ink text-base">{p.name}</p>
                <Badge tone="brand">{p.type === "person" ? "Persona" : "Organización"}</Badge>
                {!p.isActive && <Badge tone="danger">Inactivo</Badge>}
              </div>
              <p className="text-sm text-ink-muted">{p.description}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {confirmDeleteId === p.id ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-danger">¿Eliminar?</span>
                  <Button variant="secondary" size="sm" onClick={() => setConfirmDeleteId(null)} disabled={busyId === p.id}>
                    No
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => eliminar(p.id)} disabled={busyId === p.id}>
                    Sí
                  </Button>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => setEditingPoint(p)}
                    className="p-2 rounded-full text-brand hover:bg-brand-soft transition-colors cursor-pointer"
                    title="Editar punto"
                  >
                    <IconEdit size={18} />
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(p.id)}
                    className="p-2 rounded-full text-danger hover:bg-danger-soft transition-colors cursor-pointer"
                    title="Eliminar punto"
                  >
                    <IconTrash size={18} />
                  </button>
                </>
              )}
            </div>
          </Card>
        ))}

        {puntos.length === 0 && (
          <p className="text-ink-muted py-8 text-center bg-surface-sunken/45 rounded-xl border border-border border-dashed text-sm font-medium">
            Aún no hay puntos de ayuda registrados. Haz clic en el mapa para agregar el primero.
          </p>
        )}
      </section>
    </div>
  );
}

function parseGoogleMapsCoords(input: string): { lat: number; lng: number } | null {
  const str = input.trim();

  // 1. Direct coordinates pattern: e.g. "10.488011, -66.879191"
  const directMatch = str.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  if (directMatch) {
    const lat = parseFloat(directMatch[1]);
    const lng = parseFloat(directMatch[2]);
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng };
    }
  }

  // 2. Google Maps URL matching
  // Look for @lat,lng
  const atMatch = str.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (atMatch) {
    const lat = parseFloat(atMatch[1]);
    const lng = parseFloat(atMatch[2]);
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng };
    }
  }

  // Look for q=lat,lng or query=lat,lng
  const qMatch = str.match(/[?&](?:q|query)=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (qMatch) {
    const lat = parseFloat(qMatch[1]);
    const lng = parseFloat(qMatch[2]);
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng };
    }
  }

  // Look for /place/lat,lng
  const placeMatch = str.match(/\/place\/(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (placeMatch) {
    const lat = parseFloat(placeMatch[1]);
    const lng = parseFloat(placeMatch[2]);
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng };
    }
  }

  return null;
}

function PuntoAyudaForm({
  coord,
  point,
  onDone,
  onCancel,
}: {
  coord?: { lat: number; lng: number };
  point?: PuntoAyudaRow;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [estado, setEstado] = useState<"idle" | "enviando">("idle");
  const [activo, setActivo] = useState(point ? point.isActive : true);
  const [error, setError] = useState("");

  const initialCoords = point
    ? `${Number(point.lat).toFixed(6)}, ${Number(point.lng).toFixed(6)}`
    : coord
      ? `${coord.lat.toFixed(6)}, ${coord.lng.toFixed(6)}`
      : "";
  const [coordsStr, setCoordsStr] = useState(initialCoords);

  useEffect(() => {
    if (point) {
      setCoordsStr(`${Number(point.lat).toFixed(6)}, ${Number(point.lng).toFixed(6)}`);
      setActivo(point.isActive);
    } else if (coord) {
      setCoordsStr(`${coord.lat.toFixed(6)}, ${coord.lng.toFixed(6)}`);
      setActivo(true);
    }
  }, [coord, point]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setEstado("enviando");

    const parsed = parseGoogleMapsCoords(coordsStr);
    if (!parsed) {
      setError(
        "Formato de coordenadas inválido. Ingresa 'latitud, longitud' (ej: 10.55, -67.4) o pega un enlace de Google Maps."
      );
      setEstado("idle");
      return;
    }

    const fd = new FormData(e.currentTarget);
    const data = {
      name: fd.get("name"),
      type: fd.get("type"),
      description: fd.get("description"),
      contactPhone: fd.get("contactPhone") || undefined,
      contactEmail: fd.get("contactEmail") || undefined,
      lat: parsed.lat,
      lng: parsed.lng,
      isActive: activo,
    };
    try {
      if (point) {
        await apiActualizarPuntoAyuda(point.id, data);
      } else {
        await apiCrearPuntoAyuda(data);
      }
      onDone();
    } catch (err) {
      setError((err as Error).message || "No se pudo guardar el punto.");
      setEstado("idle");
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-5">
      <Field label="Coordenadas o Enlace de Google Maps" htmlFor="pa-coords" required>
        <Input
          id="pa-coords"
          name="coords"
          placeholder="Ej: 10.55, -67.4 o enlace de Google Maps"
          value={coordsStr}
          onChange={(e) => setCoordsStr(e.target.value)}
          required
        />
      </Field>
      <Field label="Nombre" htmlFor="pa-name" required>
        <Input
          id="pa-name"
          name="name"
          placeholder="Ej: Juan Pérez o Cruz Roja La Guaira"
          defaultValue={point?.name}
          required
        />
      </Field>
      <Field label="Tipo" htmlFor="pa-type" required>
        <Select id="pa-type" name="type" defaultValue={point?.type || "person"} required>
          <option value="person">Persona particular</option>
          <option value="organization">Organización</option>
        </Select>
      </Field>
      <Field label="Descripción de la ayuda" htmlFor="pa-description" required>
        <Textarea
          id="pa-description"
          name="description"
          placeholder="Qué tipo de ayuda ofrece (agua, refugio, atención médica...)"
          defaultValue={point?.description}
          required
          rows={3}
        />
      </Field>
      <Field label="Teléfono / WhatsApp" htmlFor="pa-phone">
        <Input id="pa-phone" name="contactPhone" placeholder="+58 412 555 0000" defaultValue={point?.contactPhone || ""} />
      </Field>
      <Field label="Correo" htmlFor="pa-email">
        <Input
          id="pa-email"
          name="contactEmail"
          type="email"
          placeholder="contacto@ejemplo.org"
          defaultValue={point?.contactEmail || ""}
        />
      </Field>
      <div>
        <label className="inline-flex cursor-pointer items-center gap-2.5 text-sm font-semibold text-ink select-none">
          <input
            type="checkbox"
            checked={activo}
            onChange={(e) => setActivo(e.target.checked)}
            className="h-4.5 w-4.5 rounded border-border text-brand focus:ring-brand accent-[color:rgb(var(--color-brand))]"
          />
          Visible en el mapa público
        </label>
      </div>
      {error && <p className="text-sm text-danger font-medium">{error}</p>}
      <div className="pt-2 border-t border-border/40 flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={estado === "enviando"}>
          Cancelar
        </Button>
        <Button type="submit" disabled={estado === "enviando"}>
          {estado === "enviando" ? "Guardando..." : point ? "Guardar cambios" : "Agregar punto"}
        </Button>
      </div>
    </form>
  );
}
