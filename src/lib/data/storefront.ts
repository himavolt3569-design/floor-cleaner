import "server-only";

import { cache } from "react";
import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS, SETTINGS_DOC } from "@/lib/firebase/collections";
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
} from "@/config/defaults";
import type {
  Benefit,
  ComparisonEntry,
  DeliveryMethod,
  Faq,
  PaymentMethod,
  Product,
  ProductVariant,
  SiteSettings,
  StorefrontData,
  SurfaceEntry,
  UsageStep,
} from "@/types";
import { isValidMinor } from "@/lib/utils/money";

/**
 * Reads the storefront from Firestore, falling back to bundled defaults for
 * anything missing. A half-seeded project renders correctly rather than
 * throwing, and a project with no Firebase at all still renders.
 *
 * Wrapped in React `cache` so one render performs each read at most once.
 */
export const getStorefrontData = cache(async (): Promise<StorefrontData> => {
  const db = adminDb();

  const fallback: StorefrontData = {
    product: DEFAULT_PRODUCT,
    settings: DEFAULT_SETTINGS,
    benefits: DEFAULT_BENEFITS,
    surfaces: DEFAULT_SURFACES,
    steps: DEFAULT_STEPS,
    comparisons: DEFAULT_COMPARISONS,
    faqs: DEFAULT_FAQS,
    paymentMethods: DEFAULT_PAYMENT_METHODS.filter((m) => m.enabled),
    deliveryMethods: DEFAULT_DELIVERY_METHODS.filter((m) => m.enabled),
    live: false,
  };

  if (!db) return fallback;

  try {
    const [
      productsSnap,
      settingsSnap,
      benefitsSnap,
      surfacesSnap,
      stepsSnap,
      comparisonsSnap,
      faqsSnap,
      paymentsSnap,
      deliverySnap,
    ] = await Promise.all([
      db.collection(COLLECTIONS.products).where("active", "==", true).limit(5).get(),
      db.collection(COLLECTIONS.siteSettings).doc(SETTINGS_DOC).get(),
      db.collection(COLLECTIONS.benefits).get(),
      db.collection(COLLECTIONS.surfaces).get(),
      db.collection(COLLECTIONS.steps).get(),
      db.collection(COLLECTIONS.comparisons).get(),
      db.collection(COLLECTIONS.faqs).where("active", "==", true).get(),
      db.collection(COLLECTIONS.paymentMethods).where("enabled", "==", true).get(),
      db.collection(COLLECTIONS.deliveryMethods).where("enabled", "==", true).get(),
    ]);

    const product = await readProduct(db, productsSnap);

    return {
      product: product ?? fallback.product,
      settings: readSettings(settingsSnap.data()),
      benefits: listOr(benefitsSnap, DEFAULT_BENEFITS, readBenefit),
      surfaces: listOr(surfacesSnap, DEFAULT_SURFACES, readSurface),
      steps: listOr(stepsSnap, DEFAULT_STEPS, readStep),
      comparisons: listOr(comparisonsSnap, DEFAULT_COMPARISONS, readComparison),
      faqs: listOr(faqsSnap, DEFAULT_FAQS, readFaq),
      paymentMethods: paymentsSnap.docs.map((d) => readPayment(d.id, d.data())).sort((a, b) => a.sortOrder - b.sortOrder),
      deliveryMethods: deliverySnap.docs.map((d) => readDelivery(d.id, d.data())).sort((a, b) => a.sortOrder - b.sortOrder),
      live: true,
    };
  } catch (error) {
    console.error("[storefront] Firestore read failed, serving defaults:", error);
    return fallback;
  }
});

/* -------------------------------------------------------------- helpers */

type Snap = FirebaseFirestore.QuerySnapshot<FirebaseFirestore.DocumentData>;
type Doc = FirebaseFirestore.DocumentData | undefined;

