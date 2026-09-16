/**
 * Design review harness.
 *
 * Usage:
 *   node scripts/shot.mjs                      full page at 1440
 *   node scripts/shot.mjs --w 390              full page at 390
 *   node scripts/shot.mjs --clip 0,0,1440,900  viewport slice
 *   node scripts/shot.mjs --sel "#results"     a single section
 *   node scripts/shot.mjs --path /admin/login --out admin
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};

const width = Number(flag("w", 1440));
const height = Number(flag("h", 900));
const sel = flag("sel", null);
const path = flag("path", "/");
const out = flag("out", "page");
const full = !args.includes("--viewport");
const base = flag("base", "http://localhost:3000");

mkdirSync(".tmp/shots", { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width, height },
  deviceScaleFactor: 2,
  // Full-page captures run with reduced motion so Lenis does not fight
  // Playwright's scrolling. Pass --motion to review the animated page.
  reducedMotion: args.includes("--motion") ? "no-preference" : "reduce",
});
const page = await ctx.newPage();

const errors = [];
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text().slice(0, 300));
});
page.on("pageerror", (e) => errors.push(`pageerror: ${String(e).slice(0, 300)}`));

await page.goto(`${base}${path}`, { waitUntil: "domcontentloaded", timeout: 90_000 });

// A cold dev server serves loading.tsx first; wait for the real page.
if (path === "/") {
  await page.waitForSelector("#results", { timeout: 90_000 }).catch(() => {});
}
await page.waitForLoadState("load").catch(() => {});

// Let entrance animations settle and lazy images decode.
await page.evaluate(async () => {
  window.scrollTo(0, document.body.scrollHeight);
  await new Promise((r) => setTimeout(r, 900));
  window.scrollTo(0, 0);
  await new Promise((r) => setTimeout(r, 400));
});
await page.waitForTimeout(1400);
// Wait for in-flight images, but never indefinitely: an image that neither
// loads nor errors would otherwise hang the whole capture.
try {
  await page.evaluate(
    () =>
      Promise.race([
        Promise.all(
          Array.from(document.images)
            .filter((i) => !i.complete)
            .map((i) => new Promise((res) => { i.onload = i.onerror = res; })),
        ),
        new Promise((res) => setTimeout(res, 4000)),
      ]),
  );
} catch {}

const file = `.tmp/shots/${out}-${width}.png`;
if (sel) {
  const el = await page.locator(sel).first();
  await el.scrollIntoViewIfNeeded();
  await page.waitForTimeout(700);
  await el.screenshot({ path: file });
} else {
  await page.screenshot({ path: file, fullPage: full });
}

console.log(`saved ${file}`);
if (errors.length) {
  console.log(`\nconsole errors (${errors.length}):`);
  for (const e of [...new Set(errors)].slice(0, 12)) console.log(" -", e);
} else {
  console.log("no console errors");
}

await browser.close();
