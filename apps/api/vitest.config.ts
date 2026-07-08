import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
    setupFiles: ["./test/setup.ts"],
    hookTimeout: 30000,
    testTimeout: 15000,
    // Test files share one real Postgres DB via TRUNCATE-based resetDb() (see test/helpers.ts).
    // Running files in parallel causes cross-file data races — keep this false.
    fileParallelism: false,
  },
});
