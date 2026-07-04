/** Detección y normalización de enlaces de comprobantes/facturas almacenados en Google Drive. */

const GOOGLE_DRIVE_FOLDER = process.env.NEXT_PUBLIC_GOOGLE_DRIVE_FOLDER || "https://drive.google.com";

export type DriveDisplay = {
  /** El enlace apunta a Google Drive (incluye el placeholder legado "ver"/"/files/ver"). */
  isDrive: boolean;
  /** Placeholder legado sin enlace real: no hay nada que abrir salvo la carpeta general. */
  isPlaceholder: boolean;
  /** Se pudo extraer un ID de archivo embebible en /preview. */
  canEmbed: boolean;
  /** URL para el botón "Abrir en pestaña nueva". */
  targetUrl: string;
  /** URL a usar como src de iframe/img cuando canEmbed es true. */
  displayUrl: string | null;
};

export function getDriveDisplay(url: string | null | undefined): DriveDisplay {
  const lowerUrl = url?.toLowerCase() ?? "";
  const isPlaceholder = lowerUrl.endsWith("/files/ver") || lowerUrl === "ver";
  const isDrive = lowerUrl.includes("drive.google.com") || isPlaceholder;
  const targetUrl = isPlaceholder ? GOOGLE_DRIVE_FOLDER : (url ?? GOOGLE_DRIVE_FOLDER);

  if (!isDrive || isPlaceholder || !url) {
    return { isDrive, isPlaceholder, canEmbed: false, targetUrl, displayUrl: url ?? null };
  }

  const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/) || url.match(/[?&]id=([a-zA-Z0-9-_]+)/);
  if (!match) {
    return { isDrive, isPlaceholder, canEmbed: false, targetUrl, displayUrl: url };
  }

  const resourcekeyMatch = url.match(/[?&]resourcekey=([^&]+)/);
  const displayUrl = `https://drive.google.com/file/d/${match[1]}/preview${
    resourcekeyMatch ? `?resourcekey=${resourcekeyMatch[1]}` : ""
  }`;
  return { isDrive, isPlaceholder, canEmbed: true, targetUrl, displayUrl };
}
