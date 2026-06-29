import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

/** Error con código HTTP y mensaje humano (en español). */
export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

/** Envuelve handlers async para canalizar errores al middleware central. */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

/** Middleware final de errores: traduce a respuestas JSON claras. */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ZodError) {
    res.status(422).json({
      error: "Revisa los datos del formulario.",
      fields: err.flatten().fieldErrors,
    });
    return;
  }
  if (err instanceof ApiError) {
    res.status(err.status).json({ error: err.message, details: err.details });
    return;
  }
  console.error("[api] error no controlado:", err);
  res.status(500).json({ error: "Ocurrió un error inesperado. Intenta de nuevo." });
}
