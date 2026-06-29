import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/server.ts"],
  format: ["esm"],
  target: "node20",
  platform: "node",
  outDir: "dist",
  clean: true,
  sourcemap: true,
  // Inlinamos los paquetes del monorepo (son TS), pero dejamos fuera las
  // dependencias nativas/generadas (deben existir en node_modules en runtime).
  noExternal: [/@nehemias\//],
  external: ["@prisma/client", ".prisma/client", "sharp", "argon2"],
});
