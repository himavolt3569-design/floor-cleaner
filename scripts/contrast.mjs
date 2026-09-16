/**
 * WCAG AA contrast audit against the real rendered page.
 *
 * Colours are resolved through a canvas so Tailwind's oklab/color-mix output
 * and alpha are composited exactly as the browser paints them.
 */
import { chromium } from "playwright";

const BASE = process.argv.includes("--base")
  ? process.argv[process.argv.indexOf("--base") + 1]
  : "http://localhost:3000";
const path = process.argv.includes("--path")
  ? process.argv[process.argv.indexOf("--path") + 1]
  : "/";

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
await p.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
await p.waitForTimeout(1200);

const results = await p.evaluate(() => {
  const cv = document.createElement("canvas");
  cv.width = cv.height = 1;
  const ctx = cv.getContext("2d", { willReadFrequently: true });

  /** Any CSS colour string -> [r,g,b,a] as the browser actually paints it. */
  const toRgba = (css) => {
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = "#000";
    ctx.fillStyle = css;
    ctx.fillRect(0, 0, 1, 1);
    const d = ctx.getImageData(0, 0, 1, 1).data;
    return [d[0], d[1], d[2], d[3] / 255];
  };

  const over = (fg, bg) => [0, 1, 2].map((i) => Math.round(fg[i] * fg[3] + bg[i] * (1 - fg[3])));
  const srgb = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const lum = ([r, g, bl]) => 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(bl);
  const ratio = (a, c) => { const [l1, l2] = [lum(a), lum(c)].sort((x, y) => y - x); return (l1 + 0.05) / (l2 + 0.05); };

  /** Walk up compositing every translucent layer onto the page ground. */
  function groundOf(el) {
    const stack = [];
    let node = el;
    while (node && node !== document.documentElement) {
      const rgba = toRgba(getComputedStyle(node).backgroundColor);
      if (rgba[3] > 0) stack.push(rgba);
      if (rgba[3] >= 0.999) break;
      node = node.parentElement;
    }
    let bg = [245, 241, 232];
    for (let i = stack.length - 1; i >= 0; i--) bg = over(stack[i], bg);
    return bg;
  }

  const out = [];
  const seen = new Set();

  document.querySelectorAll("p,h1,h2,h3,h4,a,span,li,button,label,dt,dd,figcaption,legend").forEach((el) => {
    const text = (el.textContent || "").trim();
    if (!text || el.children.length > 0) return;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none" || Number(cs.opacity) < 0.1) return;
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) return;

    const bg = groundOf(el);
    const fg = over(toRgba(cs.color), bg);
    const size = parseFloat(cs.fontSize);
    const weight = Number(cs.fontWeight) || 400;
    const large = size >= 24 || (size >= 18.66 && weight >= 700);
    const need = large ? 3 : 4.5;
    const cr = ratio(fg, bg);

    const key = `${cs.color}|${bg.join(",")}|${Math.round(size)}|${weight}`;
    if (seen.has(key)) return;
    seen.add(key);

    out.push({
      pass: cr >= need,
      ratio: +cr.toFixed(2), need, size: Math.round(size), weight,
      fg: `rgb(${fg.join(",")})`, bg: `rgb(${bg.join(",")})`,
      sample: text.slice(0, 40),
    });
  });
  return out;
});

const fails = results.filter((r) => !r.pass);
console.log(`${results.length - fails.length}/${results.length} distinct text styles meet WCAG AA`);
if (fails.length) {
  console.log("\nBelow AA:");
  for (const f of fails) {
    console.log(` ${String(f.ratio).padStart(5)} (need ${f.need})  ${f.size}px/${f.weight}  ${f.fg} on ${f.bg}  "${f.sample}"`);
  }
}
await b.close();
process.exit(fails.length ? 1 : 0);
