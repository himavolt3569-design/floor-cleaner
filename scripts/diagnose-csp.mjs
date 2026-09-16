/**
 * Point this at a URL that is reporting CSP violations:
 *
 *   node scripts/diagnose-csp.mjs https://example.com/
 *
 * The site sends a fresh nonce in the Content-Security-Policy header on every
 * request and stamps that same nonce onto every script tag it renders. A
 * violation means those two have drifted apart, and this says which way.
 *
 * It only reads what the server sends, so it cannot see scripts a browser
 * extension injects after the fact. If everything here passes and the console
 * still complains, the injection is happening in the browser, not the server.
 */

import { createHash } from "node:crypto";

const url = process.argv[2];
if (!url) {
  console.error("usage: node scripts/diagnose-csp.mjs <url>");
  process.exit(2);
}

const res = await fetch(url, { redirect: "follow" });
const html = await res.text();

const csp = res.headers.get("content-security-policy");
const cspReportOnly = res.headers.get("content-security-policy-report-only");

console.log(`GET ${res.url}`);
console.log(`  status         ${res.status}`);
console.log(`  cache-control  ${res.headers.get("cache-control") ?? "(none)"}`);

if (!csp) {
  console.log("\nNo Content-Security-Policy response header.");
  if (cspReportOnly) console.log("There is a report-only policy, which cannot block anything.");
  console.log(
    "The browser is enforcing a policy this response did not send, so something\n" +
      "between the app and the browser is adding it: a CDN, a hosting proxy, or an\n" +
      "extension. Find that layer; the app is not the source.",
  );
  process.exit(1);
}

// A second header of the same name arrives joined by ", ". Both policies are
// then enforced, and a script can only satisfy both if it carries both nonces.
const policies = csp.split(/,\s*(?=[a-z-]+\s)/i);
if (policies.length > 1) {
  console.log(`\n${policies.length} policies are being enforced at once:`);
  policies.forEach((p, i) => console.log(`  [${i + 1}] ${p.slice(0, 120)}`));
  console.log(
    "\nThe browser enforces every one of them. A script nonced for one policy is\n" +
      "blocked by the others, which is enough on its own to explain the errors.",
  );
}

const headerNonces = [...csp.matchAll(/'nonce-([^']+)'/g)].map((m) => m[1]);
console.log(`  header nonce   ${headerNonces.join(", ") || "(none)"}`);

const tags = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)]
  .filter(([, attrs]) => !/\stype=["']application\/(ld\+json|json)["']/.test(attrs));

const htmlNonces = new Set();
let unnonced = 0;
for (const [, attrs] of tags) {
  const n = /\bnonce=["']([^"']*)["']/.exec(attrs)?.[1];
  if (n) htmlNonces.add(n);
  else unnonced++;
}

console.log(`  script tags    ${tags.length} (${unnonced} without a nonce)`);
console.log(`  html nonce     ${[...htmlNonces].join(", ") || "(none)"}`);

const matched = [...htmlNonces].filter((n) => headerNonces.includes(n));
const orphaned = [...htmlNonces].filter((n) => !headerNonces.includes(n));

console.log("");

if (orphaned.length) {
  console.log("MISMATCH. The HTML carries a nonce the header does not list:");
  orphaned.forEach((n) => console.log(`  ${n}`));
  console.log(
    "\nThe document and the header were produced by different requests. Something\n" +
      "is caching the HTML while letting the header regenerate — a CDN, a proxy,\n" +
      "or the browser itself. Whatever caches this document has to be told not to.",
  );
} else if (!htmlNonces.size && headerNonces.length) {
  console.log(
    "The header carries a nonce but no script tag does, so the app never saw the\n" +
      "policy. The proxy is setting it on the response but the render is not\n" +
      "receiving it on the request.",
  );
} else if (matched.length) {
  console.log("Nonces match. Every script this response sent is allowed by the policy.");
  if (unnonced) {
    console.log(
      `\n${unnonced} script tag(s) arrived without a nonce. Under 'strict-dynamic' those\n` +
        "are allowed only when a trusted script inserted them, which is normal for\n" +
        "SDK loaders and not normal for anything present in the initial HTML.",
    );
  }
  console.log(
    "\nSo the blocked scripts are not in this response. They are being added to the\n" +
      "page afterwards — a hosting toolbar, an analytics injector, or a browser\n" +
      "extension. Compare the blocked URLs against the list above.",
  );
}

// Hashes let a violation report be matched back to the exact script it names.
const inline = tags.filter(([, , body]) => body.trim());
if (inline.length) {
  console.log("\nInline script hashes, to match against a violation report:");
  for (const [, attrs, body] of inline) {
    const h = createHash("sha256").update(body, "utf8").digest("base64");
    const nonced = /\bnonce=/.test(attrs) ? "nonce" : "BARE ";
    console.log(`  ${nonced} sha256-${h}  ${body.trim().slice(0, 56).replace(/\s+/g, " ")}`);
  }
}
