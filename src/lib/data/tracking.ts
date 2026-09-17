import "server-only";

import { requireDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import {
  customerTimeline,
  projectOrder,
  type TrackedEvent,
  type TrackedOrder,
} from "@/lib/commerce/tracking-view";
import { normalizeNepaliMobile } from "@/config/nepal";

/**
 * Customer-facing reads.
 *
 * Every path out of this module goes through `projectOrder`, so nothing that
 * belongs to staff can reach a storefront page. Nothing here trusts an
 * identifier it was handed: an order is returned only when the caller has
 * already proved the customer key or the mobile number on the order itself.
 */

const MAX_ORDERS = 25;

/**
 * How many of a customer's orders to read before sorting them here.
 *
 * Firestore would need a deployed composite index to combine the customerKey
 * filter with an orderBy, and a page that silently breaks until someone
 * remembers to run a deploy is a trap. An equality filter alone uses the
 * automatic single-field index, so this works on any project from the first
 * request. A customer has a handful of orders, never hundreds.
 */
const SCAN_LIMIT = 100;

function iso(value: unknown): string {
  if (value && typeof value === "object" && "toDate" in value) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return typeof value === "string" ? value : new Date(0).toISOString();
}

function rowToRaw(
  doc:
    | FirebaseFirestore.QueryDocumentSnapshot
    | FirebaseFirestore.DocumentSnapshot,
): Record<string, unknown> {
  const data = doc.data() ?? {};
  return { ...data, id: doc.id, createdAt: iso(data.createdAt) };
}

export async function listOrdersForCustomer(
  customerKey: string,
): Promise<TrackedOrder[]> {
  const snap = await requireDb()
    .collection(COLLECTIONS.orders)
    .where("customerKey", "==", customerKey)
    .limit(SCAN_LIMIT)
    .get();

  return snap.docs
    .map((doc) => projectOrder(rowToRaw(doc)))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, MAX_ORDERS);
}

export async function findOrderForCustomer(
  orderNumber: string,
  customerKey: string,
): Promise<TrackedOrder | null> {
  const snap = await requireDb()
    .collection(COLLECTIONS.orders)
    .where("orderNumber", "==", orderNumber)
    .limit(1)
    .get();

  const doc = snap.docs[0];
  if (!doc) return null;
  if (doc.data()?.customerKey !== customerKey) return null;

  return projectOrder(rowToRaw(doc));
}

/**
 * The lost-cookie path. The mobile number is the shared secret, so it is
 * compared in its normalised form and a mismatch is reported to the caller
 * exactly as a missing order is.
 */
export async function findOrderByNumberAndMobile(
  orderNumber: string,
  mobile: string,
): Promise<TrackedOrder | null> {
  const wanted = normalizeNepaliMobile(mobile);
  if (!wanted) return null;

  const snap = await requireDb()
    .collection(COLLECTIONS.orders)
    .where("orderNumber", "==", orderNumber)
    .limit(1)
    .get();

  const doc = snap.docs[0];
  if (!doc) return null;

  const address = (doc.data()?.deliveryAddress ?? {}) as { mobile?: unknown };
  const stored = normalizeNepaliMobile(String(address.mobile ?? ""));
  if (!stored || stored !== wanted) return null;

  return projectOrder(rowToRaw(doc));
}

export async function timelineForOrder(orderId: string): Promise<TrackedEvent[]> {
  const snap = await requireDb()
    .collection(COLLECTIONS.orderEvents)
    .where("orderId", "==", orderId)
    .orderBy("createdAt", "desc")
    .limit(50)
    .get();

  return customerTimeline(
    snap.docs.map((doc) => {
      const data = doc.data();
      return {
        type: String(data.type ?? ""),
        status: typeof data.status === "string" ? data.status : undefined,
        createdAt: iso(data.createdAt),
      };
    }),
  );
}

/** Ownership facts only, for the cancel route. Never sent to a client. */
export async function orderOwnership(orderNumber: string): Promise<{
  id: string;
  customerKey: string | null;
  mobile: string | null;
} | null> {
  const snap = await requireDb()
    .collection(COLLECTIONS.orders)
    .where("orderNumber", "==", orderNumber)
    .limit(1)
    .get();

  const doc = snap.docs[0];
  if (!doc) return null;

  const data = doc.data() ?? {};
  const address = (data.deliveryAddress ?? {}) as { mobile?: unknown };

  return {
    id: doc.id,
    customerKey: typeof data.customerKey === "string" ? data.customerKey : null,
    mobile: normalizeNepaliMobile(String(address.mobile ?? "")),
  };
}
