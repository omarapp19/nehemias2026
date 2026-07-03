import { SectionHeader, IconAlert } from "@nehemias/ui";
import { getGaleria } from "@/lib/api";
import { GalleryView } from "@/components/gallery-view";

export const dynamic = "force-dynamic";

export default async function GaleriaPage() {
  let photos: { id: string; url: string; title: string | null; createdAt: string }[] = [];
  try {
    const data = await getGaleria();
    photos = data.fotos;
  } catch (e) {
    console.error("Error loading gallery photos:", e);
  }

  const googleDriveFolder = process.env.NEXT_PUBLIC_GOOGLE_DRIVE_FOLDER || "https://drive.google.com";

  return (
    <div className="mx-auto max-w-6xl px-5 py-12 space-y-8">
      <SectionHeader
        eyebrow="Nuestro Impacto"
        title="Galería de trabajo en el terreno"
        description="Registro fotográfico de las jornadas de distribución de insumos, entrega de donaciones y soporte directo a las familias."
      />

      {/* Banner explicativo de Google Drive y previsualización */}
      <div className="rounded-xl border border-brand/20 bg-brand-soft/10 p-5 sm:p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex gap-3 items-start">
          <div className="p-2 rounded-lg bg-brand/10 text-brand mt-0.5 md:mt-0 flex-shrink-0">
            <IconAlert size={20} />
          </div>
          <div>
            <h4 className="font-serif font-bold text-ink text-base">¿Problemas para ver las fotos o comprobantes?</h4>
            <p className="text-sm text-ink-muted mt-1 max-w-3xl leading-relaxed">
              Debido a las estrictas políticas de privacidad y seguridad de Google Drive (como el bloqueo de hotlinking y cabeceras de seguridad del navegador), algunas imágenes, comprobantes o facturas pueden no previsualizarse directamente aquí. Para ver todos los archivos originales organizados sin restricciones, visita nuestro Drive público.
            </p>
          </div>
        </div>
        <a
          href={googleDriveFolder}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full md:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-brand text-brand-contrast hover:bg-brand-strong px-5 py-2.5 text-sm font-semibold shadow-md transition-all whitespace-nowrap cursor-pointer hover:scale-[1.01]"
        >
          Ver todo en Google Drive
        </a>
      </div>

      <div className="mt-8">
        <GalleryView photos={photos} />
      </div>
    </div>
  );
}

