import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { CacheFirst, ExpirationPlugin, Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  // Includes the app shell document, injected in next.config with a per-build
  // revision. Precaching the shell rather than relying on a runtime copy is
  // what makes offline launch deterministic: a runtime copy expires on a TTL
  // and is never refreshed on redeploy, so it eventually serves a document
  // pointing at chunk hashes that activation has already deleted.
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  // Navigation preload is an online latency optimisation. When the network is
  // unreachable the preload promise rejects and takes the navigation with it.
  navigationPreload: false,
  runtimeCaching: [
    {
      // Sprites are immutable — keyed by dex number, regenerated only wholesale
      // — so cache-first with no revalidation is correct. Deliberately not
      // precached: 1025 entries would make install a thousand-request atomic
      // operation.
      matcher: ({ url, sameOrigin }) =>
        sameOrigin && url.pathname.startsWith("/sprites/"),
      handler: new CacheFirst({
        cacheName: "pokedex-sprites",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 1100,
            maxAgeSeconds: 60 * 60 * 24 * 365,
            purgeOnQuotaError: true,
          }),
        ],
      }),
    },
    ...defaultCache,
  ],
  // Any navigation that cannot be satisfied falls back to the precached shell.
  // The app is a single client-rendered page, so the shell is always correct.
  fallbacks: {
    entries: [
      {
        url: "/",
        matcher: ({ request }) => request.mode === "navigate",
      },
    ],
  },
});

serwist.addEventListeners();
