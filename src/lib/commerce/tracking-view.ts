import { CUSTOMER_REQUEST_FROM, CUSTOMER_SELF_CANCEL } from "./order-status";
import type { CancellationState, OrderStatus } from "@/types";

/**
 * Everything, and only everything, a customer may see about their own order.
 *
 * This is an allowlist by construction: every field is copied in by name and
 * the source document is never spread. A field added to `orders` tomorrow
 * cannot leak through here by accident, which is the point.
 *
 * Audit event text is never replayed. Staff write those notes for each other,
 * and a courier's "nobody answered, address looks fake" is not customer copy.
 * The timeline is built from event types and statuses alone.
 */

export interface TrackedItem {
  name: string;
  variantLabel: string;
  quantity: number;
  lineTotalMinor: number;
}

export interface TrackedOrder {
  id: string;
  orderNumber: string;
  orderStatus: OrderStatus;
  statusLabel: string;
  paymentStatus: string;
  paymentMethodName: string;
  deliveryMethodName: string;
  deliveryEstimate: string;
  subtotalMinor: number;
  deliveryFeeMinor: number;
  discountMinor: number;
  grandTotalMinor: number;
  createdAt: string;
  deliveryAttempts: number;
  cancellationState: CancellationState;
  items: TrackedItem[];
  deliveryAddress: {
    fullName: string;
    district: string;
    province: string;
    municipality: string;
    area: string;
  };
}

export interface TrackedEvent {
  at: string;
  label: string;
}

export const CUSTOMER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Order received",
  confirmed: "Order confirmed",
  processing: "Being prepared",
  packed: "Packed",
  out_for_delivery: "Out for delivery",
  delivery_failed: "Delivery attempt failed",
  delivered: "Delivered",
  cancellation_requested: "Cancellation requested",
  cancelled: "Cancelled",
  returned: "Returned",
};

const text = (value: unknown): string => (typeof value === "string" ? value : "");
const count = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

export function projectOrder(raw: Record<string, unknown>): TrackedOrder {
  const status = (text(raw.orderStatus) || "pending") as OrderStatus;
  const address = (raw.deliveryAddress ?? {}) as Record<string, unknown>;
  const cancellation = (raw.cancellation ?? null) as { state?: string } | null;
  const items = Array.isArray(raw.items) ? raw.items : [];

  return {
    id: text(raw.id),
    orderNumber: text(raw.orderNumber),
    orderStatus: status,
    statusLabel: CUSTOMER_STATUS_LABEL[status] ?? "Order received",
    paymentStatus: text(raw.paymentStatus) || "unpaid",
    paymentMethodName: text(raw.paymentMethodName),
    deliveryMethodName: text(raw.deliveryMethodName),
    deliveryEstimate: text(raw.deliveryEstimate),
    subtotalMinor: count(raw.subtotalMinor),
    deliveryFeeMinor: count(raw.deliveryFeeMinor),
    discountMinor: count(raw.discountMinor),
    grandTotalMinor: count(raw.grandTotalMinor),
    createdAt: text(raw.createdAt),
    deliveryAttempts: count(raw.deliveryAttempts),
    cancellationState: (cancellation?.state ?? "none") as CancellationState,
    items: items.map((entry) => {
      const item = (entry ?? {}) as Record<string, unknown>;
      return {
        name: text(item.name),
        variantLabel: text(item.variantLabel),
        quantity: count(item.quantity),
        lineTotalMinor: count(item.lineTotalMinor),
      };
    }),
    deliveryAddress: {
      fullName: text(address.fullName),
      district: text(address.district),
      province: text(address.province),
      municipality: text(address.municipality),
      area: text(address.area),
    },
  };
}

/** Event types a customer may see, and the words they see instead of the note. */
const EVENT_LABELS: Record<string, string> = {
  order_created: "Order placed",
  payment_status_changed: "Payment updated",
  delivery_failed: "Delivery attempt failed",
  cancellation_requested: "Cancellation requested",
  cancellation_refused: "Cancellation not possible",
  order_cancelled: "Cancelled",
  order_returned: "Returned to us",
};

export function customerTimeline(
  events: { type: string; status?: string; createdAt: string }[],
): TrackedEvent[] {
  const out: TrackedEvent[] = [];

  for (const event of events) {
    if (event.type === "status_changed") {
      // Older events predate the recorded status and cannot be labelled
      // safely, so they are dropped rather than guessed at.
      const label = CUSTOMER_STATUS_LABEL[event.status as OrderStatus];
      if (label) out.push({ at: event.createdAt, label });
      continue;
    }

    const label = EVENT_LABELS[event.type];
    if (label) out.push({ at: event.createdAt, label });
  }

  return out;
}

export function cancelAbility(status: OrderStatus): "cancel" | "request" | "none" {
  if (CUSTOMER_SELF_CANCEL.includes(status)) return "cancel";
  if (CUSTOMER_REQUEST_FROM.includes(status)) return "request";
  return "none";
}
