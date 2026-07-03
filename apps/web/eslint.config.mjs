import base from "@nehemias/config/eslint";
import reactHooks from "eslint-plugin-react-hooks";

export default [
  ...base,
  {
    plugins: { "react-hooks": reactHooks },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
  { ignores: ["next-env.d.ts", ".next/**", "next.config.mjs"] },
];
