import argon2 from "argon2";

/** Hash de contraseña con argon2id (recomendado para almacenamiento). */
export function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, { type: argon2.argon2id });
}

/** Verifica una contraseña contra su hash. */
export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plain);
  } catch {
    return false;
  }
}
