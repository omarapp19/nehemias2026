import path from "node:path";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import sharp from "sharp";
import { env } from "../env.js";
import { ensureCategoryDir, type UploadCategory } from "./storage.js";

const MAX_DIMENSION = 1920;

/** Procesa (si es imagen, la re-comprime a webp) y guarda el archivo subido. Devuelve la URL pública. */
export async function processAndStore(
  category: UploadCategory,
  file: Express.Multer.File,
): Promise<string> {
  const dir = await ensureCategoryDir(category);
  const id = crypto.randomUUID();

  if (file.mimetype === "application/pdf") {
    const filename = `${id}.pdf`;
    await fs.writeFile(path.join(dir, filename), file.buffer);
    return buildUrl(category, filename);
  }

  const filename = `${id}.webp`;
  const optimized = await sharp(file.buffer)
    .rotate()
    .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();
  await fs.writeFile(path.join(dir, filename), optimized);
  return buildUrl(category, filename);
}

function buildUrl(category: UploadCategory, filename: string): string {
  const base = env.publicBaseUrl.replace(/\/$/, "");
  return `${base}/files/${category}/${filename}`;
}
