import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  images: {
    // Admin-uploaded media (product shots, payment QR codes) is served from
    // this origin: the upload route stores the bytes in Firestore and hands
    // back a relative /api/media/<id>, so it needs no entry here at all. These
    // two hosts cover media that predates that route and still sits in
    // Firebase Storage.
    //
    // Do not widen this to a "**" hostname. The optimiser will fetch and cache
    // anything the pattern admits, so a wildcard turns the deployment into an
    // open image proxy that bills the transform to this project.
    remotePatterns: [
      { protocol: "https", hostname: "firebasestorage.googleapis.com" },
      { protocol: "https", hostname: "storage.googleapis.com" },
    ],
    formats: ["image/avif", "image/webp"],
    qualities: [70, 75, 80, 82, 90],
  },

  // firebase-admin is deliberately NOT listed in serverExternalPackages. Left
  // external, it is require()d at runtime, and its jwks-rsa dependency does a
  // CommonJS require of jose 6, which is ESM only. That throws ERR_REQUIRE_ESM
  // inside a serverless function and takes down every route that imports it.
  // Bundling it lets the compiler resolve that import properly.
  //
  // It cannot leak into a client bundle regardless: src/lib/firebase/admin.ts
  // is marked "server-only".

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
