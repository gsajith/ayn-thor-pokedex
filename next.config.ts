import withSerwistInit from "@serwist/next";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  // Static export has no server to run the image optimizer on.
  images: { unoptimized: true },
};

/**
 * Changes every build so the precached app shell is replaced rather than
 * served stale. The shell embeds hashed chunk URLs, and activation deletes
 * superseded precache entries, so a shell that never refreshes eventually
 * points at chunks that no longer exist.
 */
const buildRevision = Date.now().toString(36);

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  // "*" matches only direct children of public/, so the 1025 sprites under
  // public/sprites/ are never precached — they are cached at runtime instead.
  // This also sweeps in Serwist's generated swe-worker-*.js, one redundant
  // entry with a stable hash; narrower patterns ("*.png", exact filenames) match
  // nothing here, and node-glob ignores "!" negation inside a pattern array.
  globPublicPatterns: ["*"],
  // The static export emits the shell as HTML and the icons live in public/,
  // neither of which the webpack manifest covers. Listed explicitly rather
  // than via globPublicPatterns, which does not reliably match them.
  additionalPrecacheEntries: [
    { url: "/", revision: buildRevision },
    { url: "/icon-192.png", revision: buildRevision },
    { url: "/icon-512.png", revision: buildRevision },
    { url: "/manifest.webmanifest", revision: buildRevision },
  ],
});

export default withSerwist(nextConfig);
