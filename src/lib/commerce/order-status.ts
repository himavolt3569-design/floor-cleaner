import type { OrderStatus } from "@/types";

/**
 * The order lifecycle, as one table.
 *
 * Admin actions, the customer's own cancel button and a courier failure all
 * consult this, so there is exactly one answer to "can this order move there",
 * and no path that quietly invents its own rules.
 *
 * Pure by design: no Firestore, no session, just the shape of the lifecycle.
 */

export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "packed",
  "out_for_delivery",
  "delivery_failed",
  "delivered",
  "cancellation_requested",
  "cancelled",
  "returned",
] as const satisfies readonly OrderStatus[];

export type TransitionActor = "admin" | "customer" | "system";

const ALLOWED: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "processing", "cancelled"],
  confirmed: ["processing", "packed", "cancelled"],
  processing: ["packed", "cancelled"],
  packed: ["out_for_delivery", "cancelled"],
  out_for_delivery: ["delivered", "delivery_failed", "cancellation_requested"],
  delivery_failed: [
    "out_for_delivery",
    "returned",
    "cancellation_requested",
    "cancelled",
  ],
  // Refusing a request puts the parcel back on the road; the courier may also
  // have delivered it while the request was being considered.
  cancellation_requested: ["cancelled", "out_for_delivery", "delivered"],
  delivered: [],
  cancelled: [],
  returned: [],
};

/** Entering one of these returns the reserved stock to the shelf. */
export const RESTOCK_ON: OrderStatus[] = ["cancelled", "returned"];

/** A customer may cancel outright only while we still hold the parcel. */
export const CUSTOMER_SELF_CANCEL: OrderStatus[] = [
  "pending",
  "confirmed",
  "processing",
  "packed",
];

/** Once a courier holds it, the customer may only ask. */
export const CUSTOMER_REQUEST_FROM: OrderStatus[] = [
  "out_for_delivery",
  "delivery_failed",
];

export function isTerminal(status: OrderStatus): boolean {
  return ALLOWED[status].length === 0;
}

export function canTransition(
  from: OrderStatus,
  to: OrderStatus,
  actor: TransitionActor,
): boolean {
  if (!ALLOWED[from]?.includes(to)) return false;

  if (actor === "admin") return true;

  if (actor === "customer") {
    if (to === "cancelled") return CUSTOMER_SELF_CANCEL.includes(from);
    if (to === "cancellation_requested") return CUSTOMER_REQUEST_FROM.includes(from);
    return false;
  }

  // "system" has no automatic status moves yet. Auto-assignment in phase 5
  // attributes a courier; it does not advance the lifecycle.
  return false;
}
