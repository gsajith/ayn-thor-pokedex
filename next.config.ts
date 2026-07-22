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
  // Nothing under public/ is auto-precached. The only public assets the app
  // needs offline are listed explicitly below, and an empty glob makes it
  // impossible for a future public/ file to sweep the 1025 sprites into the
  // precache, which would turn install into a thousand-request operation that
  // fails atomically. Sprites are cached at runtime instead.
  globPublicPatterns: [],
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
