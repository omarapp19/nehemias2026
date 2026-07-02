"use client";

import { useState } from "react";
import { Button, formatDate, IconX, IconCamera, IconArrowRight } from "@nehemias/ui";
import { fileUrl } from "@/lib/config";

interface PhotoItem {
  id: string;
  url: string;
  title: string | null;
  createdAt: string;
}

const PAGE_SIZE = 12;

export function GalleryView({ photos }: { photos: PhotoItem[] }) {
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoItem | null>(null);
  const [page, setPage] = useState(1);

  const totalPaginas = Math.max(1, Math.ceil(photos.length / PAGE_SIZE));
  const paginaActual = Math.min(page, totalPaginas);
  const inicio = (paginaActual - 1) * PAGE_SIZE;
  const fotosPagina = photos.slice(inicio, inicio + PAGE_SIZE);

  if (photos.length === 0) {
    return (
      <div className="text-center py-20 bg-surface rounded-xl border border-border/80 p-8 shadow-sm">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-surface-sunken text-ink-subtle border border-border">
          <IconCamera size={22} />
        </span>
        <h3 className="mt-4 font-serif text-lg font-semibold text-ink">No hay fotos todavía</h3>
        <p className="mt-2 text-sm text-ink-muted max-w-sm mx-auto">
          Las fotos de las actividades aparecerán en esta sección a medida que se suban.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="columns-1 gap-5 sm:columns-2 lg:columns-3 xl:columns-4 space-y-5">
        {fotosPagina.map((photo) => {
          const src = fileUrl(photo.url);
          if (!src) return null;

          return (
            <div
              key={photo.id}
              onClick={() => setSelectedPhoto(photo)}
              className="break-inside-avoid relative overflow-hidden rounded-xl border border-border bg-surface shadow-sm hover:shadow-md cursor-pointer transition-all duration-300 group"
            >
              <img
                src={src}
                alt={photo.title || "Foto de actividad"}
                className="w-full h-auto object-cover rounded-xl transition-transform duration-500 group-hover:scale-[1.03]"
                loading="lazy"
              />
              {/* Overlay en hover */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4 rounded-xl">
                <span className="text-[10px] font-bold text-brand-soft uppercase tracking-wider">
                  {formatDate(photo.createdAt)}
                </span>
                {photo.title && (
                  <h3 className="text-sm font-semibold text-white mt-1 leading-snug line-clamp-2">
                    {photo.title}
                  </h3>
                )}
                <span className="text-[11px] text-white/80 mt-2 font-medium underline group-hover:text-brand-soft">
                  Ampliar foto
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {photos.length > 0 && (
        <div className="mt-6 flex items-center justify-center gap-3 border-t border-border/50 pt-4">
          <Button
            variant="secondary"
            size="sm"
            className="gap-1.5"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={paginaActual <= 1}
          >
            <IconArrowRight size={16} className="rotate-180" />
            Atrás
          </Button>
          <p className="text-sm text-ink-muted">
            Página <span className="font-semibold text-ink">{paginaActual}</span> de {totalPaginas}
          </p>
          <Button
            variant="secondary"
            size="sm"
            className="gap-1.5"
            onClick={() => setPage((p) => Math.min(totalPaginas, p + 1))}
            disabled={paginaActual >= totalPaginas}
          >
            Adelante
            <IconArrowRight size={16} />
          </Button>
        </div>
      )}

      {/* Lightbox Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 sm:p-6 transition-opacity animate-in fade-in duration-300">
          {/* Fondo para cerrar al hacer clic */}
          <div className="absolute inset-0" onClick={() => setSelectedPhoto(null)} />

          <div className="relative max-w-4xl w-full bg-surface rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300 z-10">
            {/* Cabecera */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-surface-sunken/30">
              <div>
                <span className="text-xs font-semibold text-brand tracking-wider uppercase">
                  {formatDate(selectedPhoto.createdAt)}
                </span>
                <h3 className="font-bold text-ink mt-0.5 leading-snug">{selectedPhoto.title || "Actividad"}</h3>
              </div>
              <button
                onClick={() => setSelectedPhoto(null)}
                className="p-1.5 rounded-full text-ink-muted hover:bg-surface-sunken hover:text-ink transition-colors cursor-pointer"
                aria-label="Cerrar"
              >
                <IconX size={20} />
              </button>
            </div>

            {/* Imagen */}
            <div className="flex-1 overflow-auto bg-black p-2 flex items-center justify-center min-h-[300px]">
              <img
                src={fileUrl(selectedPhoto.url) ?? ""}
                alt={selectedPhoto.title || "Foto de actividad"}
                className="max-h-[65vh] max-w-full object-contain"
              />
            </div>

            {/* Pie de modal */}
            <div className="flex items-center justify-end p-4 border-t border-border bg-surface-sunken/30">
              <button
                onClick={() => setSelectedPhoto(null)}
                className="inline-flex items-center gap-1.5 rounded-md bg-brand text-brand-contrast hover:bg-brand-strong px-5 py-2 text-xs font-semibold shadow-sm transition-colors cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
