import { RESTOCK_ON, canTransition, type TransitionActor } from "./order-status";
import type {
  DeliveryFailureReason,
  OrderCancellation,
  OrderStatus,
  PaymentStatus,
} from "@/types";

/**
 * Decides what a status change means, without touching the database.
 *
 * Keeping this pure is what makes the rules that matter testable: stock comes
 * back exactly once, money that a partner has already reconciled blocks a
 * cancellation, a failed delivery must say why, and a paid order that is
 * cancelled lands in "refunded" for a human to settle.
 *
 * A null on paymentStatus, deliveryAttempts, failure or cancellation means
 * "leave that field as it is".
 */

export class OrderTransitionError extends Error {
  constructor(
    message: string,
    readonly code: "illegal" | "unchanged" | "reconciled" | "missing_reason",
  ) {
    super(message);
    this.name = "OrderTransitionError";
  }
}

export interface TransitionOrder {
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  stockRestoredAt: string | null;
  deliveryAttempts: number;
  items: { productId: string; variantId: string; quantity: number }[];
  /** True when a partner ledger entry already references this order. */
  hasPartnerLedger: boolean;
}

export interface TransitionRequest {
  to: OrderStatus;
  actor: TransitionActor;
  /** Email or "customer": recorded on the audit event, never shown publicly. */
  actorLabel: string;
  reason?: string;
  failureReason?: DeliveryFailureReason;
}

export interface TransitionPlan {
  status: OrderStatus;
  restockItems: { productId: string; variantId: string; quantity: number }[];
  markStockRestored: boolean;
  paymentStatus: PaymentStatus | null;
  deliveryAttempts: number | null;
  failure: { reason: DeliveryFailureReason; note: string } | null;
  cancellation: Partial<OrderCancellation> | null;
  event: { type: string; message: string };
}

export function planTransition(
  order: TransitionOrder,
  request: TransitionRequest,
): TransitionPlan {
  const { to, actor, reason } = request;
  const from = order.orderStatus;

  if (from === to) {
    throw new OrderTransitionError(
      "That order is already in this state.",
      "unchanged",
    );
  }

  if (!canTransition(from, to, actor)) {
    throw new OrderTransitionError(
      "That order cannot move to this state.",
      "illegal",
    );
  }

  if (to === "delivery_failed" && !request.failureReason) {
    throw new OrderTransitionError(
      "Choose a reason for the failed delivery.",
      "missing_reason",
    );
  }

  const restores = RESTOCK_ON.includes(to);

  // Money a partner has already accounted for cannot be unwound by flipping a
  // status. The ledger entry has to be reversed first, deliberately.
  if (restores && order.hasPartnerLedger) {
    throw new OrderTransitionError(
      "This order has partner money recorded against it. Reverse those entries first.",
      "reconciled",
    );
  }

  const restockItems =
    restores && !order.stockRestoredAt ? order.items.map((i) => ({ ...i })) : [];

  return {
    status: to,
    restockItems,
    markStockRestored: restockItems.length > 0,
    paymentStatus: restores && order.paymentStatus === "paid" ? "refunded" : null,
    deliveryAttempts:
      to === "delivery_failed" ? order.deliveryAttempts + 1 : null,
    failure:
      to === "delivery_failed" && request.failureReason
        ? { reason: request.failureReason, note: reason ?? "" }
        : null,
    cancellation: cancellationFor(from, to, actor, reason ?? null),
    event: eventFor(from, to, reason ?? null, request.failureReason ?? null),
  };
}

function cancellationFor(
  from: OrderStatus,
  to: OrderStatus,
  actor: TransitionActor,
  reason: string | null,
): Partial<OrderCancellation> | null {
  if (to === "cancellation_requested") {
    return {
      state: "requested",
      requestedBy: actor === "customer" ? "customer" : "admin",
      reason,
    };
  }
  if (from === "cancellation_requested") {
    return { state: to === "cancelled" ? "approved" : "refused", reason };
  }
  if (to === "cancelled") {
    return {
      state: "approved",
      requestedBy: actor === "customer" ? "customer" : "admin",
      reason,
    };
  }
  return null;
}

function eventFor(
  from: OrderStatus,
  to: OrderStatus,
  reason: string | null,
  failureReason: DeliveryFailureReason | null,
): { type: string; message: string } {
  const tail = reason ? ` ${reason}` : "";

  if (to === "delivery_failed") {
    return {
      type: "delivery_failed",
      message: `Delivery attempt failed: ${failureReason}.${tail}`,
    };
  }
  if (to === "cancellation_requested") {
    return {
      type: "cancellation_requested",
      message: `Cancellation requested.${tail}`,
    };
  }
  if (to === "cancelled") {
    return { type: "order_cancelled", message: `Order cancelled.${tail}` };
  }
  if (to === "returned") {
    return { type: "order_returned", message: `Parcel returned to us.${tail}` };
  }
  if (from === "cancellation_requested") {
    return {
      type: "cancellation_refused",
      message: `Cancellation refused, order continues as ${to}.${tail}`,
    };
  }
  return { type: "status_changed", message: `Order marked ${to}.${tail}` };
}
