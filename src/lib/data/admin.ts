import "server-only";

import { requireDb } from "@/lib/firebase/admin";
import { COLLECTIONS, SETTINGS_DOC } from "@/lib/firebase/collections";
import type {
  ComparisonEntry,
  DeliveryMethod,
  Faq,
  Order,
  PaymentMethod,
  Product,
  ProductVariant,
} from "@/types";

/** Admin-side reads. These bypass security rules, so only call them behind requireSuperAdmin. */

function toIso(value: unknown): string {
  if (value && typeof value === "object" && "toDate" in value) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return new Date(0).toISOString();
}

export async function listOrders(options?: {
  orderStatus?: string;
  paymentStatus?: string;
  limit?: number;
}): Promise<Order[]> {
  const db = requireDb();
  let query = db
    .collection(COLLECTIONS.orders)
    .orderBy("createdAt", "desc")
    .limit(options?.limit ?? 100);

  if (options?.orderStatus) {
    query = query.where("orderStatus", "==", options.orderStatus);
  }
  if (options?.paymentStatus) {
    query = query.where("paymentStatus", "==", options.paymentStatus);
  }

  const snap = await query.get();
  return snap.docs.map((doc) => {
    const d = doc.data();
    return {
      id: doc.id,
      orderNumber: d.orderNumber ?? doc.id,
      customerId: d.customerId ?? null,
      items: d.items ?? [],
      subtotalMinor: d.subtotalMinor ?? 0,
      deliveryFeeMinor: d.deliveryFeeMinor ?? 0,
      discountMinor: d.discountMinor ?? 0,
      grandTotalMinor: d.grandTotalMinor ?? 0,
      currency: "NPR",
      paymentMethodId: d.paymentMethodId ?? "",
      paymentMethodName: d.paymentMethodName ?? "",
      paymentKind: d.paymentKind ?? "custom",
      paymentStatus: d.paymentStatus ?? "unpaid",
      paymentReference: d.paymentReference ?? null,
      paymentProofUrl: d.paymentProofPath ?? d.paymentProofUrl ?? null,
      deliveryMethodId: d.deliveryMethodId ?? "",
      deliveryMethodName: d.deliveryMethodName ?? "",
      deliveryEstimate: d.deliveryEstimate ?? "",
      deliveryAddress: d.deliveryAddress ?? {},
      orderStatus: d.orderStatus ?? "pending",
      customerNotes: d.customerNotes ?? null,
      createdAt: toIso(d.createdAt),
      updatedAt: toIso(d.updatedAt),
    } as Order;
  });
}

export async function orderCounts(): Promise<Record<string, number>> {
  const db = requireDb();
  const snap = await db.collection(COLLECTIONS.orders).select("orderStatus", "paymentStatus").get();

  const counts: Record<string, number> = { total: snap.size };
  snap.docs.forEach((doc) => {
    const d = doc.data();
    const os = String(d.orderStatus ?? "pending");
    const ps = String(d.paymentStatus ?? "unpaid");
    counts[`order:${os}`] = (counts[`order:${os}`] ?? 0) + 1;
    counts[`payment:${ps}`] = (counts[`payment:${ps}`] ?? 0) + 1;
  });
  return counts;
}

export async function listProducts(): Promise<Product[]> {
  const db = requireDb();
  const snap = await db.collection(COLLECTIONS.products).get();

  return Promise.all(
    snap.docs.map(async (doc) => {
      const d = doc.data();
      const variantsSnap = await doc.ref.collection(COLLECTIONS.variants).get();
      const variants: ProductVariant[] = variantsSnap.docs
        .map((v) => {
          const vd = v.data();
          return {
            id: v.id,
            label: vd.label ?? v.id,
            volume: vd.volume ?? "",
            sku: vd.sku ?? v.id,
            priceMinor: Number(vd.priceMinor ?? 0),
            compareAtPriceMinor: vd.compareAtPriceMinor ?? null,
            stock: Number(vd.stock ?? 0),
            active: vd.active !== false,
            sortOrder: Number(vd.sortOrder ?? 0),
            isDefault: vd.isDefault === true,
          };
        })
        .sort((a, b) => a.sortOrder - b.sortOrder);

      return {
        id: doc.id,
        name: d.name ?? doc.id,
        slug: d.slug ?? doc.id,
        shortDescription: d.shortDescription ?? "",
        description: d.description ?? "",
        active: d.active !== false,
        featured: d.featured === true,
        category: d.category ?? "",
        surfaceTypes: d.surfaceTypes ?? [],
        images: d.images ?? [],
        variants,
      } satisfies Product;
    }),
  );
}

