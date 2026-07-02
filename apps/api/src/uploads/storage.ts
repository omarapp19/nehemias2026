import path from "node:path";
import fs from "node:fs/promises";
import { env } from "../env.js";

/** Categorías válidas de archivo subido. */
export const UPLOAD_CATEGORIES = ["proofs", "invoices", "deliveries"] as const;
export type UploadCategory = (typeof UPLOAD_CATEGORIES)[number];

/** proofs (comprobantes de donación) son privados; el resto son públicos. */
const PUBLIC_CATEGORIES: readonly string[] = ["invoices", "deliveries"];

export function isPublicCategory(category: string): boolean {
  return PUBLIC_CATEGORIES.includes(category);
}

function isValidCategory(category: string): category is UploadCategory {
  return (UPLOAD_CATEGORIES as readonly string[]).includes(category);
}

/** Resuelve la ruta absoluta de un archivo guardado, validando categoría y nombre. */
export function resolveStoredPath(category: string, filename: string): string | null {
  if (!isValidCategory(category)) return null;
  // Evita path traversal: solo el nombre de archivo, sin separadores.
  if (!filename || filename.includes("/") || filename.includes("\\") || filename.includes("..")) {
    return null;
  }
  return path.join(env.uploadsDir, category, filename);
}

export async function fileExists(absPath: string): Promise<boolean> {
  try {
    await fs.access(absPath);
    return true;
  } catch {
    return false;
  }
}

export async function ensureCategoryDir(category: UploadCategory): Promise<string> {
  const dir = path.join(env.uploadsDir, category);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}
