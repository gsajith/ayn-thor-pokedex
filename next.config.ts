import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  // Static export has no server to run the image optimizer on.
  images: { unoptimized: true },
};

export default nextConfig;
