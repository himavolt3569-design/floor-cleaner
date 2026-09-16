import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { requireDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { OrderTransitionError, planTransition } from "./order-transition";
import type { TransitionActor } from "./order-status";
import type { DeliveryFailureReason, OrderStatus } from "@/types";

/**
 * The only writer of `orderStatus` in this application.
 *
 * Reads the order, asks the pure planner what the move means, then performs
 * every consequence in one transaction: the status itself, returning stock to
 * the shelf, the payment status when a paid order is cancelled, and the audit
 * event. Because admin, customer and courier paths all come through here, none
 * of them can skip the restock or the audit trail.
 */

export interface ApplyTransitionInput {
  orderId: string;
  to: OrderStatus;
  actor: TransitionActor;
  actorLabel: string;
  reason?: string;
  failureReason?: DeliveryFailureReason;
}

export async function applyOrderTransition(
  input: ApplyTransitionInput,
): Promise<void> {
  const db = requireDb();
  const orderRef = db.collection(COLLECTIONS.orders).doc(input.orderId);

  // A partner ledger entry against this order means the money is already
  // reconciled; the planner refuses to restock in that case.
  const ledgerQuery = db
    .collection("partnerEntries")
    .where("orderId", "==", input.orderId)
    .limit(1);

  await db.runTransaction(async (tx) => {
    /* ------------------------------------------------- reads before writes */
    const snap = await tx.get(orderRef);
    if (!snap.exists) {
      throw new OrderTransitionError("Order not found.", "illegal");
    }
    const ledger = await tx.get(ledgerQuery);

    const data = snap.data() ?? {};

    const plan = planTransition(
      {
        orderStatus: (data.orderStatus ?? "pending") as OrderStatus,
        paymentStatus: data.paymentStatus ?? "unpaid",
        stockRestoredAt: data.stockRestoredAt ? String(data.stockRestoredAt) : null,
        deliveryAttempts: Number(data.deliveryAttempts ?? 0),
        items: (data.items ?? []).map(
          (i: { productId: string; variantId: string; quantity: number }) => ({
            productId: i.productId,
            variantId: i.variantId,
            quantity: Number(i.quantity ?? 0),
          }),
        ),
        hasPartnerLedger: !ledger.empty,
      },
      {
        to: input.to,
        actor: input.actor,
        actorLabel: input.actorLabel,
        reason: input.reason,
        failureReason: input.failureReason,
      },
    );

    /* ------------------------------------------------------------- writes */
    const update: Record<string, unknown> = {
      orderStatus: plan.status,
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (plan.markStockRestored) update.stockRestoredAt = new Date().toISOString();
    if (plan.paymentStatus) update.paymentStatus = plan.paymentStatus;
    if (plan.deliveryAttempts !== null) update.deliveryAttempts = plan.deliveryAttempts;
    if (plan.failure) {
      update.lastFailureReason = plan.failure.reason;
      update.lastFailureNote = plan.failure.note;
    }
    if (plan.cancellation) {
      update.cancellation = {
        state: plan.cancellation.state ?? "none",
        requestedBy: plan.cancellation.requestedBy ?? null,
        reason: plan.cancellation.reason ?? null,
        decidedBy: input.actor === "admin" ? input.actorLabel : null,
        decidedAt: input.actor === "admin" ? new Date().toISOString() : null,
      };
    }

    tx.update(orderRef, update);

    for (const item of plan.restockItems) {
      const variantRef = db
        .collection(COLLECTIONS.products)
        .doc(item.productId)
        .collection(COLLECTIONS.variants)
        .doc(item.variantId);

      tx.update(variantRef, {
        stock: FieldValue.increment(item.quantity),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    tx.set(db.collection(COLLECTIONS.orderEvents).doc(), {
      orderId: input.orderId,
      orderNumber: data.orderNumber ?? null,
      type: plan.event.type,
      message: plan.event.message,
      actor: input.actorLabel,
      createdAt: FieldValue.serverTimestamp(),
    });
  });
}
