import type { MetadataRoute } from "next";

// `output: export` has no server, so this metadata route must be emitted as a
// static file at build time rather than resolved per request.
export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pokédex — type matchups",
    short_name: "Pokédex",
    description:
      "Type matchups at a glance for Pokémon ROM hacks, sized for the AYN Thor bottom screen.",
    start_url: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#000000",
    theme_color: "#000000",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
