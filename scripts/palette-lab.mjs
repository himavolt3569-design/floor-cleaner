/**
 * Palette lab.
 *
 * Every colour in the design system is a CSS custom property, so a whole
 * palette can be swapped at runtime without touching source or rebuilding.
 * This loads the storefront once per candidate, injects the tokens, and
 * captures the same three regions so the options can be compared honestly.
 *
 *   node scripts/palette-lab.mjs
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = "http://localhost:3000";

/** Regions worth judging: a light composition, a dark one, and a coloured one. */
const SHOTS = [
  { name: "hero", scrollTo: 0, height: 900 },
  { name: "results", selector: "#results" },
  { name: "cta", selector: "#faq", back: 900 },
];

export const PALETTES = {
  current: null, // whatever is in the stylesheet

  clay: {
    label: "A. Clay and Forest",
    ivory: "#f7f1e4", paper: "#fffcf6",
    stone: "#ebdcc2", "stone-deep": "#d8c4a2",
    charcoal: "#1e1a15", espresso: "#4a3526",
    muted: "#6b5e4f", faint: "#938573",
    forest: "#1f5140", "forest-deep": "#163b2e",
    terracotta: "#c05a3c", "terracotta-deep": "#8f4029",
    brass: "#b8863f", "brass-ink": "#7a5a25", "brass-light": "#dcb877",
    sage: "#a8b49c",
  },

  ochre: {
    label: "B. Ink and Ochre",
    ivory: "#f4f1e8", paper: "#fdfbf4",
    stone: "#e5dcc8", "stone-deep": "#cfc2a6",
    charcoal: "#14120e", espresso: "#2c2519",
    muted: "#635b4b", faint: "#8c8471",
    forest: "#2f5233", "forest-deep": "#223d26",
    terracotta: "#b0522e", "terracotta-deep": "#853c20",
    brass: "#c28a26", "brass-ink": "#77560f", "brass-light": "#e3be6a",
    sage: "#a9ae8e",
  },

  rust: {
    label: "C. Olive and Rust",
    ivory: "#f5f2e6", paper: "#fefcf4",
    stone: "#e0ddc6", "stone-deep": "#c6c2a3",
    charcoal: "#1b1d15", espresso: "#3a3b26",
    muted: "#61624c", faint: "#8a8b72",
    forest: "#9e4a2b", "forest-deep": "#7e3921",
    terracotta: "#c97a45", "terracotta-deep": "#8a4526",
    brass: "#8a8734", "brass-ink": "#5a5820", "brass-light": "#cfcb8a",
    sage: "#9aa07a",
  },
};

function toCss(palette) {
  if (!palette) return "";
  return Object.entries(palette)
    .filter(([k]) => k !== "label")
    .map(([k, v]) => `--color-${k}:${v};`)
    .join("");
}

mkdirSync(".tmp/palette", { recursive: true });

const browser = await chromium.launch();

for (const [key, palette] of Object.entries(PALETTES)) {
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    reducedMotion: "reduce",
  });
  const page = await ctx.newPage();

  if (palette) {
    // addInitScript runs before the app's own styles resolve, and the inline
    // style element outranks the stylesheet without !important.
    await page.addInitScript((css) => {
      document.addEventListener("DOMContentLoaded", () => {
        const el = document.createElement("style");
        el.textContent = `:root{${css}}`;
        document.head.appendChild(el);
      });
    }, toCss(palette));
  }

  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.waitForSelector("#results", { timeout: 90_000 });
  await page.waitForLoadState("load").catch(() => {});
  await page.waitForTimeout(1200);

  for (const shot of SHOTS) {
    if (shot.selector) {
      await page.locator(shot.selector).first().scrollIntoViewIfNeeded();
      if (shot.back) await page.evaluate((b) => window.scrollBy(0, -b), shot.back);
    } else {
      await page.evaluate((y) => window.scrollTo(0, y), shot.scrollTo ?? 0);
    }
    await page.waitForTimeout(500);
    await page.screenshot({ path: `.tmp/palette/${key}-${shot.name}.png` });
  }

  console.log(`captured ${key}${palette ? ` (${palette.label})` : " (as committed)"}`);
  await ctx.close();
}

await browser.close();
