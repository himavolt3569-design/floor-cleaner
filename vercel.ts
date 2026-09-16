import type { VercelConfig } from "@vercel/config/v1";

/**
 * Vercel project configuration.
 *
 * Almost everything Next.js needs is detected automatically; this file only
 * carries the decisions that detection cannot make for us.
 *
 * Headers are deliberately NOT set here. Every response header this site sends
 * is built per request in src/proxy.ts, because the CSP carries a fresh nonce
 * that a static config cannot produce. Adding header rules here would silently
 * shadow that.
 */
export const config: VercelConfig = {
  framework: "nextjs",
  buildCommand: "pnpm build",
  installCommand: "pnpm install --frozen-lockfile",

  /**
   * The audience and the Firestore data are both in South Asia, so the
   * functions run in Mumbai rather than the default US East. If the Firestore
   * database turns out to live in another region, move this to match it —
   * every uncached page render makes several Firestore round trips, so the
   * function-to-database hop is what dominates TTFB here, not the user hop.
   */
  regions: ["bom1"],
};

export default config;
