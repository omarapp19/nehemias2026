"use client";

import { useEffect, useState } from "react";
import {
  Button,
  Card,
  IconUpload,
  IconX,
  IconTrash,
  IconArrowRight,
  formatDate,
} from "@nehemias/ui";
import type { PaginationMeta } from "@nehemias/core";
import { apiGaleria, apiSubirFotos, apiEliminarFoto } from "@/lib/admin-api";
import { fileUrl } from "@/lib/config";

interface GalleryPhotoItem {
  id: string;
  url: string;
  title: string | null;
  createdAt: string;
}

const PAGE_SIZE = 20;

export default function AdminGaleriaPage() {
  const [fotos, setFotos] = useState<GalleryPhotoItem[]>([]);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<PaginationMeta>({ page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 });
  const [files, setFiles] = useState<File[]>([]);
  const [estado, setEstado] = useState<"idle" | "enviando">("idle");
  const [error, setError] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function cargar(p: number = page) {
    apiGaleria({ page: p, limit: PAGE_SIZE })
      .then((r) => {
        setFotos(r.fotos);
        setMeta(r.meta);
      })
      .catch(() => setFotos([]));
  }

  useEffect(() => {
    cargar(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  async function eliminar(id: string) {
    setBusyId(id);
    setDeleteError(null);
    try {
      await apiEliminarFoto(id);
      setConfirmDeleteId(null);
      cargar(page);
    } catch (err) {
      setDeleteError((err as Error).message || "No se pudo eliminar la foto.");
    } finally {
      setBusyId(null);
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    if (files.length === 0) {
      setError("Selecciona al menos una foto para subir.");
      return;
    }
    setEstado("enviando");
    const data = new FormData();
    for (const f of files) {
      data.append("photos", f);
    }
    try {
      await apiSubirFotos(data);
      setFiles([]);
      setEstado("idle");
      cargar();
    } catch (err) {
      setError((err as Error).message || "No se pudo subir las fotos.");
      setEstado("idle");
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl font-semibold text-ink">Galería de fotos</h1>
        <p className="mt-1 text-ink-muted">
          Sube imágenes de las actividades en el terreno. Se optimizan y comprimen automáticamente.
        </p>
      </div>

      <Card className="p-5">
        <h2 className="mb-4 font-serif text-lg font-semibold text-ink">Subir nuevas fotos</h2>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="photos-upload"
              className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border-strong bg-surface py-8 text-ink-muted hover:bg-surface-sunken transition-colors"
            >
              <IconUpload size={32} className="text-ink-subtle mb-2" />
              <span className="text-sm font-semibold text-ink">
                {files.length > 0
                  ? `${files.length} foto(s) seleccionada(s)`
                  : "Seleccionar fotos"}
              </span>
              <span className="text-xs text-ink-subtle mt-1">Soporta PNG, JPG, JPEG</span>
              <input
                id="photos-upload"
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
              />
            </label>
          </div>

          {files.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {files.map((f, i) => (
                <div
                  key={i}
                  className="flex items-center gap-1.5 rounded-full bg-surface-sunken border border-border px-3 py-1 text-xs text-ink font-medium"
                >
                  <span className="max-w-[150px] truncate">{f.name}</span>
                  <button
                    type="button"
                    onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                    className="text-ink-muted hover:text-ink cursor-pointer"
                  >
                    <IconX size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {error && <p className="text-sm text-danger font-medium">{error}</p>}

          <div>
            <Button type="submit" size="lg" disabled={estado === "enviando" || files.length === 0}>
              {estado === "enviando" ? "Subiendo..." : "Subir a la galería"}
            </Button>
          </div>
        </form>
      </Card>

      <section className="space-y-4">
        <h2 className="font-serif text-xl font-semibold text-ink">Imágenes en la galería ({meta.total})</h2>
        
        {deleteError && (
          <div className="bg-danger-soft border border-danger/20 text-danger p-3 rounded-lg text-xs font-semibold">
            {deleteError}
          </div>
        )}

        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {fotos.map((f) => {
            const src = fileUrl(f.url);
            return (
              <div
                key={f.id}
                className="relative group rounded-xl border border-border bg-surface shadow-sm overflow-hidden flex flex-col justify-between"
              >
                <div className="aspect-square bg-surface-sunken relative overflow-hidden">
                  {src ? (
                    <img
                      src={src}
                      alt={f.title || "Foto de galería"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-ink-subtle text-xs">
                      Sin foto
                    </div>
                  )}
                  
                  {/* Botón eliminar flotante en hover */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    {confirmDeleteId === f.id ? (
                      <div className="flex flex-col gap-1.5 p-2 bg-surface rounded-lg shadow-lg text-center mx-2 animate-in zoom-in-95 duration-150">
                        <span className="text-[10px] font-bold text-danger leading-tight">¿Eliminar?</span>
                        <div className="flex gap-1">
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            disabled={busyId === f.id}
                            className="bg-surface-sunken text-ink text-[10px] font-semibold px-1.5 py-0.5 rounded border border-border cursor-pointer hover:bg-surface"
                          >
                            No
                          </button>
                          <button
                            onClick={() => eliminar(f.id)}
                            disabled={busyId === f.id}
                            className="bg-danger text-white text-[10px] font-bold px-1.5 py-0.5 rounded cursor-pointer hover:bg-danger-strong"
                          >
                            Sí
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(f.id)}
                        className="p-2 rounded-full bg-surface text-danger hover:bg-danger-soft hover:scale-105 transition-all shadow-md cursor-pointer"
                        title="Eliminar de la galería"
                      >
                        <IconTrash size={18} />
                      </button>
                    )}
                  </div>
                </div>
                {f.title && (
                  <div className="p-2 text-center border-t border-border/50">
                    <p className="text-xs font-semibold text-ink truncate" title={f.title}>
                      {f.title}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {fotos.length === 0 && (
          <p className="text-ink-muted py-8 text-center bg-surface-sunken/45 rounded-xl border border-border border-dashed text-sm font-medium">
            Aún no hay fotos en la galería.
          </p>
        )}

        {meta.totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 border-t border-border/50 pt-4">
            <Button
              variant="secondary"
              size="sm"
              className="gap-1.5"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              <IconArrowRight size={16} className="rotate-180" />
              Atrás
            </Button>
            <p className="text-sm text-ink-muted">
              Página <span className="font-semibold text-ink">{meta.page}</span> de {meta.totalPages}
            </p>
            <Button
              variant="secondary"
              size="sm"
              className="gap-1.5"
              onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
              disabled={page >= meta.totalPages}
            >
              Adelante
              <IconArrowRight size={16} />
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
