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

  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <SectionHeader
        eyebrow="Nuestro Impacto"
        title="Galería de trabajo en el terreno"
        description="Registro fotográfico de las jornadas de distribución de insumos, entrega de donaciones y soporte directo a las familias."
      />
      <div className="mt-8">
        <GalleryView photos={photos} />
      </div>
    </div>
  );
}