function listOr<T extends { sortOrder: number }>(
  snap: Snap,
  fallback: T[],
  map: (id: string, data: FirebaseFirestore.DocumentData) => T | null,
): T[] {
  if (snap.empty) return fallback;
  const rows = snap.docs
    .map((d) => map(d.id, d.data()))
    .filter((r): r is T => r !== null)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  return rows.length ? rows : fallback;
}

const str = (v: unknown, fb: string) => (typeof v === "string" && v.trim() ? v : fb);
const optStr = (v: unknown) => (typeof v === "string" && v.trim() ? v : null);
const num = (v: unknown, fb: number) => (typeof v === "number" && Number.isFinite(v) ? v : fb);
const bool = (v: unknown, fb: boolean) => (typeof v === "boolean" ? v : fb);
const strArr = (v: unknown, fb: string[]) =>
  Array.isArray(v) && v.every((x) => typeof x === "string") ? (v as string[]) : fb;

async function readProduct(
  db: FirebaseFirestore.Firestore,
  snap: Snap,
): Promise<Product | null> {
  const doc = snap.docs.find((d) => d.data().featured) ?? snap.docs[0];
  if (!doc) return null;

  const data = doc.data();
  const variantsSnap = await db
    .collection(COLLECTIONS.products)
    .doc(doc.id)
    .collection(COLLECTIONS.variants)
    .get();

  const variants: ProductVariant[] = variantsSnap.docs
    .map((v): ProductVariant | null => {
      const d = v.data();
      if (!isValidMinor(d.priceMinor)) return null;
      return {
        id: v.id,
        label: str(d.label, v.id),
        volume: str(d.volume, ""),
        sku: str(d.sku, v.id),
        priceMinor: d.priceMinor as number,
        compareAtPriceMinor: isValidMinor(d.compareAtPriceMinor)
          ? (d.compareAtPriceMinor as number)
          : null,
        stock: Math.max(0, Math.floor(num(d.stock, 0))),
        active: bool(d.active, true),
        sortOrder: num(d.sortOrder, 0),
        isDefault: bool(d.isDefault, false),
      };
    })
    .filter((v): v is ProductVariant => v !== null)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  if (!variants.length) return null;

  return {
    id: doc.id,
    name: str(data.name, DEFAULT_PRODUCT.name),
    slug: str(data.slug, DEFAULT_PRODUCT.slug),
    shortDescription: str(data.shortDescription, DEFAULT_PRODUCT.shortDescription),
    description: str(data.description, DEFAULT_PRODUCT.description),
    active: bool(data.active, true),
    featured: bool(data.featured, true),
    category: str(data.category, DEFAULT_PRODUCT.category),
    surfaceTypes: strArr(data.surfaceTypes, DEFAULT_PRODUCT.surfaceTypes),
    images: strArr(data.images, DEFAULT_PRODUCT.images),
    variants,
  };
}

function readSettings(data: Doc): SiteSettings {
  if (!data) return DEFAULT_SETTINGS;
  const d = DEFAULT_SETTINGS;
  const hero = (data.hero ?? {}) as Record<string, unknown>;
  const intro = (data.intro ?? {}) as Record<string, unknown>;
  const why = (data.why ?? {}) as Record<string, unknown>;
  const contact = (data.contact ?? {}) as Record<string, unknown>;

  return {
    announcement: optStr(data.announcement) ?? d.announcement,
    copyOverrides: data.copyOverrides && typeof data.copyOverrides === "object" ? data.copyOverrides : {},
    announcementEnabled: bool(data.announcementEnabled, d.announcementEnabled),
    hero: {
      image: str(hero.image, "/imagery/tmg-campaign.png"),
      eyebrow: str(hero.eyebrow, d.hero.eyebrow),
      headline: strArr(hero.headline, d.hero.headline),
      body: str(hero.body, d.hero.body),
      primaryCta: str(hero.primaryCta, d.hero.primaryCta),
      secondaryCta: str(hero.secondaryCta, d.hero.secondaryCta),
      support: str(hero.support, d.hero.support),
    },
    intro: {
      image: str(intro.image, "/imagery/marble-interior.png"),
      eyebrow: str(intro.eyebrow, d.intro.eyebrow),
      headline: str(intro.headline, d.intro.headline),
      body: str(intro.body, d.intro.body),
    },
    why: {
      headline: str(why.headline, d.why.headline),
      body: strArr(why.body, d.why.body),
    },
    contact: {
      phone: str(contact.phone, d.contact.phone),
      whatsapp: str(contact.whatsapp, d.contact.whatsapp),
      email: str(contact.email, d.contact.email),
      address: str(contact.address, d.contact.address),
      mapUrl: optStr(contact.mapUrl),
    },
    social: Array.isArray(data.social)
      ? (data.social as unknown[])
          .map((s) => s as Record<string, unknown>)
          .filter((s) => typeof s.label === "string" && typeof s.url === "string")
          .map((s) => ({ label: s.label as string, url: s.url as string }))
      : d.social,
    usageNote: optStr(data.usageNote),
  };
}

