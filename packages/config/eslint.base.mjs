import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";
import globals from "globals";

/**
 * Configuración base de ESLint (flat config) compartida por todo el monorepo.
 * Cada paquete la importa y, si hace falta, añade sus propias reglas encima.
 */
export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/.next/**",
      "**/.turbo/**",
      "**/node_modules/**",
      "**/generated/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.node,
      },
    },
    rules: {
      // Variables no usadas: permitido si empiezan con "_"
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // Permitimos `any` con aviso (a veces hace falta en límites del sistema)
      "@typescript-eslint/no-explicit-any": "warn",
      "no-console": "off",
      // TypeScript ya verifica símbolos no definidos (evita falsos positivos con globals del navegador).
      "no-undef": "off",
    },
  },
  prettier,
);
