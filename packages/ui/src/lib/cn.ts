import clsx, { type ClassValue } from "clsx";

/** Une clases condicionalmente (envoltorio fino sobre clsx). */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