const readBenefit = (id: string, d: FirebaseFirestore.DocumentData): Benefit => ({
  id,
  title: str(d.title, ""),
  body: str(d.body, ""),
  sortOrder: num(d.sortOrder, 0),
});

const readSurface = (id: string, d: FirebaseFirestore.DocumentData): SurfaceEntry => ({
  id,
  name: str(d.name, ""),
  body: str(d.body, ""),
  image: optStr(d.image),
  sortOrder: num(d.sortOrder, 0),
});

const readStep = (id: string, d: FirebaseFirestore.DocumentData): UsageStep => ({
  id,
  title: str(d.title, ""),
  body: str(d.body, ""),
  sortOrder: num(d.sortOrder, 0),
});

const readComparison = (
  id: string,
  d: FirebaseFirestore.DocumentData,
): ComparisonEntry | null => {
  const before = optStr(d.beforeImage);
  const after = optStr(d.afterImage);
  if (!before || !after) return null;
  return {
    id,
    label: str(d.label, id),
    caption: str(d.caption, ""),
    beforeImage: before,
    afterImage: after,
    sortOrder: num(d.sortOrder, 0),
  };
};

const readFaq = (id: string, d: FirebaseFirestore.DocumentData): Faq => ({
  id,
  question: str(d.question, ""),
  answer: str(d.answer, ""),
  sortOrder: num(d.sortOrder, 0),
  active: bool(d.active, true),
});

const readPayment = (
  id: string,
  d: FirebaseFirestore.DocumentData,
): PaymentMethod => ({
  id,
  kind: str(d.kind, "custom") as PaymentMethod["kind"],
  name: str(d.name, id),
  description: str(d.description, ""),
  enabled: bool(d.enabled, false),
  sortOrder: num(d.sortOrder, 0),
  requiresVerification: bool(d.requiresVerification, true),
  instructions: optStr(d.instructions) ?? undefined,
  accountTitle: optStr(d.accountTitle) ?? undefined,
  accountNumber: optStr(d.accountNumber) ?? undefined,
  qrImageUrl: optStr(d.qrImageUrl) ?? undefined,
  gatewayConfigured: bool(d.gatewayConfigured, false),
});

const readDelivery = (
  id: string,
  d: FirebaseFirestore.DocumentData,
): DeliveryMethod => ({
  id,
  kind: str(d.kind, "home") as DeliveryMethod["kind"],
  partnerId: optStr(d.partnerId),
  name: str(d.name, id),
  description: str(d.description, ""),
  feeMinor: isValidMinor(d.feeMinor) ? (d.feeMinor as number) : 0,
  estimate: str(d.estimate, ""),
  enabled: bool(d.enabled, false),
  sortOrder: num(d.sortOrder, 0),
  provinces: strArr(d.provinces, []),
  districts: strArr(d.districts, []),
  minimumOrderMinor: isValidMinor(d.minimumOrderMinor)
    ? (d.minimumOrderMinor as number)
    : null,
  freeDeliveryThresholdMinor: isValidMinor(d.freeDeliveryThresholdMinor)
    ? (d.freeDeliveryThresholdMinor as number)
    : null,
});
