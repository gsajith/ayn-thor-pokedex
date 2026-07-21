import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Next.js reads the "@/*" alias from tsconfig paths; Vitest needs it here too.
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    // Build scripts are plain .mjs and stay there: pngjs is a devDependency, so
    // moving the extraction under src/ would put production code on a dev-only
    // package. Widening the glob is the cheaper way to make them testable.
    include: ["src/**/*.test.ts", "scripts/**/*.test.mjs"],
  },
});
