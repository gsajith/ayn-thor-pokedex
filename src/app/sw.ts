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
  // The app shell and species data only. Sprites are excluded in next.config
  // and handled below: precaching 1025 of them would mean 1025 install-time
  // requests, and a single failure aborts the entire precache.
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  // Deliberately off. Navigation preload is an online latency optimisation,
  // and when the network is unreachable the preload promise rejects, which
  // takes the navigation down with it. This app must open offline first.
  navigationPreload: false,
  runtimeCaching: [
    {
      // Sprites are immutable — keyed by dex number and only ever regenerated
      // wholesale — so cache-first with no revalidation is correct.
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
});

serwist.addEventListeners();
