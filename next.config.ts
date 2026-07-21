import withSerwistInit from "@serwist/next";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  // Static export has no server to run the image optimizer on.
  images: { unoptimized: true },
};

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  // The webpack manifest covers JS and CSS but not the emitted HTML, so
  // without this an offline navigation has no document to serve and the app
  // fails to open at all.
  cacheOnNavigation: true,
  // Sprites are cached at runtime instead. Precaching all 1025 would make
  // install a thousand-request operation that fails atomically.
  // `globPublicPatterns` is the knob for files under public/.
  // "*" matches only top-level files in public/, so the 1025 sprites under
  // public/sprites/ are never precached. They are cached at runtime instead:
  // precaching them would make install a thousand-request atomic operation.
  globPublicPatterns: ["*"],
});

export default withSerwist(nextConfig);
