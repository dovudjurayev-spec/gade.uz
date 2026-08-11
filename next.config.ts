import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  images: {
    formats: ["image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "gade.uz" },
      { protocol: "https", hostname: "dev.gade.uz" },
    ],
  },
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
