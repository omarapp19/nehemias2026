import base from "@nehemias/config/eslint";

export default [...base, { ignores: ["next-env.d.ts", ".next/**", "next.config.mjs"] }];
