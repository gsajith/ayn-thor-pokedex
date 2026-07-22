import { defineConfig, devices } from "@playwright/test";

/**
 * Layout regression tier.
 *
 * These tests exist because the properties they check cannot be expressed in
 * the Vitest suite: jsdom has no layout engine, so `getBoundingClientRect`
 * returns zeros and every assertion about what fits on screen would pass
 * vacuously.
 *
 * They run against the built static export rather than the dev server. The
 * bugs being guarded against are pixel-level, and dev-mode styling is not the
 * artefact that ships.
 */
const PORT = 4173;

export default defineConfig({
  testDir: "./e2e",
  // The sweep drives hundreds of states inside one page context, so it is
  // slower than a typical test but not hanging.
  timeout: 120_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? "list" : "line",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      /*
       * The AYN Thor's measured viewport. Not a stock device preset — the
       * whole point of these tests is this specific panel, and a generic
       * "Desktop Chrome" size would pass while the real device clipped.
       */
      use: { ...devices["Desktop Chrome"], viewport: { width: 537, height: 412 } },
    },
  ],
  webServer: {
    command: `node scripts/serve-out.mjs out ${PORT}`,
    port: PORT,
    reuseExistingServer: !process.env.CI,
    // The suite asserts against built output, so a stale `out/` would be
    // testing the previous commit. CI builds before invoking Playwright.
    stdout: "ignore",
  },
});
