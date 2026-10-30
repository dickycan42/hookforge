import { defineConfig } from "vitest/config";

// Node-only tests (src/**/*.test.ts) — no JSX, so no React plugin needed.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
