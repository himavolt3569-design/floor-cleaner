/**
 * Captures a page as a series of viewport-sized strips. Much faster than one
 * enormous fullPage PNG on long pages, and closer to how the page is actually
 * seen.
 *
 *   node scripts/strips.mjs --w 390 --h 844 --n 10 --out m
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const args = process.argv.slice(2);
const flag = (n, d) => { const i = args.indexOf(`--${n}`); return i === -1 ? d : args[i + 1]; };
const width = Number(flag("w", 390));
const height = Number(flag("h", 844));
const count = Number(flag("n", 10));
const out = flag("out", "strip");
const path = flag("path", "/");
const dsf = Number(flag("dsf", 1));

mkdirSync(".tmp/shots", { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width, height },
  deviceScaleFactor: dsf,
  reducedMotion: "reduce",
  isMobile: width < 768,
  hasTouch: width < 768,
});
const page = await ctx.newPage();
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 200)); });
page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));

await page.goto(`http://localhost:3000${path}`, { waitUntil: "domcontentloaded", timeout: 90000 });

// The route is dynamic and a cold dev server serves loading.tsx first, so wait
// for real content rather than a timer before measuring the document.
if (path === "/") {
  await page.waitForSelector("#results", { timeout: 90000 });
}
await page.waitForLoadState("load").catch(() => {});
await page.waitForTimeout(1500);

const total = await page.evaluate(() => document.documentElement.scrollHeight);
const step = Math.max(1, Math.floor((total - height) / Math.max(1, count - 1)));
console.log(`doc height ${total}px, ${count} strips every ${step}px`);

for (let i = 0; i < count; i++) {
  const y = Math.min(i * step, Math.max(0, total - height));
  await page.evaluate((v) => window.scrollTo(0, v), y);
  await page.waitForTimeout(450);
  await page.screenshot({ path: `.tmp/shots/${out}-${String(i).padStart(2, "0")}.png` });
}

console.log(errors.length ? `console errors:\n - ${[...new Set(errors)].join("\n - ")}` : "no console errors");
await browser.close();
