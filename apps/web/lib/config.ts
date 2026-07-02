/** URLs del API. */

// La usa el navegador (imágenes, formularios del admin).
export const PUBLIC_API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

// La usa el servidor de Next (RSC). En Docker apunta a http://api:4000.
export const INTERNAL_API_BASE =
  process.env.API_INTERNAL_URL ?? PUBLIC_API_BASE;

/** URL pública de un archivo. Acepta rutas relativas ("deliveries/x.webp") o URLs absolutas. */
export function fileUrl(relativePath: string | null | undefined): string | null {
  if (!relativePath) return null;
  if (/^https?:\/\//.test(relativePath)) {
    const filesIndex = relativePath.indexOf("/files/");
    if (filesIndex !== -1) {
      const pathAfterFiles = relativePath.substring(filesIndex + 7);
      return `${PUBLIC_API_BASE}/files/${pathAfterFiles}`;
    }
    return relativePath;
  }
  return `${PUBLIC_API_BASE}/files/${relativePath}`;
}