export async function listPaymentMethods(): Promise<PaymentMethod[]> {
  const db = requireDb();
  const snap = await db.collection(COLLECTIONS.paymentMethods).get();
  return snap.docs
    .map((d) => {
      const data = d.data();
      return {
        id: d.id,
        kind: (data.kind ?? "custom") as PaymentMethod["kind"],
        name: String(data.name ?? d.id),
        description: String(data.description ?? ""),
        enabled: Boolean(data.enabled),
        sortOrder: Number(data.sortOrder ?? 0),
        requiresVerification: data.requiresVerification !== false,
        instructions: typeof data.instructions === "string" ? data.instructions : undefined,
        accountTitle: typeof data.accountTitle === "string" ? data.accountTitle : undefined,
        accountNumber: typeof data.accountNumber === "string" ? data.accountNumber : undefined,
        qrImageUrl: typeof data.qrImageUrl === "string" ? data.qrImageUrl : undefined,
        gatewayConfigured: Boolean(data.gatewayConfigured),
      };
    })
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

export async function listDeliveryMethods(): Promise<DeliveryMethod[]> {
  const db = requireDb();
  const snap = await db.collection(COLLECTIONS.deliveryMethods).get();
  return snap.docs
    .map((d) => {
      const data = d.data();
      return {
        id: d.id,
        kind: (data.kind ?? "home") as DeliveryMethod["kind"],
        name: String(data.name ?? d.id),
        description: String(data.description ?? ""),
        feeMinor: Number(data.feeMinor ?? 0),
        estimate: String(data.estimate ?? ""),
        enabled: Boolean(data.enabled),
        sortOrder: Number(data.sortOrder ?? 0),
        provinces: Array.isArray(data.provinces) ? (data.provinces as string[]) : [],
        districts: Array.isArray(data.districts) ? (data.districts as string[]) : [],
        minimumOrderMinor:
          typeof data.minimumOrderMinor === "number" ? data.minimumOrderMinor : null,
        freeDeliveryThresholdMinor:
          typeof data.freeDeliveryThresholdMinor === "number"
            ? data.freeDeliveryThresholdMinor
            : null,
      };
    })
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

export async function listFaqs(): Promise<Faq[]> {
  const db = requireDb();
  const snap = await db.collection(COLLECTIONS.faqs).get();
  return snap.docs
    .map((d) => {
      const data = d.data();
      return {
        id: d.id,
        question: String(data.question ?? ""),
        answer: String(data.answer ?? ""),
        sortOrder: Number(data.sortOrder ?? 0),
        active: data.active !== false,
      };
    })
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

export async function listComparisons(): Promise<ComparisonEntry[]> {
  const db = requireDb();
  const snap = await db.collection(COLLECTIONS.comparisons).get();
  if (snap.empty) {
    const { DEFAULT_COMPARISONS } = await import("@/config/defaults");
    return DEFAULT_COMPARISONS;
  }
  return snap.docs
    .map((d) => {
      const data = d.data();
      return {
        id: d.id,
        label: String(data.label ?? d.id),
        caption: String(data.caption ?? ""),
        beforeImage: String(data.beforeImage ?? ""),
        afterImage: String(data.afterImage ?? ""),
        sortOrder: Number(data.sortOrder ?? 0),
      };
    })
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function listContent(
  kind: "benefits" | "steps" | "surfaces",
): Promise<{ id: string; heading: string; body: string; sortOrder: number; image: string | null }[]> {
  const db = requireDb();
  const map = {
    benefits: COLLECTIONS.benefits,
    steps: COLLECTIONS.steps,
    surfaces: COLLECTIONS.surfaces,
  } as const;

  const snap = await db.collection(map[kind]).get();
  return snap.docs
    .map((d) => {
      const data = d.data();
      return {
        id: d.id,
        // Benefits and steps store `title`; surfaces store `name`.
        heading: String(data.title ?? data.name ?? d.id),
        body: String(data.body ?? ""),
        sortOrder: Number(data.sortOrder ?? 0),
        image: typeof data.image === "string" ? data.image : null,
      };
    })
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function readSettingsDoc(): Promise<Record<string, unknown> | null> {
  const db = requireDb();
  const snap = await db.collection(COLLECTIONS.siteSettings).doc(SETTINGS_DOC).get();
  if (!snap.exists) return null;
  const data = snap.data();
  if (!data) return null;
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v && typeof v === "object" && "toDate" in v) {
      clean[k] = (v as { toDate: () => Date }).toDate().toISOString();
    } else {
      clean[k] = v;
    }
  }
  return clean;
}

/** Signed URL so an admin can view a payment screenshot without making it public. */
export async function signedProofUrl(path: string): Promise<string | null> {
  try {
    const { adminBucket } = await import("@/lib/firebase/admin");
    const bucket = adminBucket();
    if (!bucket) return null;
    const [url] = await bucket.file(path).getSignedUrl({
      action: "read",
      expires: Date.now() + 15 * 60 * 1000,
    });
    return url;
  } catch {
    return null;
  }
}
