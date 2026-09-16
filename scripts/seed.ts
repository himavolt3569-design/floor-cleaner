/**
 * Seeds Firestore from the bundled defaults in src/config/defaults.ts.
 *
 *   pnpm seed          create anything missing, leave existing documents alone
 *   pnpm seed --force  overwrite existing documents too
 *
 * Safe to run more than once. Prices and stock you have edited in the admin are
 * never clobbered unless you pass --force.
 */
import { cert, initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

import {
  DEFAULT_BENEFITS,
  DEFAULT_COMPARISONS,
  DEFAULT_DELIVERY_METHODS,
  DEFAULT_FAQS,
  DEFAULT_PAYMENT_METHODS,
  DEFAULT_PRODUCT,
  DEFAULT_SETTINGS,
  DEFAULT_STEPS,
  DEFAULT_SURFACES,
} from "../src/config/defaults.ts";

const force = process.argv.includes("--force");

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const rawKey = process.env.FIREBASE_PRIVATE_KEY;

if (!projectId || !clientEmail || !rawKey) {
  console.error(
    "Missing Firebase credentials.\n" +
      "Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY\n" +
      "in .env.local, then run: pnpm seed",
  );
  process.exit(1);
}

const privateKey = rawKey.includes("\\n") ? rawKey.replace(/\\n/g, "\n") : rawKey;

if (!getApps().length) {
  initializeApp({ credential: cert({ projectId, clientEmail, privateKey }), projectId });
}

const db = getFirestore();
let created = 0;
let skipped = 0;
let updated = 0;

async function put(path: string[], data: object): Promise<void> {
  let ref = db.collection(path[0]).doc(path[1]);
  for (let i = 2; i < path.length; i += 2) {
    ref = ref.collection(path[i]).doc(path[i + 1]);
  }

  const snap = await ref.get();
  if (snap.exists && !force) {
    skipped += 1;
    return;
  }

  await ref.set({ ...data, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  if (snap.exists) updated += 1;
  else created += 1;
}

async function main() {
  console.log(`Seeding project ${projectId}${force ? " (force)" : ""}...\n`);

  // Product and variants
  const { variants, ...product } = DEFAULT_PRODUCT;
  await put(["products", product.id], {
    ...product,
    createdAt: FieldValue.serverTimestamp(),
  });
  for (const variant of variants) {
    await put(["products", product.id, "variants", variant.id], variant);
  }

  // Settings
  await put(["siteSettings", "site"], DEFAULT_SETTINGS);

  // Content collections
  for (const b of DEFAULT_BENEFITS) await put(["benefits", b.id], b);
  for (const s of DEFAULT_SURFACES) await put(["surfaces", s.id], s);
  for (const s of DEFAULT_STEPS) await put(["steps", s.id], s);
  for (const c of DEFAULT_COMPARISONS) await put(["comparisons", c.id], c);
  for (const f of DEFAULT_FAQS) await put(["faqs", f.id], f);

  // Commerce configuration
  for (const m of DEFAULT_PAYMENT_METHODS) await put(["paymentMethods", m.id], m);
  for (const m of DEFAULT_DELIVERY_METHODS) await put(["deliveryMethods", m.id], m);

  // Order number sequence. Never reset once orders exist.
  const counter = await db.collection("counters").doc("orders").get();
  if (!counter.exists) {
    await db.collection("counters").doc("orders").set({ value: 0 });
    created += 1;
  } else {
    skipped += 1;
  }

  console.log(
    `Done. ${created} created, ${updated} updated, ${skipped} left alone.\n` +
      (skipped && !force
        ? "Run with --force to overwrite the documents that already existed.\n"
        : ""),
  );
}

main().catch((error) => {
  console.error("Seeding failed:", error);
  process.exit(1);
});
