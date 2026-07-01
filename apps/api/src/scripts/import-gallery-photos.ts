import path from "node:path";
import fs from "node:fs";
import { prisma } from "@nehemias/db";
import { config } from "dotenv";
import sharp from "sharp";
import crypto from "node:crypto";

config({ path: path.resolve(process.cwd(), "../../.env") });
config();

async function main() {
  const sourceDir = path.resolve(process.cwd(), "../web/public/fotos");
  const destDir = path.resolve(process.cwd(), "uploads/gallery");

  console.log(`📂 Origen: ${sourceDir}`);
  console.log(`📂 Destino: ${destDir}`);

  if (!fs.existsSync(sourceDir)) {
    console.error(`❌ Carpeta origen no encontrada: ${sourceDir}`);
    process.exit(1);
  }

  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  // 1. Limpiar fotos previas en la BD
  console.log("🧹 Limpiando registros anteriores de galería...");
  await prisma.galleryPhoto.deleteMany({});

  // Leer todos los archivos
  const files = fs.readdirSync(sourceDir);
  console.log(`📂 Encontrados ${files.length} archivos en la carpeta de origen.`);

  let processedCount = 0;

  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    // Procesar solo imágenes
    if (ext !== ".png" && ext !== ".jpg" && ext !== ".jpeg") {
      console.log(`⏭️ Omitiendo archivo no-imagen: ${file}`);
      continue;
    }

    const filePath = path.join(sourceDir, file);
    const uniqueId = crypto.randomUUID();
    const destFileName = `${uniqueId}.webp`;
    const destFilePath = path.join(destDir, destFileName);

    // Obtener un título limpio a partir del nombre de archivo
    const title = file
      .replace(/\.[^/.]+$/, "") // Quitar extensión
      .replace(/^#/, "")        // Quitar '#' inicial
      .replace(/\s+/g, " ")     // Normalizar espacios
      .trim();

    try {
      console.log(`⏳ Procesando y comprimiendo: ${file}...`);
      
      // Comprimir la imagen lo más posible:
      // - Límite de 1600px en el lado más largo
      // - Convertir a webp con calidad 60 (alta compresión, excelente peso)
      // - Quitar metadatos
      const fileBuffer = fs.readFileSync(filePath);
      const compressedBuffer = await sharp(fileBuffer)
        .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 60, effort: 6 })
        .toBuffer();

      fs.writeFileSync(destFilePath, compressedBuffer);

      // Guardar en la base de datos
      await prisma.galleryPhoto.create({
        data: {
          id: uniqueId,
          url: `gallery/${destFileName}`,
          title: title || null,
        },
      });

      const origSize = fs.statSync(filePath).size;
      const compSize = compressedBuffer.length;
      const ratio = ((origSize - compSize) / origSize * 100).toFixed(1);
      
      console.log(`✅ Guardada en BD: ${title} (${(origSize / 1024 / 1024).toFixed(2)}MB -> ${(compSize / 1024).toFixed(1)}KB, -${ratio}%)`);
      processedCount++;
    } catch (e) {
      console.error(`❌ Error procesando ${file}:`, e);
    }
  }

  console.log(`\n🏁 Proceso finalizado. Total imágenes importadas y comprimidas: ${processedCount}`);
}

main()
  .catch((e) => {
    console.error("❌ Error en import-gallery-photos:", e);
    process.exit(1);
  });
