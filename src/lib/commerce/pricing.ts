import "server-only";

import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import {
  DEFAULT_DELIVERY_METHODS,
  DEFAULT_PAYMENT_METHODS,
  DEFAULT_PRODUCT,
} from "@/config/defaults";
import { isValidMinor } from "@/lib/utils/money";
import type {
  DeliveryMethod,
  OrderItem,
  OrderTotals,
  PaymentMethod,
} from "@/types";

/**
 * Authoritative pricing.
 *
 * The browser sends product ids, variant ids and quantities. Nothing else from
 * the client is trusted: unit prices, delivery fees, discounts and stock are
 * all read here, server side, and the totals are recomputed from scratch.
 */

export interface ResolvedItem extends OrderItem {
  stock: number;
}

export class CommerceError extends Error {
  constructor(
    message: string,
    readonly code:
      | "product_unavailable"
      | "out_of_stock"
      | "delivery_unavailable"
      | "payment_unavailable"
      | "minimum_not_met"
      | "firebase_unavailable",
    readonly status = 400,
  ) {
    super(message);
    this.name = "CommerceError";
  }
}

type RequestedItem = { productId: string; variantId: string; quantity: number };

/* --------------------------------------------------------------- catalog */

export async function resolveItems(
  requested: RequestedItem[],
): Promise<ResolvedItem[]> {
  const db = adminDb();
  const resolved: ResolvedItem[] = [];

  for (const line of requested) {
    const found = db
      ? await readVariantFromFirestore(db, line)
      : readVariantFromDefaults(line);

    if (!found) {
      throw new CommerceError(
        "One of the items in your cart is no longer available.",
        "product_unavailable",
      );
    }

    if (found.stock < line.quantity) {
      throw new CommerceError(
        found.stock <= 0
          ? `${found.name} (${found.variantLabel}) is out of stock.`
          : `Only ${found.stock} of ${found.name} (${found.variantLabel}) remain.`,
        "out_of_stock",
      );
    }

    resolved.push({
      ...found,
      quantity: line.quantity,
      lineTotalMinor: found.unitPriceMinor * line.quantity,
    });
  }

  return resolved;
}

async function readVariantFromFirestore(
  db: FirebaseFirestore.Firestore,
  line: RequestedItem,
): Promise<Omit<ResolvedItem, "quantity" | "lineTotalMinor"> | null> {
  const productRef = db.collection(COLLECTIONS.products).doc(line.productId);
  const [productSnap, variantSnap] = await Promise.all([
    productRef.get(),
    productRef.collection(COLLECTIONS.variants).doc(line.variantId).get(),
  ]);

  if (!productSnap.exists || !variantSnap.exists) return null;

  const product = productSnap.data() ?? {};
  const variant = variantSnap.data() ?? {};

  if (product.active === false || variant.active === false) return null;
  if (!isValidMinor(variant.priceMinor)) return null;

  return {
    productId: line.productId,
    variantId: line.variantId,
    name: String(product.name ?? "Product"),
    variantLabel: String(variant.label ?? line.variantId),
    sku: String(variant.sku ?? line.variantId),
    unitPriceMinor: variant.priceMinor as number,
    stock: Math.max(0, Math.floor(Number(variant.stock ?? 0))),
  };
}

function readVariantFromDefaults(
  line: RequestedItem,
): Omit<ResolvedItem, "quantity" | "lineTotalMinor"> | null {
  if (line.productId !== DEFAULT_PRODUCT.id) return null;
  const variant = DEFAULT_PRODUCT.variants.find(
    (v) => v.id === line.variantId && v.active,
  );
  if (!variant) return null;

  return {
    productId: DEFAULT_PRODUCT.id,
    variantId: variant.id,
    name: DEFAULT_PRODUCT.name,
    variantLabel: variant.label,
    sku: variant.sku,
    unitPriceMinor: variant.priceMinor,
    stock: variant.stock,
  };
}

/* -------------------------------------------------------------- delivery */

export async function loadDeliveryMethods(): Promise<DeliveryMethod[]> {
  const db = adminDb();
  if (!db) return DEFAULT_DELIVERY_METHODS.filter((m) => m.enabled);

  const snap = await db
    .collection(COLLECTIONS.deliveryMethods)
    .where("enabled", "==", true)
    .get();

  if (snap.empty) return DEFAULT_DELIVERY_METHODS.filter((m) => m.enabled);

  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<DeliveryMethod, "id">) }))
    .filter((m) => isValidMinor(m.feeMinor))
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

export async function loadPaymentMethods(): Promise<PaymentMethod[]> {
  const db = adminDb();
  if (!db) return DEFAULT_PAYMENT_METHODS.filter((m) => m.enabled);

  const snap = await db
    .collection(COLLECTIONS.paymentMethods)
    .where("enabled", "==", true)
    .get();

  if (snap.empty) return DEFAULT_PAYMENT_METHODS.filter((m) => m.enabled);

  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<PaymentMethod, "id">) }))
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

/**
 * A method applies when its province list is empty (everywhere) or contains the
 * customer's province, and likewise for districts. Minimum order values are
 * enforced here too, so an ineligible option never reaches the UI.
 */
export function eligibleDeliveryMethods(
  methods: DeliveryMethod[],
  subtotalMinor: number,
  province?: string,
  district?: string,
): DeliveryMethod[] {
  return methods.filter((method) => {
    if (!method.enabled) return false;

    if (province && method.provinces?.length && !method.provinces.includes(province)) {
      return false;
    }
    if (district && method.districts?.length && !method.districts.includes(district)) {
      return false;
    }
    if (
      isValidMinor(method.minimumOrderMinor ?? undefined) &&
      subtotalMinor < (method.minimumOrderMinor as number)
    ) {
      return false;
    }
    return true;
  });
}

export function deliveryFeeFor(
  method: DeliveryMethod,
  subtotalMinor: number,
): number {
  const threshold = method.freeDeliveryThresholdMinor;
  if (isValidMinor(threshold ?? undefined) && subtotalMinor >= (threshold as number)) {
    return 0;
  }
  return method.feeMinor;
}

/* ---------------------------------------------------------------- totals */

export function calculateTotals(
  items: ResolvedItem[],
  deliveryMethod: DeliveryMethod | null,
  discountMinor = 0,
): OrderTotals {
  const subtotalMinor = items.reduce((sum, i) => sum + i.lineTotalMinor, 0);
  const deliveryFeeMinor = deliveryMethod
    ? deliveryFeeFor(deliveryMethod, subtotalMinor)
    : 0;

  const safeDiscount = Math.min(Math.max(0, discountMinor), subtotalMinor);
  const grandTotalMinor = subtotalMinor + deliveryFeeMinor - safeDiscount;

  return {
    subtotalMinor,
    deliveryFeeMinor,
    discountMinor: safeDiscount,
    grandTotalMinor: Math.max(0, grandTotalMinor),
  };
}
