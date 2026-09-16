import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  images: {
    // Admin-uploaded media (product shots, payment QR codes) lives in
    // Firebase Storage. Nothing else is allowed to be optimised.
    remotePatterns: [
      { protocol: "https", hostname: "firebasestorage.googleapis.com" },
      { protocol: "https", hostname: "storage.googleapis.com" },
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
    formats: ["image/avif", "image/webp"],
    qualities: [70, 75, 80, 82, 90],
  },

  // Do not ship server-only Firebase Admin internals into any client bundle.
  serverExternalPackages: ["firebase-admin"],

  experimental: {
    optimizePackageImports: ["gsap", "lenis"],
  },

  async headers() {
    return [
      {
        source: "/:path*.(png|webp|jpg|jpeg|svg|ico|woff2)",
        headers: [
          { key: "cache-control", value: "public, max-age=2592000, stale-while-revalidate=86400" },
          { key: "x-content-type-options", value: "nosniff" },
        ],
      },
    ];
  },
};

export default nextConfig;
