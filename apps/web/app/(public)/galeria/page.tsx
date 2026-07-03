import { SectionHeader } from "@nehemias/ui";
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
        action={
          <a
            href={googleDriveFolder}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand text-brand-contrast hover:bg-brand-strong px-5 py-2.5 text-sm font-semibold shadow-sm transition-all whitespace-nowrap cursor-pointer hover:scale-[1.01]"
          >
            Ver todo en Google Drive
          </a>
        }
      />

      <div className="mt-8">
        <GalleryView photos={photos} />
      </div>
    </div>
  );
}

