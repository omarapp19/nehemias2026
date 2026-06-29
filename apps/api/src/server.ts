import { createApp } from "./app.js";
import { env } from "./env.js";
import { ensureInitialAdmin } from "./bootstrap.js";

const app = createApp();

// Crea el admin inicial si hace falta (no bloquea el arranque del servidor).
void ensureInitialAdmin();

const server = app.listen(env.port, () => {
  console.log(`[api] Nehemías escuchando en http://localhost:${env.port} (${env.nodeEnv})`);
});

// Cierre ordenado
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    console.log(`[api] ${signal} recibido, cerrando...`);
    server.close(() => process.exit(0));
  });
}
